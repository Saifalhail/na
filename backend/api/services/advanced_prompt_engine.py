"""
Advanced Prompt Engineering for Nutrition AI

This module provides sophisticated prompt engineering techniques for better
food image analysis using Google Gemini Vision API.
"""

import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class FoodExample:
    """Represents a curated food example for multi-shot prompting."""
    description: str
    image_description: str
    expected_analysis: Dict[str, Any]
    cuisine_type: Optional[str] = None
    complexity_level: str = "medium"  # low, medium, high


class AdvancedPromptEngine:
    """
    Advanced prompt engineering system for nutrition analysis.
    
    Features:
    - Multi-shot prompting with curated examples
    - Cuisine-specific optimization
    - Context-aware prompt building
    - Confidence-based reasoning
    - Chain-of-thought analysis
    """
    
    def __init__(self):
        """Initialize the prompt engine with curated examples."""
        self.food_examples = self._load_curated_examples()
        self.cuisine_specialists = self._load_cuisine_specialists()
        
    def _load_curated_examples(self) -> List[FoodExample]:
        """Load curated food examples for multi-shot prompting."""
        return [
            # Simple examples for basic foods
            FoodExample(
                description="Grilled chicken breast with steamed broccoli",
                image_description="A white plate with a grilled chicken breast (approximately 150g) and steamed broccoli florets (about 100g). The chicken has visible grill marks and appears seasoned.",
                expected_analysis={
                    "description": "Grilled chicken breast with steamed broccoli",
                    "servings": 1,
                    "serving_size": "1 chicken breast (150g) with 1 cup broccoli (100g)",
                    "cooking_method": "grilled",
                    "ingredients": [
                        {
                            "name": "chicken breast",
                            "quantity": 150,
                            "unit": "g",
                            "calories": 231,
                            "protein": 43.5,
                            "carbohydrates": 0,
                            "fat": 5.0,
                            "preparation": "grilled, seasoned"
                        },
                        {
                            "name": "broccoli",
                            "quantity": 100,
                            "unit": "g", 
                            "calories": 34,
                            "protein": 2.8,
                            "carbohydrates": 7.0,
                            "fat": 0.4,
                            "preparation": "steamed"
                        }
                    ],
                    "nutrition": {
                        "calories": 265,
                        "protein": 46.3,
                        "carbohydrates": 7.0,
                        "fat": 5.4,
                        "fiber": 2.6,
                        "sugar": 1.5,
                        "sodium": 120
                    },
                    "confidence": {
                        "overall": 92,
                        "ingredients_identified": 95,
                        "portions_estimated": 88
                    }
                },
                complexity_level="low"
            ),
            
            # Medium complexity - pasta dish
            FoodExample(
                description="Spaghetti Bolognese with parmesan cheese",
                image_description="A bowl of spaghetti with meat sauce, topped with grated parmesan cheese. Visible herbs and a rich tomato-based sauce with ground meat.",
                expected_analysis={
                    "description": "Spaghetti Bolognese with parmesan cheese",
                    "servings": 1,
                    "serving_size": "1 bowl (approximately 300g total)",
                    "cooking_method": "boiled pasta with simmered sauce",
                    "ingredients": [
                        {
                            "name": "spaghetti pasta",
                            "quantity": 100,
                            "unit": "g",
                            "calories": 371,
                            "protein": 13.0,
                            "carbohydrates": 74.7,
                            "fat": 1.5,
                            "preparation": "boiled"
                        },
                        {
                            "name": "ground beef",
                            "quantity": 80,
                            "unit": "g",
                            "calories": 200,
                            "protein": 20.0,
                            "carbohydrates": 0,
                            "fat": 12.8,
                            "preparation": "cooked in sauce"
                        },
                        {
                            "name": "tomato sauce",
                            "quantity": 100,
                            "unit": "g",
                            "calories": 29,
                            "protein": 1.6,
                            "carbohydrates": 7.0,
                            "fat": 0.2,
                            "preparation": "simmered with herbs"
                        },
                        {
                            "name": "parmesan cheese",
                            "quantity": 15,
                            "unit": "g",
                            "calories": 59,
                            "protein": 5.4,
                            "carbohydrates": 0.4,
                            "fat": 4.0,
                            "preparation": "grated, fresh"
                        },
                        {
                            "name": "olive oil",
                            "quantity": 5,
                            "unit": "ml",
                            "calories": 45,
                            "protein": 0,
                            "carbohydrates": 0,
                            "fat": 5.0,
                            "preparation": "for cooking"
                        }
                    ],
                    "nutrition": {
                        "calories": 704,
                        "protein": 40.0,
                        "carbohydrates": 82.1,
                        "fat": 23.5,
                        "fiber": 4.2,
                        "sugar": 8.4,
                        "sodium": 580
                    },
                    "confidence": {
                        "overall": 85,
                        "ingredients_identified": 88,
                        "portions_estimated": 82
                    }
                },
                cuisine_type="italian",
                complexity_level="medium"
            ),
            
            # High complexity - mixed Asian dish
            FoodExample(
                description="Thai Green Curry with chicken, eggplant, and jasmine rice",
                image_description="A bowl of green curry with chicken pieces, Thai eggplant, bamboo shoots, and basil leaves, served alongside jasmine rice. The curry has a rich green color from herbs and coconut milk.",
                expected_analysis={
                    "description": "Thai Green Curry with chicken, eggplant, and jasmine rice",
                    "servings": 1,
                    "serving_size": "1 bowl curry (250ml) with 150g rice",
                    "cooking_method": "simmered curry with steamed rice",
                    "ingredients": [
                        {
                            "name": "chicken thigh",
                            "quantity": 120,
                            "unit": "g",
                            "calories": 184,
                            "protein": 22.8,
                            "carbohydrates": 0,
                            "fat": 9.6,
                            "preparation": "cut and simmered in curry"
                        },
                        {
                            "name": "coconut milk",
                            "quantity": 150,
                            "unit": "ml",
                            "calories": 283,
                            "protein": 2.9,
                            "carbohydrates": 6.4,
                            "fat": 29.7,
                            "preparation": "full-fat, used as curry base"
                        },
                        {
                            "name": "Thai eggplant",
                            "quantity": 60,
                            "unit": "g",
                            "calories": 15,
                            "protein": 0.7,
                            "carbohydrates": 3.6,
                            "fat": 0.1,
                            "preparation": "cut and cooked in curry"
                        },
                        {
                            "name": "jasmine rice",
                            "quantity": 150,
                            "unit": "g",
                            "calories": 195,
                            "protein": 4.0,
                            "carbohydrates": 44.5,
                            "fat": 0.4,
                            "preparation": "steamed"
                        },
                        {
                            "name": "green curry paste",
                            "quantity": 20,
                            "unit": "g",
                            "calories": 15,
                            "protein": 0.8,
                            "carbohydrates": 2.5,
                            "fat": 0.5,
                            "preparation": "traditional Thai paste"
                        },
                        {
                            "name": "fish sauce",
                            "quantity": 5,
                            "unit": "ml",
                            "calories": 3,
                            "protein": 0.5,
                            "carbohydrates": 0.4,
                            "fat": 0,
                            "preparation": "seasoning"
                        },
                        {
                            "name": "Thai basil",
                            "quantity": 5,
                            "unit": "g",
                            "calories": 1,
                            "protein": 0.1,
                            "carbohydrates": 0.1,
                            "fat": 0,
                            "preparation": "fresh garnish"
                        }
                    ],
                    "nutrition": {
                        "calories": 696,
                        "protein": 31.8,
                        "carbohydrates": 57.5,
                        "fat": 40.3,
                        "fiber": 3.2,
                        "sugar": 9.5,
                        "sodium": 980
                    },
                    "confidence": {
                        "overall": 78,
                        "ingredients_identified": 85,
                        "portions_estimated": 72
                    }
                },
                cuisine_type="thai",
                complexity_level="high"
            )
        ]
    
    def _load_cuisine_specialists(self) -> Dict[str, Dict[str, Any]]:
        """Load cuisine-specific prompt optimizations."""
        return {
            "italian": {
                "common_ingredients": ["pasta", "olive oil", "parmesan", "tomatoes", "basil", "mozzarella"],
                "cooking_methods": ["al dente", "simmered", "wood-fired", "sautéed"],
                "portion_notes": "Italian portions are typically moderate, pasta is usually 80-100g dry weight per person",
                "hidden_ingredients": ["olive oil for cooking", "salt in pasta water", "parmesan rind in sauce"]
            },
            "chinese": {
                "common_ingredients": ["soy sauce", "garlic", "ginger", "scallions", "sesame oil", "rice"],
                "cooking_methods": ["stir-fried", "steamed", "braised", "deep-fried"],
                "portion_notes": "Chinese dishes often served family-style, individual portions vary",
                "hidden_ingredients": ["cooking oil", "cornstarch for thickening", "sugar in sauces"]
            },
            "thai": {
                "common_ingredients": ["coconut milk", "fish sauce", "lime", "chili", "lemongrass", "basil"],
                "cooking_methods": ["simmered", "stir-fried", "grilled", "steamed"],
                "portion_notes": "Thai curries are typically 200-300ml per serving with rice",
                "hidden_ingredients": ["palm sugar", "shrimp paste", "tamarind paste"]
            },
            "mexican": {
                "common_ingredients": ["beans", "rice", "cheese", "avocado", "cilantro", "lime", "tortillas"],
                "cooking_methods": ["grilled", "simmered", "fried", "charred"],
                "portion_notes": "Mexican portions can be large, especially in restaurant settings",
                "hidden_ingredients": ["lard or oil in beans", "cheese inside dishes", "sour cream"]
            },
            "indian": {
                "common_ingredients": ["ghee", "onions", "tomatoes", "yogurt", "rice", "various spices"],
                "cooking_methods": ["simmered", "roasted", "fried", "tandoor-cooked"],
                "portion_notes": "Indian curries typically 200-250ml per serving with rice or bread",
                "hidden_ingredients": ["ghee or oil for tempering", "cream in curries", "sugar for balance"]
            }
        }
    
    def build_enhanced_prompt(
        self,
        context: Optional[Dict[str, Any]] = None,
        complexity_hint: str = "medium",
        use_examples: bool = True
    ) -> str:
        """
        Build an enhanced prompt with multi-shot examples and advanced reasoning.
        
        Args:
            context: User context (meal type, cuisine, location, etc.)
            complexity_hint: Expected complexity level (low, medium, high)
            use_examples: Whether to include examples in the prompt
            
        Returns:
            Enhanced prompt string
        """
        # Start with system instructions
        prompt_parts = [
            "You are an expert nutritionist and food analyst with extensive knowledge of cuisines worldwide.",
            "Your task is to analyze food images with precision and provide accurate nutritional information.",
            "",
            "# ANALYSIS METHODOLOGY:",
            "1. VISUAL INSPECTION: Carefully examine all visible food items, their preparation methods, and portion sizes",
            "2. INGREDIENT IDENTIFICATION: List each ingredient with specific attention to hidden components",
            "3. PORTION ESTIMATION: Use visual cues like plate size, utensils, and food density for accurate portions",
            "4. NUTRITIONAL CALCULATION: Apply nutritional knowledge considering cooking methods and ingredient interactions",
            "5. CONFIDENCE ASSESSMENT: Evaluate certainty levels for each aspect of the analysis",
            ""
        ]
        
        # Add context-specific guidance
        if context:
            cuisine_type = context.get('cuisine_type', '').lower()
            if cuisine_type in self.cuisine_specialists:
                specialist = self.cuisine_specialists[cuisine_type]
                prompt_parts.extend([
                    f"# {cuisine_type.upper()} CUISINE SPECIALIST KNOWLEDGE:",
                    f"Common ingredients: {', '.join(specialist['common_ingredients'])}",
                    f"Typical cooking methods: {', '.join(specialist['cooking_methods'])}",
                    f"Portion considerations: {specialist['portion_notes']}",
                    f"Hidden ingredients to consider: {', '.join(specialist['hidden_ingredients'])}",
                    ""
                ])
        
        # Add multi-shot examples if requested
        if use_examples:
            # Select relevant examples based on context and complexity
            selected_examples = self._select_relevant_examples(context, complexity_hint)
            if selected_examples:
                prompt_parts.append("# ANALYSIS EXAMPLES:")
                prompt_parts.append("Study these examples to understand the expected analysis quality and format:")
                prompt_parts.append("")
                
                for i, example in enumerate(selected_examples, 1):
                    prompt_parts.extend([
                        f"## Example {i}: {example.description}",
                        f"Image: {example.image_description}",
                        "",
                        "Expected Analysis:",
                        "```json",
                        json.dumps(example.expected_analysis, indent=2),
                        "```",
                        ""
                    ])
        
        # Add chain-of-thought reasoning instructions
        prompt_parts.extend([
            "# CHAIN-OF-THOUGHT ANALYSIS PROCESS:",
            "",
            "Before providing your final JSON response, think through this analysis step by step:",
            "",
            "1. **Initial Visual Assessment**:",
            "   - What dish or meal do I see?",
            "   - What are the main components visible?",
            "   - What cooking methods are evident?",
            "",
            "2. **Detailed Ingredient Analysis**:",
            "   - List each visible ingredient",
            "   - Estimate quantities using visual cues",
            "   - Consider hidden ingredients (oils, seasonings, etc.)",
            "",
            "3. **Portion Size Estimation**:",
            "   - Use plate/bowl size as reference",
            "   - Consider food density and layering",
            "   - Account for typical serving sizes",
            "",
            "4. **Nutritional Calculation**:",
            "   - Calculate nutrition for each ingredient",
            "   - Account for cooking method impacts",
            "   - Sum totals and verify reasonableness",
            "",
            "5. **Confidence Assessment**:",
            "   - How clear are the ingredients? (0-100)",
            "   - How accurate are the portion estimates? (0-100)",
            "   - Overall confidence in the analysis? (0-100)",
            ""
        ])
        
        # Add context information if available
        if context:
            context_info = self._build_context_section(context)
            if context_info:
                prompt_parts.extend([
                    "# ADDITIONAL CONTEXT:",
                    context_info,
                    ""
                ])
        
        # Add final instructions and JSON format
        prompt_parts.extend([
            "# FINAL INSTRUCTIONS:",
            "",
            "Now analyze the provided food image following the methodology above.",
            "Provide your analysis in the following JSON format (no markdown, no explanations):",
            "",
            "```json",
            json.dumps({
                "description": "Brief description of the dish",
                "servings": "number",
                "serving_size": "specific description (e.g., 1 burger, 2 cups, 250g)",
                "cooking_method": "primary cooking method used",
                "reasoning": {
                    "visual_assessment": "What you observed in the image",
                    "ingredient_identification": "How you identified each ingredient",
                    "portion_estimation": "How you estimated portion sizes",
                    "confidence_factors": "What affects your confidence levels"
                },
                "ingredients": [
                    {
                        "name": "ingredient name",
                        "quantity": "number",
                        "unit": "grams/ml/pieces/etc",
                        "calories": "number",
                        "protein": "number (grams)",
                        "carbohydrates": "number (grams)",
                        "fat": "number (grams)",
                        "preparation": "how it's prepared"
                    }
                ],
                "nutrition": {
                    "calories": "number (total for the serving)",
                    "protein": "number (grams)",
                    "carbohydrates": "number (grams)",
                    "fat": "number (grams)",
                    "fiber": "number (grams)",
                    "sugar": "number (grams)",
                    "sodium": "number (milligrams)"
                },
                "confidence": {
                    "overall": "number (0-100)",
                    "ingredients_identified": "number (0-100)",
                    "portions_estimated": "number (0-100)",
                    "cooking_method": "number (0-100)"
                }
            }, indent=2),
            "```",
            "",
            "# CRITICAL REQUIREMENTS:",
            "- Use metric units (grams, milliliters) whenever possible",
            "- Include ALL visible ingredients, including oils, seasonings, and garnishes",
            "- Account for typical cooking additions (oil, butter, salt)",
            "- Ensure individual ingredient nutrition sums reasonably to totals",
            "- Be conservative with portion sizes if uncertain",
            "- Provide realistic confidence scores based on image clarity and complexity"
        ])
        
        return "\n".join(prompt_parts)
    
    def _select_relevant_examples(
        self,
        context: Optional[Dict[str, Any]],
        complexity_hint: str
    ) -> List[FoodExample]:
        """Select the most relevant examples for the current analysis."""
        relevant_examples = []
        
        # Filter by cuisine type if available
        cuisine_type = context.get('cuisine_type', '').lower() if context else None
        
        # Select examples based on complexity and cuisine
        for example in self.food_examples:
            # Always include at least one simple example
            if example.complexity_level == "low" and len(relevant_examples) == 0:
                relevant_examples.append(example)
                continue
            
            # Include cuisine-specific examples
            if cuisine_type and example.cuisine_type == cuisine_type:
                relevant_examples.append(example)
                continue
            
            # Include complexity-matched examples
            if example.complexity_level == complexity_hint:
                relevant_examples.append(example)
        
        # Limit to 2-3 examples to avoid token bloat
        return relevant_examples[:3]
    
    def _build_context_section(self, context: Dict[str, Any]) -> str:
        """Build context information section for the prompt."""
        context_parts = []
        
        if context.get('meal_type'):
            context_parts.append(f"Meal type: {context['meal_type']}")
        
        if context.get('cuisine_type'):
            context_parts.append(f"Cuisine type: {context['cuisine_type']}")
        
        if context.get('time_of_day'):
            context_parts.append(f"Time of day: {context['time_of_day']}")
        
        if context.get('location'):
            context_parts.append(f"Location: {context['location']}")
        
        if context.get('user_notes'):
            context_parts.append(f"User notes: {context['user_notes']}")
        
        # Add time-based context
        current_time = datetime.now().hour
        if current_time < 10:
            context_parts.append("Time context: Morning meal, likely lighter portions")
        elif current_time < 14:
            context_parts.append("Time context: Lunch time, moderate portions")
        elif current_time < 18:
            context_parts.append("Time context: Afternoon meal/snack")
        else:
            context_parts.append("Time context: Evening meal, potentially larger portions")
        
        return "\n".join(f"- {part}" for part in context_parts) if context_parts else ""
    
    def estimate_complexity(self, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Estimate the complexity level of the analysis based on context.
        
        Returns:
            Complexity level: "low", "medium", or "high"
        """
        if not context:
            return "medium"
        
        complexity_factors = []
        
        # Cuisine-based complexity
        cuisine_type = context.get('cuisine_type', '').lower()
        if cuisine_type in ['italian', 'mexican', 'american']:
            complexity_factors.append("low")
        elif cuisine_type in ['chinese', 'indian', 'thai', 'japanese']:
            complexity_factors.append("high")
        else:
            complexity_factors.append("medium")
        
        # Meal type complexity
        meal_type = context.get('meal_type', '').lower()
        if meal_type in ['breakfast', 'snack']:
            complexity_factors.append("low")
        elif meal_type in ['lunch']:
            complexity_factors.append("medium")
        elif meal_type in ['dinner']:
            complexity_factors.append("high")
        
        # Location-based complexity
        location = context.get('location', '').lower()
        if 'restaurant' in location or 'cafe' in location:
            complexity_factors.append("high")
        elif 'home' in location:
            complexity_factors.append("low")
        
        # Determine overall complexity
        low_count = complexity_factors.count("low")
        high_count = complexity_factors.count("high")
        
        if high_count > low_count:
            return "high"
        elif low_count > high_count:
            return "low"
        else:
            return "medium"