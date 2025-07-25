"""
Advanced Prompt Engineering for Nutrition AI

This module provides sophisticated prompt engineering techniques for better
food image analysis using Google Gemini Vision API.
"""

import json
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

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
                            "preparation": "grilled, seasoned",
                        },
                        {
                            "name": "broccoli",
                            "quantity": 100,
                            "unit": "g",
                            "calories": 34,
                            "protein": 2.8,
                            "carbohydrates": 7.0,
                            "fat": 0.4,
                            "preparation": "steamed",
                        },
                    ],
                    "nutrition": {
                        "calories": 265,
                        "protein": 46.3,
                        "carbohydrates": 7.0,
                        "fat": 5.4,
                        "fiber": 2.6,
                        "sugar": 1.5,
                        "sodium": 120,
                    },
                    "confidence": {
                        "overall": 92,
                        "ingredients_identified": 95,
                        "portions_estimated": 88,
                    },
                },
                complexity_level="low",
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
                            "preparation": "boiled",
                        },
                        {
                            "name": "ground beef",
                            "quantity": 80,
                            "unit": "g",
                            "calories": 200,
                            "protein": 20.0,
                            "carbohydrates": 0,
                            "fat": 12.8,
                            "preparation": "cooked in sauce",
                        },
                        {
                            "name": "tomato sauce",
                            "quantity": 100,
                            "unit": "g",
                            "calories": 29,
                            "protein": 1.6,
                            "carbohydrates": 7.0,
                            "fat": 0.2,
                            "preparation": "simmered with herbs",
                        },
                        {
                            "name": "parmesan cheese",
                            "quantity": 15,
                            "unit": "g",
                            "calories": 59,
                            "protein": 5.4,
                            "carbohydrates": 0.4,
                            "fat": 4.0,
                            "preparation": "grated, fresh",
                        },
                        {
                            "name": "olive oil",
                            "quantity": 5,
                            "unit": "ml",
                            "calories": 45,
                            "protein": 0,
                            "carbohydrates": 0,
                            "fat": 5.0,
                            "preparation": "for cooking",
                        },
                    ],
                    "nutrition": {
                        "calories": 704,
                        "protein": 40.0,
                        "carbohydrates": 82.1,
                        "fat": 23.5,
                        "fiber": 4.2,
                        "sugar": 8.4,
                        "sodium": 580,
                    },
                    "confidence": {
                        "overall": 85,
                        "ingredients_identified": 88,
                        "portions_estimated": 82,
                    },
                },
                cuisine_type="italian",
                complexity_level="medium",
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
                            "preparation": "cut and simmered in curry",
                        },
                        {
                            "name": "coconut milk",
                            "quantity": 150,
                            "unit": "ml",
                            "calories": 283,
                            "protein": 2.9,
                            "carbohydrates": 6.4,
                            "fat": 29.7,
                            "preparation": "full-fat, used as curry base",
                        },
                        {
                            "name": "Thai eggplant",
                            "quantity": 60,
                            "unit": "g",
                            "calories": 15,
                            "protein": 0.7,
                            "carbohydrates": 3.6,
                            "fat": 0.1,
                            "preparation": "cut and cooked in curry",
                        },
                        {
                            "name": "jasmine rice",
                            "quantity": 150,
                            "unit": "g",
                            "calories": 195,
                            "protein": 4.0,
                            "carbohydrates": 44.5,
                            "fat": 0.4,
                            "preparation": "steamed",
                        },
                        {
                            "name": "green curry paste",
                            "quantity": 20,
                            "unit": "g",
                            "calories": 15,
                            "protein": 0.8,
                            "carbohydrates": 2.5,
                            "fat": 0.5,
                            "preparation": "traditional Thai paste",
                        },
                        {
                            "name": "fish sauce",
                            "quantity": 5,
                            "unit": "ml",
                            "calories": 3,
                            "protein": 0.5,
                            "carbohydrates": 0.4,
                            "fat": 0,
                            "preparation": "seasoning",
                        },
                        {
                            "name": "Thai basil",
                            "quantity": 5,
                            "unit": "g",
                            "calories": 1,
                            "protein": 0.1,
                            "carbohydrates": 0.1,
                            "fat": 0,
                            "preparation": "fresh garnish",
                        },
                    ],
                    "nutrition": {
                        "calories": 696,
                        "protein": 31.8,
                        "carbohydrates": 57.5,
                        "fat": 40.3,
                        "fiber": 3.2,
                        "sugar": 9.5,
                        "sodium": 980,
                    },
                    "confidence": {
                        "overall": 78,
                        "ingredients_identified": 85,
                        "portions_estimated": 72,
                    },
                },
                cuisine_type="thai",
                complexity_level="high",
            ),
        ]

    def _load_cuisine_specialists(self) -> Dict[str, Dict[str, Any]]:
        """Load cuisine-specific prompt optimizations."""
        return {
            "italian": {
                "common_ingredients": [
                    "pasta",
                    "olive oil",
                    "parmesan",
                    "tomatoes",
                    "basil",
                    "mozzarella",
                ],
                "cooking_methods": ["al dente", "simmered", "wood-fired", "sautéed"],
                "portion_notes": "Italian portions are typically moderate, pasta is usually 80-100g dry weight per person",
                "hidden_ingredients": [
                    "olive oil for cooking",
                    "salt in pasta water",
                    "parmesan rind in sauce",
                ],
            },
            "chinese": {
                "common_ingredients": [
                    "soy sauce",
                    "garlic",
                    "ginger",
                    "scallions",
                    "sesame oil",
                    "rice",
                ],
                "cooking_methods": ["stir-fried", "steamed", "braised", "deep-fried"],
                "portion_notes": "Chinese dishes often served family-style, individual portions vary",
                "hidden_ingredients": [
                    "cooking oil",
                    "cornstarch for thickening",
                    "sugar in sauces",
                ],
            },
            "thai": {
                "common_ingredients": [
                    "coconut milk",
                    "fish sauce",
                    "lime",
                    "chili",
                    "lemongrass",
                    "basil",
                ],
                "cooking_methods": ["simmered", "stir-fried", "grilled", "steamed"],
                "portion_notes": "Thai curries are typically 200-300ml per serving with rice",
                "hidden_ingredients": ["palm sugar", "shrimp paste", "tamarind paste"],
            },
            "mexican": {
                "common_ingredients": [
                    "beans",
                    "rice",
                    "cheese",
                    "avocado",
                    "cilantro",
                    "lime",
                    "tortillas",
                ],
                "cooking_methods": ["grilled", "simmered", "fried", "charred"],
                "portion_notes": "Mexican portions can be large, especially in restaurant settings",
                "hidden_ingredients": [
                    "lard or oil in beans",
                    "cheese inside dishes",
                    "sour cream",
                ],
            },
            "indian": {
                "common_ingredients": [
                    "ghee",
                    "onions",
                    "tomatoes",
                    "yogurt",
                    "rice",
                    "various spices",
                ],
                "cooking_methods": ["simmered", "roasted", "fried", "tandoor-cooked"],
                "portion_notes": "Indian curries typically 200-250ml per serving with rice or bread",
                "hidden_ingredients": [
                    "ghee or oil for tempering",
                    "cream in curries",
                    "sugar for balance",
                ],
            },
        }

    def build_enhanced_prompt(
        self,
        context: Optional[Dict[str, Any]] = None,
        complexity_hint: str = "medium",
        use_examples: bool = True,
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
            "",
        ]

        # Add context-specific guidance
        if context:
            cuisine_type = context.get("cuisine_type", "").lower()
            if cuisine_type in self.cuisine_specialists:
                specialist = self.cuisine_specialists[cuisine_type]
                prompt_parts.extend(
                    [
                        f"# {cuisine_type.upper()} CUISINE SPECIALIST KNOWLEDGE:",
                        f"Common ingredients: {', '.join(specialist['common_ingredients'])}",
                        f"Typical cooking methods: {', '.join(specialist['cooking_methods'])}",
                        f"Portion considerations: {specialist['portion_notes']}",
                        f"Hidden ingredients to consider: {', '.join(specialist['hidden_ingredients'])}",
                        "",
                    ]
                )

        # Add multi-shot examples if requested
        if use_examples:
            # Select relevant examples based on context and complexity
            selected_examples = self._select_relevant_examples(context, complexity_hint)
            if selected_examples:
                prompt_parts.append("# ANALYSIS EXAMPLES:")
                prompt_parts.append(
                    "Study these examples to understand the expected analysis quality and format:"
                )
                prompt_parts.append("")

                for i, example in enumerate(selected_examples, 1):
                    prompt_parts.extend(
                        [
                            f"## Example {i}: {example.description}",
                            f"Image: {example.image_description}",
                            "",
                            "Expected Analysis:",
                            "```json",
                            json.dumps(example.expected_analysis, indent=2),
                            "```",
                            "",
                        ]
                    )

        # Add chain-of-thought reasoning instructions
        prompt_parts.extend(
            [
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
                "",
            ]
        )

        # Add comprehensive context information if available
        if context:
            context_info = self._build_comprehensive_context_section(context)
            if context_info:
                prompt_parts.extend(["# COMPREHENSIVE CONTEXT:", context_info, ""])

        # Add final instructions and JSON format
        prompt_parts.extend(
            [
                "# FINAL INSTRUCTIONS:",
                "",
                "Now analyze the provided food image following the methodology above.",
                "Provide your analysis in the following JSON format (no markdown, no explanations):",
                "",
                "```json",
                json.dumps(
                    {
                        "description": "Brief description of the dish",
                        "servings": "number",
                        "serving_size": "specific description (e.g., 1 burger, 2 cups, 250g)",
                        "cooking_method": "primary cooking method used",
                        "reasoning": {
                            "visual_assessment": "What you observed in the image",
                            "ingredient_identification": "How you identified each ingredient",
                            "portion_estimation": "How you estimated portion sizes",
                            "confidence_factors": "What affects your confidence levels",
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
                                "preparation": "how it's prepared",
                            }
                        ],
                        "nutrition": {
                            "calories": "number (total for the serving)",
                            "protein": "number (grams)",
                            "carbohydrates": "number (grams)",
                            "fat": "number (grams)",
                            "fiber": "number (grams)",
                            "sugar": "number (grams)",
                            "sodium": "number (milligrams)",
                        },
                        "confidence": {
                            "overall": "number (0-100)",
                            "ingredients_identified": "number (0-100)",
                            "portions_estimated": "number (0-100)",
                            "cooking_method": "number (0-100)",
                        },
                    },
                    indent=2,
                ),
                "```",
                "",
                "# CRITICAL REQUIREMENTS:",
                "- Use metric units (grams, milliliters) whenever possible",
                "- Include ALL visible ingredients, including oils, seasonings, and garnishes",
                "- Account for typical cooking additions (oil, butter, salt)",
                "- Ensure individual ingredient nutrition sums reasonably to totals",
                "- Be conservative with portion sizes if uncertain",
                "- Provide realistic confidence scores based on image clarity and complexity",
            ]
        )

        return "\n".join(prompt_parts)

    def _select_relevant_examples(
        self, context: Optional[Dict[str, Any]], complexity_hint: str
    ) -> List[FoodExample]:
        """Select the most relevant examples for the current analysis."""
        relevant_examples = []

        # Filter by cuisine type if available
        cuisine_type = context.get("cuisine_type", "").lower() if context else None

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

        if context.get("meal_type"):
            context_parts.append(f"Meal type: {context['meal_type']}")

        if context.get("cuisine_type"):
            context_parts.append(f"Cuisine type: {context['cuisine_type']}")

        if context.get("time_of_day"):
            context_parts.append(f"Time of day: {context['time_of_day']}")

        if context.get("location"):
            context_parts.append(f"Location: {context['location']}")

        if context.get("user_notes"):
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
            context_parts.append(
                "Time context: Evening meal, potentially larger portions"
            )

        return "\n".join(f"- {part}" for part in context_parts) if context_parts else ""

    def _build_comprehensive_context_section(self, context: Dict[str, Any]) -> str:
        """
        Build comprehensive context section utilizing all enhanced metadata.
        
        Args:
            context: Enhanced context dictionary with all metadata categories
            
        Returns:
            Formatted context string for AI prompt
        """
        context_sections = []

        # Basic temporal and environmental context
        basic_context = []
        basic_context.append(f"Meal type: {context.get('meal_type', 'unknown')}")
        basic_context.append(f"Date: {context.get('date')} ({context.get('day_of_week')})")
        basic_context.append(f"Time: {context.get('time_of_day')}")
        basic_context.append(f"Season: {context.get('season', 'unknown')}")
        
        if context.get("cuisine_type"):
            basic_context.append(f"Cuisine type: {context['cuisine_type']}")
        if context.get("location"):
            basic_context.append(f"Location: {context['location']}")
        if context.get("user_notes"):
            basic_context.append(f"User notes: {context['user_notes']}")
            
        context_sections.append("**Basic Context:**\n" + "\n".join(f"- {item}" for item in basic_context))

        # Enhanced location context
        if context.get("location_context"):
            loc_ctx = context["location_context"]
            location_details = []
            
            if loc_ctx.get("coordinates"):
                coords = loc_ctx["coordinates"]
                location_details.append(f"GPS coordinates: {coords['latitude']:.4f}, {coords['longitude']:.4f}")
                
            if loc_ctx.get("geographic_context"):
                geo = loc_ctx["geographic_context"]
                location_details.append(f"Geographic region: {geo['region']} ({geo['hemisphere']} hemisphere)")
                
            if loc_ctx.get("timezone"):
                location_details.append(f"Timezone: {loc_ctx['timezone']}")
            if loc_ctx.get("venue_type"):
                location_details.append(f"Venue type: {loc_ctx['venue_type']}")
                
            if loc_ctx.get("weather"):
                weather = loc_ctx["weather"]
                weather_info = f"Temperature: {weather['temperature']}°C"
                if weather.get("humidity"):
                    weather_info += f", Humidity: {weather['humidity']}%"
                location_details.append(weather_info)
                
            if location_details:
                context_sections.append("**Location & Environment:**\n" + "\n".join(f"- {item}" for item in location_details))

        # Technical and camera context
        if context.get("technical_context"):
            tech_ctx = context["technical_context"]
            technical_details = []
            
            if tech_ctx.get("device"):
                device = tech_ctx["device"]
                device_info = f"Device: {device['model']}"
                if device.get("os"):
                    device_info += f" ({device['os']})"
                technical_details.append(device_info)
                
            if tech_ctx.get("camera"):
                camera = tech_ctx["camera"]
                camera_details = []
                if camera.get("resolution_width") and camera.get("resolution_height"):
                    camera_details.append(f"Resolution: {camera['resolution_width']}x{camera['resolution_height']}")
                if camera.get("focal_length"):
                    camera_details.append(f"Focal length: {camera['focal_length']}mm")
                if camera.get("aperture"):
                    camera_details.append(f"Aperture: {camera['aperture']}")
                if camera.get("iso"):
                    camera_details.append(f"ISO: {camera['iso']}")
                if camera.get("flash_used"):
                    camera_details.append("Flash was used")
                    
                if camera_details:
                    technical_details.append(f"Camera settings: {', '.join(camera_details)}")
                    
            if technical_details:
                context_sections.append("**Technical Context:**\n" + "\n".join(f"- {item}" for item in technical_details))

        # Visual analysis context
        if context.get("visual_context"):
            visual_ctx = context["visual_context"]
            visual_details = []
            
            if visual_ctx.get("lighting"):
                lighting = visual_ctx["lighting"]
                lighting_info = f"Image brightness: {lighting['brightness']:.2f}"
                if lighting.get("contrast"):
                    lighting_info += f", Contrast: {lighting['contrast']:.2f}"
                lighting_info += f" (Quality: {lighting['lighting_quality']})"
                visual_details.append(lighting_info)
                
            if visual_ctx.get("colors"):
                colors = visual_ctx["colors"]
                color_info = f"Dominant colors: {', '.join(colors['dominant'])}"
                if colors.get("temperature"):
                    color_info += f" (Temperature: {colors['temperature']})"
                visual_details.append(color_info)
                
            if visual_ctx.get("reference_objects"):
                visual_details.append("Reference objects visible for scale estimation")
            if visual_ctx.get("tableware"):
                visual_details.append(f"Detected tableware: {', '.join(visual_ctx['tableware'])}")
                
            if visual_details:
                context_sections.append("**Visual Analysis:**\n" + "\n".join(f"- {item}" for item in visual_details))

        # User behavioral context
        if context.get("user_context"):
            user_ctx = context["user_context"]
            user_details = []
            
            if user_ctx.get("dietary_preferences"):
                user_details.append(f"Dietary preferences: {', '.join(user_ctx['dietary_preferences'])}")
            if user_ctx.get("typical_portion_size"):
                user_details.append(f"Typical portion size: {user_ctx['typical_portion_size']}")
            if user_ctx.get("cooking_skill_level"):
                user_details.append(f"Cooking skill level: {user_ctx['cooking_skill_level']}")
            if user_ctx.get("frequent_cuisines"):
                user_details.append(f"Frequently consumed cuisines: {', '.join(user_ctx['frequent_cuisines'])}")
                
            if user_details:
                context_sections.append("**User Profile:**\n" + "\n".join(f"- {item}" for item in user_details))

        # Smart contextual hints
        if context.get("smart_context"):
            smart_ctx = context["smart_context"]
            smart_details = []
            
            if smart_ctx.get("sharing_context"):
                smart_details.append(f"Meal sharing: {smart_ctx['sharing_context']}")
            if smart_ctx.get("estimated_value"):
                smart_details.append(f"Estimated meal value: ${smart_ctx['estimated_value']:.2f}")
            if smart_ctx.get("restaurant_chain"):
                smart_details.append(f"Restaurant chain: {smart_ctx['restaurant_chain']}")
            if smart_ctx.get("home_cooking_indicators"):
                smart_details.append(f"Home cooking indicators: {', '.join(smart_ctx['home_cooking_indicators'])}")
                
            if smart_details:
                context_sections.append("**Smart Context:**\n" + "\n".join(f"- {item}" for item in smart_details))

        # Multi-photo analysis context
        if context.get("multi_photo"):
            multi_ctx = context["multi_photo"]
            multi_details = []
            multi_details.append(f"Photo {multi_ctx['sequence_number']} of {multi_ctx['total_photos']}")
            if multi_ctx.get("photo_angle"):
                multi_details.append(f"Photo angle: {multi_ctx['photo_angle']}")
            context_sections.append("**Multi-Photo Analysis:**\n" + "\n".join(f"- {item}" for item in multi_details))

        # Quality and confidence context
        if context.get("quality_context"):
            quality_ctx = context["quality_context"]
            quality_details = []
            
            if quality_ctx.get("user_confidence"):
                quality_details.append(f"User photo confidence: {quality_ctx['user_confidence']:.1%}")
            if quality_ctx.get("detected_issues"):
                quality_details.append(f"Auto-detected issues: {', '.join(quality_ctx['detected_issues'])}")
            if quality_ctx.get("user_corrections"):
                quality_details.append("User has made corrections to previous analyses")
                
            if quality_details:
                context_sections.append("**Quality Assessment:**\n" + "\n".join(f"- {item}" for item in quality_details))

        # Analysis guidance based on context
        guidance_parts = []
        
        # Venue-specific guidance
        if context.get("location_context", {}).get("venue_type") == "restaurant":
            guidance_parts.append("Restaurant context: Consider typical restaurant portion sizes and preparation methods")
        elif context.get("smart_context", {}).get("home_cooking_indicators"):
            guidance_parts.append("Home cooking context: Consider homemade preparation and personal portion preferences")
            
        # Lighting guidance
        if context.get("visual_context", {}).get("lighting", {}).get("lighting_quality") in ["very_dark", "dark"]:
            guidance_parts.append("Poor lighting detected: Exercise extra caution with ingredient identification")
        elif context.get("visual_context", {}).get("lighting", {}).get("lighting_quality") == "very_bright":
            guidance_parts.append("Very bright lighting: May affect color perception and portion assessment")
            
        # User experience guidance
        if context.get("user_context", {}).get("cooking_skill_level") == "beginner":
            guidance_parts.append("Beginner cook: Consider simpler preparation methods and basic ingredients")
        elif context.get("user_context", {}).get("cooking_skill_level") == "advanced":
            guidance_parts.append("Advanced cook: Consider complex preparation techniques and specialty ingredients")
            
        if guidance_parts:
            context_sections.append("**Analysis Guidance:**\n" + "\n".join(f"- {item}" for item in guidance_parts))

        return "\n\n".join(context_sections) if context_sections else ""

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
        cuisine_type = context.get("cuisine_type", "").lower()
        if cuisine_type in ["italian", "mexican", "american"]:
            complexity_factors.append("low")
        elif cuisine_type in ["chinese", "indian", "thai", "japanese"]:
            complexity_factors.append("high")
        else:
            complexity_factors.append("medium")

        # Meal type complexity
        meal_type = context.get("meal_type", "").lower()
        if meal_type in ["breakfast", "snack"]:
            complexity_factors.append("low")
        elif meal_type in ["lunch"]:
            complexity_factors.append("medium")
        elif meal_type in ["dinner"]:
            complexity_factors.append("high")

        # Location-based complexity
        location = context.get("location", "").lower()
        if "restaurant" in location or "cafe" in location:
            complexity_factors.append("high")
        elif "home" in location:
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
