"""
Visual Similarity Caching System

This module provides intelligent caching based on visual similarity of food images,
rather than just exact hash matches. This allows reusing analysis results for
visually similar meals.
"""

import asyncio
import hashlib
import io
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from django.conf import settings
from django.core.cache import cache
from PIL import Image, ImageFilter, ImageStat

logger = logging.getLogger(__name__)

# Thread pool for async image processing
_image_processing_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="image_proc")


@dataclass
class ImageFeatures:
    """Represents extracted visual features from a food image."""

    image_hash: str
    dominant_colors: List[Tuple[int, int, int]]  # RGB tuples
    color_histogram: List[float]  # Color distribution
    brightness: float
    contrast: float
    texture_features: List[float]  # Simple texture descriptors
    aspect_ratio: float
    size_category: str  # small, medium, large
    created_at: float


@dataclass
class CachedAnalysis:
    """Represents a cached analysis result with visual features."""

    features: ImageFeatures
    analysis_result: Dict[str, Any]
    context_hash: str
    access_count: int
    last_accessed: float
    similarity_threshold: float = 0.75


class VisualSimilarityCache:
    """
    Intelligent caching system based on visual similarity of food images.

    Features:
    - Visual feature extraction (colors, texture, brightness)
    - Similarity scoring between images
    - Context-aware caching (meal type, cuisine, etc.)
    - Cache eviction based on LRU and similarity clusters
    - Performance monitoring and statistics
    """

    def __init__(self):
        """Initialize the visual similarity cache."""
        self.cache_prefix = "visual_cache_"
        self.features_prefix = "visual_features_"
        self.index_key = "visual_cache_index"

        # Configuration
        self.max_cache_entries = getattr(settings, "VISUAL_CACHE_MAX_ENTRIES", 1000)
        self.default_ttl = getattr(settings, "VISUAL_CACHE_TTL", 86400 * 7)  # 7 days
        self.similarity_threshold = getattr(
            settings, "VISUAL_SIMILARITY_THRESHOLD", 0.75
        )
        self.min_confidence_to_cache = getattr(settings, "MIN_CONFIDENCE_TO_CACHE", 70)

        # Performance tracking
        self.stats = {
            "cache_hits": 0,
            "cache_misses": 0,
            "similarity_matches": 0,
            "features_extracted": 0,
        }

    def extract_visual_features(self, image_data: bytes) -> Optional[ImageFeatures]:
        """
        Extract visual features from a food image (synchronous version).

        Args:
            image_data: Raw image bytes

        Returns:
            ImageFeatures object or None if extraction fails
        """
        return self._extract_features_sync(image_data)
    
    async def extract_visual_features_async(self, image_data: bytes) -> Optional[ImageFeatures]:
        """
        Extract visual features from a food image asynchronously.

        Args:
            image_data: Raw image bytes

        Returns:
            ImageFeatures object or None if extraction fails
        """
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(_image_processing_executor, self._extract_features_sync, image_data)
        except Exception as e:
            logger.error(f"Async visual feature extraction failed: {e}")
            return None
    
    def _extract_features_sync(self, image_data: bytes) -> Optional[ImageFeatures]:
        """
        Synchronous feature extraction implementation.

        Args:
            image_data: Raw image bytes

        Returns:
            ImageFeatures object or None if extraction fails
        """
        try:
            # Create PIL image
            image = Image.open(io.BytesIO(image_data))

            # Convert to RGB if necessary
            if image.mode != "RGB":
                image = image.convert("RGB")

            # Generate image hash
            image_hash = hashlib.md5(image_data).hexdigest()

            # Extract dominant colors
            dominant_colors = self._extract_dominant_colors(image)

            # Calculate color histogram
            color_histogram = self._calculate_color_histogram(image)

            # Calculate brightness and contrast
            brightness, contrast = self._calculate_brightness_contrast(image)

            # Extract simple texture features
            texture_features = self._extract_texture_features(image)

            # Calculate aspect ratio
            width, height = image.size
            aspect_ratio = width / height if height > 0 else 1.0

            # Determine size category
            total_pixels = width * height
            if total_pixels < 100000:  # < 316x316
                size_category = "small"
            elif total_pixels < 400000:  # < 632x632
                size_category = "medium"
            else:
                size_category = "large"

            features = ImageFeatures(
                image_hash=image_hash,
                dominant_colors=dominant_colors,
                color_histogram=color_histogram,
                brightness=brightness,
                contrast=contrast,
                texture_features=texture_features,
                aspect_ratio=aspect_ratio,
                size_category=size_category,
                created_at=datetime.now().timestamp(),
            )

            self.stats["features_extracted"] += 1
            logger.debug(f"Extracted visual features for image {image_hash[:8]}")

            return features

        except Exception as e:
            logger.error(f"Failed to extract visual features: {e}")
            return None

    def _extract_dominant_colors(
        self, image: Image.Image, num_colors: int = 5
    ) -> List[Tuple[int, int, int]]:
        """Extract dominant colors using simple color quantization."""
        try:
            # Resize image for faster processing
            small_image = image.resize((100, 100), Image.Resampling.LANCZOS)

            # Convert to palette mode to get dominant colors
            quantized = small_image.quantize(colors=num_colors)
            palette = quantized.getpalette()

            # Extract RGB tuples
            colors = []
            for i in range(num_colors):
                r = palette[i * 3]
                g = palette[i * 3 + 1]
                b = palette[i * 3 + 2]
                colors.append((r, g, b))

            return colors[:num_colors]

        except Exception as e:
            logger.warning(f"Failed to extract dominant colors: {e}")
            # Return default colors
            return [(128, 128, 128)] * num_colors

    def _calculate_color_histogram(
        self, image: Image.Image, bins: int = 8
    ) -> List[float]:
        """Calculate simplified color histogram."""
        try:
            # Resize for faster processing
            small_image = image.resize((64, 64), Image.Resampling.LANCZOS)

            # Calculate histogram for each channel
            hist_r = small_image.histogram()[0:256]
            hist_g = small_image.histogram()[256:512]
            hist_b = small_image.histogram()[512:768]

            # Reduce to specified number of bins
            def reduce_bins(hist, target_bins):
                bin_size = 256 // target_bins
                reduced = []
                for i in range(target_bins):
                    start = i * bin_size
                    end = start + bin_size
                    reduced.append(sum(hist[start:end]))
                return reduced

            reduced_r = reduce_bins(hist_r, bins)
            reduced_g = reduce_bins(hist_g, bins)
            reduced_b = reduce_bins(hist_b, bins)

            # Normalize and combine
            total_pixels = 64 * 64
            normalized = []
            for i in range(bins):
                r_norm = reduced_r[i] / total_pixels
                g_norm = reduced_g[i] / total_pixels
                b_norm = reduced_b[i] / total_pixels
                normalized.extend([r_norm, g_norm, b_norm])

            return normalized

        except Exception as e:
            logger.warning(f"Failed to calculate color histogram: {e}")
            return [0.0] * (bins * 3)

    def _calculate_brightness_contrast(self, image: Image.Image) -> Tuple[float, float]:
        """Calculate image brightness and contrast."""
        try:
            # Convert to grayscale for easier calculation
            gray_image = image.convert("L")

            # Calculate statistics
            stat = ImageStat.Stat(gray_image)

            # Brightness is the mean
            brightness = stat.mean[0] / 255.0  # Normalize to 0-1

            # Contrast is related to standard deviation
            contrast = stat.stddev[0] / 128.0  # Normalize roughly to 0-2

            return brightness, min(contrast, 2.0)  # Cap contrast at 2.0

        except Exception as e:
            logger.warning(f"Failed to calculate brightness/contrast: {e}")
            return 0.5, 0.5

    def _extract_texture_features(self, image: Image.Image) -> List[float]:
        """Extract simple texture features using edge detection and filters."""
        try:
            # Convert to grayscale
            gray_image = image.convert("L").resize((64, 64), Image.Resampling.LANCZOS)

            # Apply different filters and measure variance
            features = []

            # Edge detection (approximate)
            edges = gray_image.filter(ImageFilter.FIND_EDGES)
            edge_stat = ImageStat.Stat(edges)
            features.append(edge_stat.mean[0] / 255.0)

            # Emboss filter
            emboss = gray_image.filter(ImageFilter.EMBOSS)
            emboss_stat = ImageStat.Stat(emboss)
            features.append(emboss_stat.stddev[0] / 128.0)

            # Blur and measure difference
            blurred = gray_image.filter(ImageFilter.GaussianBlur(radius=2))
            original_stat = ImageStat.Stat(gray_image)
            blur_stat = ImageStat.Stat(blurred)

            # Difference in variance indicates texture complexity
            texture_complexity = (
                abs(original_stat.stddev[0] - blur_stat.stddev[0]) / 128.0
            )
            features.append(texture_complexity)

            return features

        except Exception as e:
            logger.warning(f"Failed to extract texture features: {e}")
            return [0.0, 0.0, 0.0]

    def calculate_similarity(
        self, features1: ImageFeatures, features2: ImageFeatures
    ) -> float:
        """
        Calculate similarity score between two images based on their features.

        Args:
            features1: Features from first image
            features2: Features from second image

        Returns:
            Similarity score between 0.0 and 1.0
        """
        try:
            similarities = []

            # Color similarity based on dominant colors
            color_sim = self._color_similarity(
                features1.dominant_colors, features2.dominant_colors
            )
            similarities.append(("color", color_sim, 0.3))

            # Histogram similarity
            hist_sim = self._histogram_similarity(
                features1.color_histogram, features2.color_histogram
            )
            similarities.append(("histogram", hist_sim, 0.25))

            # Brightness similarity
            brightness_diff = abs(features1.brightness - features2.brightness)
            brightness_sim = 1.0 - min(brightness_diff, 1.0)
            similarities.append(("brightness", brightness_sim, 0.15))

            # Contrast similarity
            contrast_diff = abs(features1.contrast - features2.contrast)
            contrast_sim = 1.0 - min(contrast_diff / 2.0, 1.0)
            similarities.append(("contrast", contrast_sim, 0.1))

            # Texture similarity
            texture_sim = self._texture_similarity(
                features1.texture_features, features2.texture_features
            )
            similarities.append(("texture", texture_sim, 0.15))

            # Aspect ratio similarity
            aspect_diff = abs(features1.aspect_ratio - features2.aspect_ratio)
            aspect_sim = 1.0 - min(aspect_diff / 2.0, 1.0)
            similarities.append(("aspect", aspect_sim, 0.05))

            # Weighted average
            weighted_sum = sum(sim * weight for _, sim, weight in similarities)
            total_weight = sum(weight for _, _, weight in similarities)

            final_similarity = weighted_sum / total_weight if total_weight > 0 else 0.0

            logger.debug(
                f"Similarity calculation: {dict((name, f'{sim:.3f}') for name, sim, _ in similarities)} -> {final_similarity:.3f}"
            )

            return final_similarity

        except Exception as e:
            logger.error(f"Failed to calculate similarity: {e}")
            return 0.0

    def _color_similarity(
        self, colors1: List[Tuple[int, int, int]], colors2: List[Tuple[int, int, int]]
    ) -> float:
        """Calculate similarity between dominant color palettes."""
        if not colors1 or not colors2:
            return 0.0

        # Calculate average distance between color sets
        total_distance = 0.0
        comparisons = 0

        for c1 in colors1:
            min_distance = float("inf")
            for c2 in colors2:
                # Euclidean distance in RGB space
                distance = (
                    (c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2
                ) ** 0.5
                min_distance = min(min_distance, distance)

            total_distance += min_distance
            comparisons += 1

        if comparisons == 0:
            return 0.0

        # Normalize distance (max possible distance is ~441 for RGB)
        avg_distance = total_distance / comparisons
        similarity = 1.0 - min(avg_distance / 441.0, 1.0)

        return similarity

    def _histogram_similarity(self, hist1: List[float], hist2: List[float]) -> float:
        """Calculate similarity between color histograms."""
        if len(hist1) != len(hist2):
            return 0.0

        # Use chi-squared distance (lower is more similar)
        chi_squared = 0.0
        for i in range(len(hist1)):
            sum_val = hist1[i] + hist2[i]
            if sum_val > 0:
                chi_squared += ((hist1[i] - hist2[i]) ** 2) / sum_val

        # Convert to similarity (0-1 range)
        similarity = 1.0 / (1.0 + chi_squared)
        return similarity

    def _texture_similarity(
        self, texture1: List[float], texture2: List[float]
    ) -> float:
        """Calculate similarity between texture features."""
        if len(texture1) != len(texture2):
            return 0.0

        # Calculate normalized euclidean distance
        total_diff = sum((t1 - t2) ** 2 for t1, t2 in zip(texture1, texture2))
        distance = (total_diff / len(texture1)) ** 0.5

        # Convert to similarity
        similarity = 1.0 / (1.0 + distance)
        return similarity

    def store_analysis(
        self,
        image_data: bytes,
        analysis_result: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Store analysis result with visual features (synchronous version).

        Args:
            image_data: Raw image bytes
            analysis_result: Analysis result to cache
            context: Context information (meal type, cuisine, etc.)

        Returns:
            True if stored successfully, False otherwise
        """
        return self._store_analysis_sync(image_data, analysis_result, context)
    
    async def store_analysis_async(
        self,
        image_data: bytes,
        analysis_result: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Store analysis result with visual features asynchronously.

        Args:
            image_data: Raw image bytes
            analysis_result: Analysis result to cache
            context: Context information (meal type, cuisine, etc.)

        Returns:
            True if stored successfully, False otherwise
        """
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                _image_processing_executor, 
                self._store_analysis_sync, 
                image_data, 
                analysis_result, 
                context
            )
        except Exception as e:
            logger.error(f"Async store analysis failed: {e}")
            return False
    
    def _store_analysis_sync(
        self,
        image_data: bytes,
        analysis_result: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Store analysis result with visual features for future similarity matching.

        Args:
            image_data: Raw image bytes
            analysis_result: Analysis result to cache
            context: Context information (meal type, cuisine, etc.)

        Returns:
            True if stored successfully, False otherwise
        """
        try:
            # Only cache high-confidence results
            confidence = (
                analysis_result.get("data", {}).get("confidence", {}).get("overall", 0)
            )
            if confidence < self.min_confidence_to_cache:
                logger.debug(
                    f"Skipping cache storage - confidence too low: {confidence}"
                )
                return False

            # Extract visual features
            features = self.extract_visual_features(image_data)
            if not features:
                return False

            # Create context hash
            context_hash = hashlib.md5(
                json.dumps(context or {}, sort_keys=True).encode()
            ).hexdigest()[:8]

            # Create cached analysis
            cached_analysis = CachedAnalysis(
                features=features,
                analysis_result=analysis_result,
                context_hash=context_hash,
                access_count=1,
                last_accessed=datetime.now().timestamp(),
            )

            # Store in cache
            cache_key = f"{self.cache_prefix}{features.image_hash}"
            cache.set(cache_key, asdict(cached_analysis), timeout=self.default_ttl)

            # Update index
            self._update_cache_index(features.image_hash, features)

            logger.info(f"Stored visual cache entry: {features.image_hash[:8]}")
            return True

        except Exception as e:
            logger.error(f"Failed to store visual cache entry: {e}")
            return False

    def find_similar_analysis(
        self,
        image_data: bytes,
        context: Optional[Dict[str, Any]] = None,
        similarity_threshold: Optional[float] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Find cached analysis for visually similar image.

        Args:
            image_data: Raw image bytes to find matches for
            context: Context information for matching
            similarity_threshold: Custom similarity threshold (overrides default)

        Returns:
            Cached analysis result if similar image found, None otherwise
        """
        try:
            # Extract features for the query image
            query_features = self.extract_visual_features(image_data)
            if not query_features:
                self.stats["cache_misses"] += 1
                return None

            # Check for exact match first
            exact_cache_key = f"{self.cache_prefix}{query_features.image_hash}"
            exact_match = cache.get(exact_cache_key)
            if exact_match:
                # Update access statistics
                exact_match["access_count"] += 1
                exact_match["last_accessed"] = datetime.now().timestamp()
                cache.set(exact_cache_key, exact_match, timeout=self.default_ttl)

                self.stats["cache_hits"] += 1
                logger.info(f"Exact visual cache hit: {query_features.image_hash[:8]}")
                return exact_match["analysis_result"]

            # Look for similar matches
            threshold = similarity_threshold or self.similarity_threshold
            context_hash = hashlib.md5(
                json.dumps(context or {}, sort_keys=True).encode()
            ).hexdigest()[:8]

            best_match = None
            best_similarity = 0.0

            # Get cache index
            cache_index = cache.get(self.index_key, {})

            # Compare with stored features
            for stored_hash, stored_features_dict in cache_index.items():
                try:
                    stored_features = ImageFeatures(**stored_features_dict)

                    # Calculate similarity
                    similarity = self.calculate_similarity(
                        query_features, stored_features
                    )

                    if similarity >= threshold and similarity > best_similarity:
                        # Get the cached analysis
                        stored_cache_key = f"{self.cache_prefix}{stored_hash}"
                        cached_analysis = cache.get(stored_cache_key)

                        if cached_analysis:
                            # Context should match (or be flexible)
                            if (
                                not context
                                or cached_analysis["context_hash"] == context_hash
                            ):
                                best_match = cached_analysis
                                best_similarity = similarity

                except Exception as e:
                    logger.warning(
                        f"Error processing cached features {stored_hash}: {e}"
                    )
                    continue

            if best_match:
                # Update access statistics
                best_match["access_count"] += 1
                best_match["last_accessed"] = datetime.now().timestamp()

                # Store updated statistics
                match_key = f"{self.cache_prefix}{best_match['features']['image_hash']}"
                cache.set(match_key, best_match, timeout=self.default_ttl)

                self.stats["cache_hits"] += 1
                self.stats["similarity_matches"] += 1

                logger.info(
                    f"Visual similarity cache hit: {best_similarity:.3f} similarity"
                )
                return best_match["analysis_result"]

            self.stats["cache_misses"] += 1
            return None

        except Exception as e:
            logger.error(f"Error finding similar analysis: {e}")
            self.stats["cache_misses"] += 1
            return None

    def _update_cache_index(self, image_hash: str, features: ImageFeatures):
        """Update the cache index with new features."""
        try:
            cache_index = cache.get(self.index_key, {})
            cache_index[image_hash] = asdict(features)

            # Limit index size
            if len(cache_index) > self.max_cache_entries:
                # Remove oldest entries
                sorted_entries = sorted(
                    cache_index.items(), key=lambda x: x[1]["created_at"]
                )
                # Keep only the newest entries
                cache_index = dict(sorted_entries[-self.max_cache_entries :])

            cache.set(self.index_key, cache_index, timeout=self.default_ttl * 2)

        except Exception as e:
            logger.error(f"Failed to update cache index: {e}")

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics."""
        total_requests = self.stats["cache_hits"] + self.stats["cache_misses"]
        hit_rate = (
            (self.stats["cache_hits"] / total_requests) if total_requests > 0 else 0.0
        )

        cache_index = cache.get(self.index_key, {})

        return {
            "hit_rate": hit_rate,
            "total_requests": total_requests,
            "cache_hits": self.stats["cache_hits"],
            "cache_misses": self.stats["cache_misses"],
            "similarity_matches": self.stats["similarity_matches"],
            "features_extracted": self.stats["features_extracted"],
            "cached_entries": len(cache_index),
            "max_entries": self.max_cache_entries,
            "similarity_threshold": self.similarity_threshold,
        }

    def clear_cache(self) -> bool:
        """Clear all visual similarity cache entries."""
        try:
            # Get all cache keys
            cache_index = cache.get(self.index_key, {})

            # Delete all cached analyses
            for image_hash in cache_index.keys():
                cache_key = f"{self.cache_prefix}{image_hash}"
                cache.delete(cache_key)

            # Delete index
            cache.delete(self.index_key)

            # Reset statistics
            self.stats = {
                "cache_hits": 0,
                "cache_misses": 0,
                "similarity_matches": 0,
                "features_extracted": 0,
            }

            logger.info("Visual similarity cache cleared")
            return True

        except Exception as e:
            logger.error(f"Failed to clear visual cache: {e}")
            return False


# Global instance
visual_cache = VisualSimilarityCache()
