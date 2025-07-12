"""
Ingredient-based Intelligent Caching System

This module provides intelligent caching for nutrition calculations based on
ingredient combinations, allowing for efficient reuse of nutrition data
for similar ingredient sets.
"""

import hashlib
import logging
import json
from typing import Dict, Any, List, Optional, Tuple, Set
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from django.core.cache import cache
from django.conf import settings
from collections import defaultdict
import re

logger = logging.getLogger(__name__)


@dataclass
class IngredientKey:
    """Represents a normalized ingredient for caching."""
    name: str
    base_name: str  # Normalized name without preparation details
    category: str  # food category (protein, carb, vegetable, etc.)
    unit: str  # normalized unit (g, ml, piece)
    unit_type: str  # weight, volume, count


@dataclass
class NutritionData:
    """Represents nutritional information per unit."""
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float
    fiber_per_100g: float
    sugar_per_100g: float
    sodium_per_100g: float


@dataclass
class CachedIngredient:
    """Represents a cached ingredient with its nutrition data."""
    key: IngredientKey
    nutrition: NutritionData
    source: str  # 'ai', 'database', 'user'
    confidence: float
    created_at: float
    access_count: int
    last_accessed: float


@dataclass
class IngredientCombination:
    """Represents a combination of ingredients for caching."""
    combination_hash: str
    ingredients: List[str]  # List of normalized ingredient names
    nutrition_per_serving: Dict[str, float]
    serving_size: int
    confidence: float
    created_at: float
    access_count: int


