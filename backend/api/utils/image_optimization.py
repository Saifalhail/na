"""
Image optimization utilities for mobile applications.
"""

import asyncio
import io
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from PIL import Image

# Thread pool for async image processing
_image_optimization_executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="img_opt")


def optimize_image_for_mobile(image_data, max_width=800, max_height=800, quality=85):
    """
    Optimize image for mobile display and bandwidth (synchronous version).

    Args:
        image_data: Image file data (bytes)
        max_width: Maximum width in pixels
        max_height: Maximum height in pixels
        quality: JPEG quality (1-100)

    Returns:
        Optimized image data (bytes)
    """
    return _optimize_image_sync(image_data, max_width, max_height, quality)


async def optimize_image_for_mobile_async(image_data, max_width=800, max_height=800, quality=85):
    """
    Optimize image for mobile display and bandwidth asynchronously.

    Args:
        image_data: Image file data (bytes)
        max_width: Maximum width in pixels
        max_height: Maximum height in pixels
        quality: JPEG quality (1-100)

    Returns:
        Optimized image data (bytes)
    """
    try:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _image_optimization_executor,
            _optimize_image_sync,
            image_data,
            max_width,
            max_height,
            quality
        )
    except Exception as e:
        raise RuntimeError(f"Async image optimization failed: {e}")


def _optimize_image_sync(image_data, max_width=800, max_height=800, quality=85):
    """
    Synchronous image optimization implementation.

    Args:
        image_data: Image file data (bytes)
        max_width: Maximum width in pixels
        max_height: Maximum height in pixels
        quality: JPEG quality (1-100)

    Returns:
        Optimized image data (bytes)
    """
    # Open the image
    img = Image.open(io.BytesIO(image_data))

    # Convert RGBA to RGB if necessary
    if img.mode == "RGBA":
        # Create a white background
        background = Image.new("RGB", img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])  # 3 is the alpha channel
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Calculate new dimensions maintaining aspect ratio
    width, height = img.size
    if width > max_width or height > max_height:
        ratio = min(max_width / width, max_height / height)
        new_width = int(width * ratio)
        new_height = int(height * ratio)
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

    # Save optimized image to bytes
    output = io.BytesIO()
    img.save(output, format="JPEG", quality=quality, optimize=True)
    output.seek(0)

    return output.getvalue()
