"""
File upload security utilities for the Nutrition AI API.
"""

import hashlib
import logging
import os
import uuid
from datetime import datetime

import magic
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image

logger = logging.getLogger(__name__)


class SecureFileHandler:
    """
    Secure file handling with validation and sanitization.
    """

    # Maximum file sizes by type
    MAX_SIZES = {
        "image": 10 * 1024 * 1024,  # 10MB
        "document": 5 * 1024 * 1024,  # 5MB
    }

    # Allowed MIME types
    ALLOWED_TYPES = {
        "image": {
            "image/jpeg": [".jpg", ".jpeg"],
            "image/png": [".png"],
            "image/webp": [".webp"],
            "image/heif": [".heic", ".heif"],
        },
        "document": {
            "application/pdf": [".pdf"],
        },
    }

    @classmethod
    def validate_and_save_image(cls, uploaded_file, user, purpose="meal"):
        """
        Validate and securely save an uploaded image.

        Args:
            uploaded_file: Django UploadedFile instance
            user: User instance
            purpose: Purpose of upload (meal, avatar, etc.)

        Returns:
            dict: File information including path and metadata

        Raises:
            ValidationError: If file validation fails
        """
        # Validate file
        cls._validate_file(uploaded_file, "image")

        # Generate secure filename
        file_ext = cls._get_file_extension(uploaded_file.name)
        file_hash = cls._generate_file_hash(uploaded_file)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Create unique filename
        filename = f"{purpose}_{user.id}_{timestamp}_{file_hash[:8]}{file_ext}"

        # Determine storage path
        storage_path = os.path.join(
            "uploads", purpose, str(user.id), datetime.now().strftime("%Y/%m"), filename
        )

        # Process and save image
        processed_file = cls._process_image(uploaded_file)

        # Save file
        saved_path = default_storage.save(storage_path, processed_file)

        # Get file metadata
        file_info = {
            "path": saved_path,
            "size": uploaded_file.size,
            "mime_type": cls._get_mime_type(uploaded_file),
            "hash": file_hash,
            "original_name": uploaded_file.name,
            "upload_time": datetime.now(),
        }

        # Log file upload
        logger.info(
            f"File uploaded: {filename}",
            extra={
                "user": user.email,
                "file_size": uploaded_file.size,
                "file_type": file_info["mime_type"],
                "purpose": purpose,
            },
        )

        return file_info

    @classmethod
    def _validate_file(cls, uploaded_file, file_category):
        """
        Validate uploaded file.

        Args:
            uploaded_file: Django UploadedFile instance
            file_category: Category of file (image, document)

        Raises:
            ValidationError: If validation fails
        """
        from django.core.exceptions import ValidationError

        # Check file size
        max_size = cls.MAX_SIZES.get(file_category, 1024 * 1024)
        if uploaded_file.size > max_size:
            raise ValidationError(
                f"File size ({uploaded_file.size} bytes) exceeds maximum "
                f"allowed size ({max_size} bytes)"
            )

        # Check MIME type
        mime_type = cls._get_mime_type(uploaded_file)
        allowed_types = cls.ALLOWED_TYPES.get(file_category, {})

        if mime_type not in allowed_types:
            raise ValidationError(
                f"File type {mime_type} is not allowed. "
                f'Allowed types: {", ".join(allowed_types.keys())}'
            )

        # Check file extension
        file_ext = cls._get_file_extension(uploaded_file.name)
        allowed_extensions = allowed_types[mime_type]

        if file_ext.lower() not in allowed_extensions:
            raise ValidationError(
                f"File extension {file_ext} does not match file type {mime_type}"
            )

        # Additional validation for images
        if file_category == "image":
            cls._validate_image(uploaded_file)

        # Malware scanning for all files
        is_clean, scan_results = cls.scan_for_malware(uploaded_file)

        # Log scan results for audit (import here to avoid circular imports)
        try:
            from api.models import MalwareScanLog

            # Generate file hash for logging
            file_hash = cls._generate_file_hash(uploaded_file)

            MalwareScanLog.objects.create(
                user=getattr(uploaded_file, "user", None),  # User might be set by view
                file_hash=file_hash,
                file_name=uploaded_file.name or "unknown",
                file_size=uploaded_file.size,
                mime_type=mime_type,
                is_clean=is_clean,
                scan_results=scan_results.get("scan_results", {}),
                threats_detected=scan_results.get("threats", []),
                scanners_used=list(scan_results.get("scan_results", {}).keys()),
                total_scan_time=sum(
                    result.get("scan_time", 0)
                    for result in scan_results.get("scan_results", {}).values()
                ),
            )
        except Exception as e:
            logger.error(f"Failed to log malware scan results: {e}")

        if not is_clean:
            threats_summary = ", ".join(
                [
                    threat.get("threat", "Unknown threat")
                    for threat in scan_results.get("threats", [])
                ]
            )
            raise ValidationError(
                f"File failed malware scan. Threats detected: {threats_summary}"
            )

    @classmethod
    def _validate_image(cls, uploaded_file):
        """
        Additional validation for image files.

        Args:
            uploaded_file: Django UploadedFile instance

        Raises:
            ValidationError: If image validation fails
        """
        from django.core.exceptions import ValidationError

        try:
            # Open image with PIL
            uploaded_file.seek(0)
            img = Image.open(uploaded_file)

            # Verify it's a valid image
            img.verify()

            # Reopen for further checks (verify() closes the file)
            uploaded_file.seek(0)
            img = Image.open(uploaded_file)

            # Check dimensions
            max_dimension = 4096
            if img.width > max_dimension or img.height > max_dimension:
                raise ValidationError(
                    f"Image dimensions ({img.width}x{img.height}) exceed "
                    f"maximum allowed ({max_dimension}x{max_dimension})"
                )

            # Check for minimum dimensions
            min_dimension = 100
            if img.width < min_dimension or img.height < min_dimension:
                raise ValidationError(
                    f"Image dimensions ({img.width}x{img.height}) are below "
                    f"minimum required ({min_dimension}x{min_dimension})"
                )

            uploaded_file.seek(0)

        except Exception as e:
            raise ValidationError(f"Invalid image file: {str(e)}")

    @classmethod
    def _process_image(cls, uploaded_file):
        """
        Process image for security and optimization.

        Args:
            uploaded_file: Django UploadedFile instance

        Returns:
            ContentFile: Processed image file
        """
        try:
            # Open image
            uploaded_file.seek(0)
            img = Image.open(uploaded_file)

            # Convert to RGB if necessary (removes alpha channel)
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")

            # Remove EXIF data
            data = list(img.getdata())
            image_without_exif = Image.new(img.mode, img.size)
            image_without_exif.putdata(data)

            # Optimize image
            from io import BytesIO

            output = BytesIO()

            # Save with optimization
            image_without_exif.save(
                output,
                format="JPEG" if img.format == "JPEG" else "PNG",
                quality=85,
                optimize=True,
            )

            output.seek(0)
            return ContentFile(output.read())

        except Exception as e:
            logger.error(f"Error processing image: {str(e)}")
            # Return original file if processing fails
            uploaded_file.seek(0)
            return ContentFile(uploaded_file.read())

    @classmethod
    def _get_mime_type(cls, uploaded_file):
        """
        Get MIME type of uploaded file using python-magic.

        Args:
            uploaded_file: Django UploadedFile instance

        Returns:
            str: MIME type
        """
        uploaded_file.seek(0)
        file_content = uploaded_file.read(1024)
        uploaded_file.seek(0)

        mime = magic.from_buffer(file_content, mime=True)
        return mime

    @classmethod
    def _get_file_extension(cls, filename):
        """
        Get file extension from filename.

        Args:
            filename: Original filename

        Returns:
            str: File extension with dot (e.g., '.jpg')
        """
        return os.path.splitext(filename)[1].lower()

    @classmethod
    def _generate_file_hash(cls, uploaded_file):
        """
        Generate SHA-256 hash of file content.

        Args:
            uploaded_file: Django UploadedFile instance

        Returns:
            str: Hex digest of file hash
        """
        uploaded_file.seek(0)
        file_hash = hashlib.sha256()

        for chunk in uploaded_file.chunks():
            file_hash.update(chunk)

        uploaded_file.seek(0)
        return file_hash.hexdigest()

    @classmethod
    def delete_file(cls, file_path):
        """
        Securely delete a file.

        Args:
            file_path: Path to file in storage

        Returns:
            bool: True if deleted successfully
        """
        try:
            if default_storage.exists(file_path):
                default_storage.delete(file_path)
                logger.info(f"File deleted: {file_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {str(e)}")
            return False

    @classmethod
    def scan_for_malware(cls, uploaded_file):
        """
        Scan file for malware using integrated scanning services.

        Uses ClamAV and VirusTotal for comprehensive malware detection.

        Args:
            uploaded_file: Django UploadedFile instance

        Returns:
            tuple: (is_clean: bool, scan_results: dict)
        """
        from api.services.malware_scanning_service import \
            malware_scanning_service

        try:
            # Perform malware scan
            scan_results = malware_scanning_service.scan_file(uploaded_file)

            # Determine if file is clean
            is_clean, threats = malware_scanning_service.is_file_clean(scan_results)

            # Log scan results
            if is_clean:
                logger.info(
                    f"File passed malware scan",
                    extra={
                        "scanners": list(scan_results.keys()),
                        "total_scan_time": sum(
                            r.scan_time for r in scan_results.values()
                        ),
                    },
                )
            else:
                logger.warning(
                    f"File failed malware scan - threats detected",
                    extra={"threats": threats, "scanners": list(scan_results.keys())},
                )

            return is_clean, {
                "scan_results": {k: v.to_dict() for k, v in scan_results.items()},
                "threats": threats,
                "is_clean": is_clean,
            }

        except Exception as e:
            logger.error(f"Error during malware scanning: {e}")
            # Fail safely - if scanning fails, allow file but log the error
            return True, {
                "scan_results": {},
                "threats": [],
                "error": str(e),
                "is_clean": True,  # Fail open for availability
            }