class IngredientCache:
    """
    Intelligent caching system for ingredient-based nutrition calculations.
    
    Features:
    - Ingredient normalization and categorization
    - Fuzzy matching for similar ingredients
    - Combination-based caching for recipe optimization
    - Nutritional scaling and unit conversion
    - Performance monitoring and statistics
    """
    
    def __init__(self):
        """Initialize the ingredient cache."""
        self.cache_prefix = "ingredient_cache_"
        self.combination_prefix = "combination_cache_"
        self.index_key = "ingredient_index"
        self.combination_index_key = "combination_index"
        
        # Configuration
        self.max_cache_entries = getattr(settings, 'INGREDIENT_CACHE_MAX_ENTRIES', 2000)
        self.max_combinations = getattr(settings, 'INGREDIENT_COMBINATION_MAX_ENTRIES', 500)
        self.default_ttl = getattr(settings, 'INGREDIENT_CACHE_TTL', 86400 * 30)  # 30 days
        self.similarity_threshold = getattr(settings, 'INGREDIENT_SIMILARITY_THRESHOLD', 0.8)
        self.min_confidence_to_cache = getattr(settings, 'MIN_INGREDIENT_CONFIDENCE_TO_CACHE', 70)
        
        # Ingredient categories for better matching
        self.food_categories = self._load_food_categories()
        
        # Unit conversions
        self.unit_conversions = self._load_unit_conversions()
        
        # Performance tracking
        self.stats = {
            'cache_hits': 0,
            'cache_misses': 0,
            'fuzzy_matches': 0,
            'combination_hits': 0,
            'ingredients_normalized': 0
        }
    
    def _load_food_categories(self) -> Dict[str, str]:
        """Load food category mappings for better ingredient matching."""
        return {
            # Proteins
            'chicken': 'protein',
            'beef': 'protein',
            'pork': 'protein',
            'fish': 'protein',
            'salmon': 'protein',
            'tuna': 'protein',
            'egg': 'protein',
            'tofu': 'protein',
            'beans': 'protein',
            'lentils': 'protein',
            
            # Carbohydrates
            'rice': 'carbohydrate',
            'pasta': 'carbohydrate',
            'bread': 'carbohydrate',
            'potato': 'carbohydrate',
            'noodles': 'carbohydrate',
            'quinoa': 'carbohydrate',
            'oats': 'carbohydrate',
            
            # Vegetables
            'broccoli': 'vegetable',
            'spinach': 'vegetable',
            'carrot': 'vegetable',
            'tomato': 'vegetable',
            'onion': 'vegetable',
            'pepper': 'vegetable',
            'mushroom': 'vegetable',
            
            # Fruits
            'apple': 'fruit',
            'banana': 'fruit',
            'orange': 'fruit',
            'berries': 'fruit',
            
            # Dairy
            'milk': 'dairy',
            'cheese': 'dairy',
            'yogurt': 'dairy',
            'butter': 'dairy',
            
            # Fats
            'oil': 'fat',
            'olive oil': 'fat',
            'coconut oil': 'fat',
            'avocado': 'fat',
            'nuts': 'fat',
            
            # Grains
            'flour': 'grain',
            'wheat': 'grain',
            'corn': 'grain',
            
            # Spices/Herbs
            'salt': 'seasoning',
            'pepper': 'seasoning',
            'garlic': 'seasoning',
            'ginger': 'seasoning',
            'basil': 'herb',
            'oregano': 'herb'
        }
    
    def _load_unit_conversions(self) -> Dict[str, Dict[str, float]]:
        """Load unit conversion factors."""
        return {
            # Weight conversions (to grams)
            'weight': {
                'g': 1.0,
                'kg': 1000.0,
                'lb': 453.592,
                'oz': 28.3495,
                'pound': 453.592,
                'ounce': 28.3495
            },
            
            # Volume conversions (to ml)
            'volume': {
                'ml': 1.0,
                'l': 1000.0,
                'cup': 240.0,
                'tbsp': 15.0,
                'tsp': 5.0,
                'tablespoon': 15.0,
                'teaspoon': 5.0,
                'fl oz': 29.5735,
                'fluid ounce': 29.5735
            },
            
            # Count conversions (pieces)
            'count': {
                'piece': 1.0,
                'pieces': 1.0,
                'item': 1.0,
                'items': 1.0,
                'slice': 1.0,
                'slices': 1.0
            }
        }
    
    def normalize_ingredient(self, name: str, unit: str = 'g') -> IngredientKey:
        """
        Normalize an ingredient name for consistent caching.
        
        Args:
            name: Raw ingredient name
            unit: Unit of measurement
            
        Returns:
            IngredientKey with normalized information
        """
        try:
            # Clean and normalize the name
            cleaned_name = self._clean_ingredient_name(name)
            base_name = self._extract_base_name(cleaned_name)
            
            # Determine category
            category = self._determine_category(base_name)
            
            # Normalize unit
            normalized_unit, unit_type = self._normalize_unit(unit)
            
            self.stats['ingredients_normalized'] += 1
            
            return IngredientKey(
                name=cleaned_name,
                base_name=base_name,
                category=category,
                unit=normalized_unit,
                unit_type=unit_type
            )
            
        except Exception as e:
            logger.warning(f"Failed to normalize ingredient '{name}': {e}")
            # Return a basic normalized key
            return IngredientKey(
                name=name.lower().strip(),
                base_name=name.lower().strip(),
                category='unknown',
                unit=unit.lower(),
                unit_type='weight'
            )
    
    def _clean_ingredient_name(self, name: str) -> str:
        """Clean and standardize ingredient name."""
        # Convert to lowercase
        cleaned = name.lower().strip()
        
        # Remove common preparation words
        preparation_words = [
            'cooked', 'raw', 'fresh', 'frozen', 'dried', 'canned',
            'grilled', 'baked', 'fried', 'steamed', 'roasted',
            'chopped', 'diced', 'sliced', 'minced', 'grated',
            'organic', 'low-fat', 'fat-free', 'whole'
        ]
        
        for word in preparation_words:
            # Remove preparation words but keep them for context
            cleaned = re.sub(rf'\\b{word}\\b', '', cleaned)
        
        # Clean up extra spaces
        cleaned = re.sub(r'\\s+', ' ', cleaned).strip()
        
        return cleaned
    
    def _extract_base_name(self, name: str) -> str:
        """Extract the base ingredient name without descriptors."""
        # Remove parenthetical information
        base = re.sub(r'\\([^)]*\\)', '', name)
        
        # Remove common descriptors
        descriptors = ['lean', 'thick', 'thin', 'large', 'small', 'medium']
        for desc in descriptors:
            base = re.sub(rf'\\b{desc}\\b', '', base)
        
        # Take the first main word(s)
        words = base.strip().split()
        if len(words) <= 2:
            return ' '.join(words)
        else:
            # For complex names, take the first two words
            return ' '.join(words[:2])
    
    def _determine_category(self, base_name: str) -> str:
        """Determine the food category of an ingredient."""
        # Direct match
        if base_name in self.food_categories:
            return self.food_categories[base_name]
        
        # Partial match
        for food_name, category in self.food_categories.items():
            if food_name in base_name or base_name in food_name:
                return category
        
        # Default to unknown
        return 'unknown'
    
    def _normalize_unit(self, unit: str) -> Tuple[str, str]:
        """Normalize unit and determine unit type."""
        unit_lower = unit.lower().strip()
        
        # Check weight units
        for unit_name, factor in self.unit_conversions['weight'].items():
            if unit_lower == unit_name or unit_lower.startswith(unit_name):
                return 'g', 'weight'
        
        # Check volume units
        for unit_name, factor in self.unit_conversions['volume'].items():
            if unit_lower == unit_name or unit_lower.startswith(unit_name):
                return 'ml', 'volume'
        
        # Check count units
        for unit_name, factor in self.unit_conversions['count'].items():
            if unit_lower == unit_name or unit_lower.startswith(unit_name):
                return 'piece', 'count'
        
        # Default to grams
        return 'g', 'weight'
    
    def store_ingredient(
        self,
        name: str,
        unit: str,
        nutrition_data: Dict[str, float],
        source: str = 'ai',
        confidence: float = 80.0
    ) -> bool:
        """
        Store ingredient nutrition data in cache.
        
        Args:
            name: Ingredient name
            unit: Unit of measurement
            nutrition_data: Nutritional information
            source: Data source ('ai', 'database', 'user')
            confidence: Confidence level (0-100)
            
        Returns:
            True if stored successfully
        """
        try:
            # Only cache high-confidence data
            if confidence < self.min_confidence_to_cache:
                return False
            
            # Normalize ingredient
            ingredient_key = self.normalize_ingredient(name, unit)
            
            # Convert nutrition to per-100g basis
            nutrition = self._normalize_nutrition_data(nutrition_data, unit)
            
            # Create cached ingredient
            cached_ingredient = CachedIngredient(
                key=ingredient_key,
                nutrition=nutrition,
                source=source,
                confidence=confidence,
                created_at=datetime.now().timestamp(),
                access_count=1,
                last_accessed=datetime.now().timestamp()
            )
            
            # Generate cache key
            cache_key = self._generate_ingredient_cache_key(ingredient_key)
            
            # Store in cache
            cache.set(cache_key, asdict(cached_ingredient), timeout=self.default_ttl)
            
            # Update index
            self._update_ingredient_index(ingredient_key, cache_key)
            
            logger.debug(f"Stored ingredient in cache: {ingredient_key.base_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store ingredient '{name}': {e}")
            return False
    
    def find_ingredient(
        self,
        name: str,
        unit: str = 'g'
    ) -> Optional[CachedIngredient]:
        """
        Find cached ingredient data with fuzzy matching.
        
        Args:
            name: Ingredient name to search for
            unit: Unit of measurement
            
        Returns:
            CachedIngredient if found, None otherwise
        """
        try:
            # Normalize the search ingredient
            search_key = self.normalize_ingredient(name, unit)
            
            # Try exact match first
            exact_cache_key = self._generate_ingredient_cache_key(search_key)
            exact_match = cache.get(exact_cache_key)
            
            if exact_match:
                # Update access statistics
                exact_match['access_count'] += 1
                exact_match['last_accessed'] = datetime.now().timestamp()
                cache.set(exact_cache_key, exact_match, timeout=self.default_ttl)
                
                self.stats['cache_hits'] += 1
                return CachedIngredient(**exact_match)
            
            # Try fuzzy matching
            fuzzy_match = self._find_fuzzy_ingredient_match(search_key)
            if fuzzy_match:
                self.stats['fuzzy_matches'] += 1
                return fuzzy_match
            
            self.stats['cache_misses'] += 1
            return None
            
        except Exception as e:
            logger.error(f"Error finding ingredient '{name}': {e}")
            self.stats['cache_misses'] += 1
            return None
    
    def _find_fuzzy_ingredient_match(self, search_key: IngredientKey) -> Optional[CachedIngredient]:
        """Find fuzzy matches for an ingredient."""
        try:
            # Get ingredient index
            ingredient_index = cache.get(self.index_key, {})
            
            best_match = None
            best_score = 0.0
            
            for cache_key, stored_key_dict in ingredient_index.items():
                try:
                    stored_key = IngredientKey(**stored_key_dict)
                    
                    # Calculate similarity score
                    similarity = self._calculate_ingredient_similarity(search_key, stored_key)
                    
                    if similarity >= self.similarity_threshold and similarity > best_score:
                        # Get the cached ingredient
                        cached_data = cache.get(cache_key)
                        if cached_data:
                            best_match = CachedIngredient(**cached_data)
                            best_score = similarity
                
                except Exception as e:
                    logger.warning(f"Error processing cached ingredient {cache_key}: {e}")
                    continue
            
            if best_match:
                # Update access statistics
                cache_key = self._generate_ingredient_cache_key(best_match.key)
                updated_data = asdict(best_match)
                updated_data['access_count'] += 1
                updated_data['last_accessed'] = datetime.now().timestamp()
                cache.set(cache_key, updated_data, timeout=self.default_ttl)
                
                logger.debug(f"Fuzzy match found: {best_score:.3f} similarity")
                return best_match
            
            return None
            
        except Exception as e:
            logger.error(f"Error in fuzzy ingredient matching: {e}")
            return None
    
    def _calculate_ingredient_similarity(self, key1: IngredientKey, key2: IngredientKey) -> float:
        """Calculate similarity between two ingredient keys."""
        similarities = []
        
        # Base name similarity (most important)
        name_sim = self._string_similarity(key1.base_name, key2.base_name)
        similarities.append(('name', name_sim, 0.6))
        
        # Category similarity
        category_sim = 1.0 if key1.category == key2.category else 0.0
        similarities.append(('category', category_sim, 0.3))
        
        # Unit type similarity
        unit_sim = 1.0 if key1.unit_type == key2.unit_type else 0.5
        similarities.append(('unit_type', unit_sim, 0.1))
        
        # Weighted average
        weighted_sum = sum(sim * weight for _, sim, weight in similarities)
        total_weight = sum(weight for _, _, weight in similarities)
        
        return weighted_sum / total_weight if total_weight > 0 else 0.0
    
    def _string_similarity(self, str1: str, str2: str) -> float:
        """Calculate string similarity using simple character-based approach."""
        if str1 == str2:
            return 1.0
        
        # Use a simple approach for ingredient name similarity
        str1_words = set(str1.split())
        str2_words = set(str2.split())
        
        if not str1_words or not str2_words:
            return 0.0
        
        # Jaccard similarity for words
        intersection = str1_words.intersection(str2_words)
        union = str1_words.union(str2_words)
        
        jaccard = len(intersection) / len(union) if union else 0.0
        
        # Also check for substring matches
        substring_score = 0.0
        for word1 in str1_words:
            for word2 in str2_words:
                if word1 in word2 or word2 in word1:
                    substring_score += 0.5
        
        substring_score = min(substring_score, 1.0)
        
        # Combine scores
        return max(jaccard, substring_score)
    
    def store_combination(
        self,
        ingredients: List[Dict[str, Any]],
        nutrition_result: Dict[str, Any],
        serving_size: int = 1
    ) -> bool:
        """
        Store a combination of ingredients for faster lookup.
        
        Args:
            ingredients: List of ingredient dictionaries
            nutrition_result: Calculated nutrition data
            serving_size: Number of servings
            
        Returns:
            True if stored successfully
        """
        try:
            # Normalize ingredient names for the combination
            normalized_ingredients = []
            for ingredient in ingredients:
                normalized_key = self.normalize_ingredient(
                    ingredient.get('name', ''),
                    ingredient.get('unit', 'g')
                )
                normalized_ingredients.append(normalized_key.base_name)
            
            # Sort for consistent hashing
            normalized_ingredients.sort()
            
            # Generate combination hash
            combination_str = json.dumps({
                'ingredients': normalized_ingredients,
                'serving_size': serving_size
            }, sort_keys=True)
            combination_hash = hashlib.md5(combination_str.encode()).hexdigest()
            
            # Extract confidence from nutrition result
            confidence = nutrition_result.get('data', {}).get('confidence', {}).get('overall', 0)
            if confidence < self.min_confidence_to_cache:
                return False
            
            # Create combination cache entry
            combination = IngredientCombination(
                combination_hash=combination_hash,
                ingredients=normalized_ingredients,
                nutrition_per_serving=nutrition_result.get('data', {}).get('per_serving', {}),
                serving_size=serving_size,
                confidence=confidence,
                created_at=datetime.now().timestamp(),
                access_count=1
            )
            
            # Store in cache
            cache_key = f"{self.combination_prefix}{combination_hash}"
            cache.set(cache_key, asdict(combination), timeout=self.default_ttl)
            
            # Update combination index
            self._update_combination_index(combination_hash, normalized_ingredients)
            
            logger.debug(f"Stored ingredient combination: {len(normalized_ingredients)} ingredients")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store ingredient combination: {e}")
            return False
    
    def find_combination(
        self,
        ingredients: List[Dict[str, Any]],
        serving_size: int = 1
    ) -> Optional[Dict[str, Any]]:
        """
        Find cached nutrition data for an ingredient combination.
        
        Args:
            ingredients: List of ingredient dictionaries
            serving_size: Number of servings
            
        Returns:
            Cached nutrition data if found
        """
        try:
            # Normalize ingredient names
            normalized_ingredients = []
            for ingredient in ingredients:
                normalized_key = self.normalize_ingredient(
                    ingredient.get('name', ''),
                    ingredient.get('unit', 'g')
                )
                normalized_ingredients.append(normalized_key.base_name)
            
            # Sort for consistent hashing
            normalized_ingredients.sort()
            
            # Generate combination hash
            combination_str = json.dumps({
                'ingredients': normalized_ingredients,
                'serving_size': serving_size
            }, sort_keys=True)
            combination_hash = hashlib.md5(combination_str.encode()).hexdigest()
            
            # Check cache
            cache_key = f"{self.combination_prefix}{combination_hash}"
            cached_combination = cache.get(cache_key)
            
            if cached_combination:
                # Update access statistics
                cached_combination['access_count'] += 1
                cache.set(cache_key, cached_combination, timeout=self.default_ttl)
                
                self.stats['combination_hits'] += 1
                
                # Return the nutrition data in the expected format
                return {
                    'success': True,
                    'data': {
                        'per_serving': cached_combination['nutrition_per_serving'],
                        'servings': serving_size,
                        'confidence': cached_combination['confidence']
                    },
                    'source': 'ingredient_cache'
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error finding ingredient combination: {e}")
            return None
    
    def _normalize_nutrition_data(self, nutrition_data: Dict[str, float], unit: str) -> NutritionData:
        """Convert nutrition data to per-100g basis."""
        # This is a simplified approach - in practice you'd need more sophisticated
        # conversion based on ingredient density and unit types
        
        # For now, assume the nutrition data is already per 100g
        return NutritionData(
            calories_per_100g=nutrition_data.get('calories', 0),
            protein_per_100g=nutrition_data.get('protein', 0),
            carbs_per_100g=nutrition_data.get('carbohydrates', 0),
            fat_per_100g=nutrition_data.get('fat', 0),
            fiber_per_100g=nutrition_data.get('fiber', 0),
            sugar_per_100g=nutrition_data.get('sugar', 0),
            sodium_per_100g=nutrition_data.get('sodium', 0)
        )
    
    def _generate_ingredient_cache_key(self, ingredient_key: IngredientKey) -> str:
        """Generate cache key for an ingredient."""
        key_str = f"{ingredient_key.base_name}_{ingredient_key.category}_{ingredient_key.unit_type}"
        return f"{self.cache_prefix}{hashlib.md5(key_str.encode()).hexdigest()}"
    
    def _update_ingredient_index(self, ingredient_key: IngredientKey, cache_key: str):
        """Update the ingredient index."""
        try:
            ingredient_index = cache.get(self.index_key, {})
            ingredient_index[cache_key] = asdict(ingredient_key)
            
            # Limit index size
            if len(ingredient_index) > self.max_cache_entries:
                # Remove oldest entries (simplified approach)
                sorted_keys = list(ingredient_index.keys())[:self.max_cache_entries]
                ingredient_index = {k: ingredient_index[k] for k in sorted_keys}
            
            cache.set(self.index_key, ingredient_index, timeout=self.default_ttl * 2)
            
        except Exception as e:
            logger.error(f"Failed to update ingredient index: {e}")
    
    def _update_combination_index(self, combination_hash: str, ingredients: List[str]):
        """Update the combination index."""
        try:
            combination_index = cache.get(self.combination_index_key, {})
            combination_index[combination_hash] = {
                'ingredients': ingredients,
                'created_at': datetime.now().timestamp()
            }
            
            # Limit index size
            if len(combination_index) > self.max_combinations:
                # Sort by creation time and keep newest
                sorted_combinations = sorted(
                    combination_index.items(),
                    key=lambda x: x[1]['created_at'],
                    reverse=True
                )
                combination_index = dict(sorted_combinations[:self.max_combinations])
            
            cache.set(self.combination_index_key, combination_index, timeout=self.default_ttl * 2)
            
        except Exception as e:
            logger.error(f"Failed to update combination index: {e}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get ingredient cache statistics."""
        ingredient_index = cache.get(self.index_key, {})
        combination_index = cache.get(self.combination_index_key, {})
        
        total_requests = self.stats['cache_hits'] + self.stats['cache_misses']
        hit_rate = (self.stats['cache_hits'] / total_requests) if total_requests > 0 else 0.0
        
        return {
            'hit_rate': hit_rate,
            'total_requests': total_requests,
            'cache_hits': self.stats['cache_hits'],
            'cache_misses': self.stats['cache_misses'],
            'fuzzy_matches': self.stats['fuzzy_matches'],
            'combination_hits': self.stats['combination_hits'],
            'ingredients_normalized': self.stats['ingredients_normalized'],
            'cached_ingredients': len(ingredient_index),
            'cached_combinations': len(combination_index),
            'max_ingredients': self.max_cache_entries,
            'max_combinations': self.max_combinations,
            'similarity_threshold': self.similarity_threshold
        }
    
    def clear_cache(self) -> bool:
        """Clear all ingredient cache entries."""
        try:
            # Get indices
            ingredient_index = cache.get(self.index_key, {})
            combination_index = cache.get(self.combination_index_key, {})
            
            # Delete all cached ingredients
            for cache_key in ingredient_index.keys():
                cache.delete(cache_key)
            
            # Delete all cached combinations
            for combination_hash in combination_index.keys():
                cache_key = f"{self.combination_prefix}{combination_hash}"
                cache.delete(cache_key)
            
            # Delete indices
            cache.delete(self.index_key)
            cache.delete(self.combination_index_key)
            
            # Reset statistics
            self.stats = {
                'cache_hits': 0,
                'cache_misses': 0,
                'fuzzy_matches': 0,
                'combination_hits': 0,
                'ingredients_normalized': 0
            }
            
            logger.info("Ingredient cache cleared")
            return True
            
        except Exception as e:
            logger.error(f"Failed to clear ingredient cache: {e}")
            return False


# Global instance
ingredient_cache = IngredientCache()