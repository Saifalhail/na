"""
Progressive Analysis System for AI-Powered Nutrition Analysis

This module provides streaming/progressive analysis capabilities that break down
the AI analysis process into stages and provide real-time updates to users.
"""

import asyncio
import json
import logging
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, AsyncGenerator, Callable, Dict, List, Optional

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


@dataclass
class AnalysisStage:
    """Represents a stage in the progressive analysis."""

    stage_id: str
    name: str
    description: str
    progress: float  # 0.0 to 1.0
    status: str  # 'pending', 'processing', 'completed', 'error'
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: Optional[float] = None
    completed_at: Optional[float] = None


@dataclass
class AnalysisSession:
    """Represents a progressive analysis session."""

    session_id: str
    user_id: int
    image_hash: str
    context: Dict[str, Any]
    stages: List[AnalysisStage]
    current_stage: int
    overall_progress: float
    status: str  # 'starting', 'processing', 'completed', 'error'
    started_at: float
    completed_at: Optional[float] = None
    final_result: Optional[Dict[str, Any]] = None


class ProgressiveAnalysisService:
    """
    Service for progressive AI analysis with real-time updates.

    Features:
    - Stage-based analysis breakdown
    - Real-time progress updates via WebSockets
    - Fallback to polling for non-WebSocket clients
    - Comprehensive error handling and recovery
    - Performance monitoring and optimization
    """

    def __init__(self):
        """Initialize the progressive analysis service."""
        self.cache_prefix = "progressive_analysis_"
        self.session_timeout = getattr(
            settings, "PROGRESSIVE_ANALYSIS_TIMEOUT", 300
        )  # 5 minutes

        # Thread pool for async operations
        self.executor = ThreadPoolExecutor(max_workers=4)

        # WebSocket channel layer
        self.channel_layer = get_channel_layer()

        # Analysis stages configuration
        self.analysis_stages = self._configure_analysis_stages()

        # Performance tracking
        self.stats = {
            "sessions_created": 0,
            "sessions_completed": 0,
            "sessions_failed": 0,
            "average_completion_time": 0.0,
            "stages_completed": 0,
        }

    def _configure_analysis_stages(self) -> List[Dict[str, Any]]:
        """Configure the analysis stages."""
        return [
            {
                "stage_id": "image_preprocessing",
                "name": "Image Preprocessing",
                "description": "Validating and preprocessing the food image",
                "weight": 0.10,  # 10% of total progress
            },
            {
                "stage_id": "cache_checking",
                "name": "Cache Analysis",
                "description": "Checking for similar cached analyses",
                "weight": 0.15,  # 15% of total progress
            },
            {
                "stage_id": "prompt_generation",
                "name": "AI Prompt Generation",
                "description": "Building optimized prompts for AI analysis",
                "weight": 0.10,  # 10% of total progress
            },
            {
                "stage_id": "ai_analysis",
                "name": "AI Food Recognition",
                "description": "Analyzing food items and ingredients using AI",
                "weight": 0.45,  # 45% of total progress
            },
            {
                "stage_id": "nutrition_calculation",
                "name": "Nutrition Calculation",
                "description": "Calculating detailed nutritional information",
                "weight": 0.15,  # 15% of total progress
            },
            {
                "stage_id": "result_validation",
                "name": "Result Validation",
                "description": "Validating and finalizing results",
                "weight": 0.05,  # 5% of total progress
            },
        ]

    def create_analysis_session(
        self, user_id: int, image_data: bytes, context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Create a new progressive analysis session.

        Args:
            user_id: User ID
            image_data: Image data for analysis
            context: Additional context information

        Returns:
            Session ID for tracking progress
        """
        try:
            # Generate session ID
            session_id = f"analysis_{uuid.uuid4().hex}"

            # Generate image hash for caching
            import hashlib

            image_hash = hashlib.sha256(image_data).hexdigest()[:16]

            # Create analysis stages
            stages = []
            for stage_config in self.analysis_stages:
                stage = AnalysisStage(
                    stage_id=stage_config["stage_id"],
                    name=stage_config["name"],
                    description=stage_config["description"],
                    progress=0.0,
                    status="pending",
                )
                stages.append(stage)

            # Create session
            session = AnalysisSession(
                session_id=session_id,
                user_id=user_id,
                image_hash=image_hash,
                context=context or {},
                stages=stages,
                current_stage=0,
                overall_progress=0.0,
                status="starting",
                started_at=time.time(),
            )

            # Store session in cache
            cache_key = f"{self.cache_prefix}{session_id}"
            cache.set(cache_key, asdict(session), timeout=self.session_timeout)

            # Store image data separately (shorter timeout)
            image_cache_key = f"{self.cache_prefix}image_{session_id}"
            cache.set(image_cache_key, image_data, timeout=600)  # 10 minutes

            self.stats["sessions_created"] += 1

            logger.info(f"Created progressive analysis session: {session_id}")
            return session_id

        except Exception as e:
            logger.error(f"Failed to create analysis session: {e}")
            raise

    def start_progressive_analysis(self, session_id: str) -> bool:
        """
        Start the progressive analysis in a background thread.

        Args:
            session_id: Session ID to process

        Returns:
            True if started successfully
        """
        try:
            # Submit to thread pool for async processing
            future = self.executor.submit(
                self._execute_progressive_analysis, session_id
            )

            logger.info(f"Started progressive analysis for session: {session_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to start progressive analysis: {e}")
            return False

    def _execute_progressive_analysis(self, session_id: str):
        """Execute the progressive analysis pipeline."""
        try:
            session = self._get_session(session_id)
            if not session:
                logger.error(f"Session not found: {session_id}")
                return

            # Update session status
            session.status = "processing"
            self._update_session(session)

            # Execute each stage
            for i, stage_config in enumerate(self.analysis_stages):
                try:
                    # Update current stage
                    session.current_stage = i
                    self._update_session(session)

                    # Execute stage
                    self._execute_stage(session, i, stage_config)

                except Exception as e:
                    logger.error(f"Stage {stage_config['stage_id']} failed: {e}")
                    self._handle_stage_error(session, i, str(e))
                    return

            # Complete the analysis
            session.status = "completed"
            session.completed_at = time.time()
            session.overall_progress = 1.0

            # Update final statistics
            completion_time = session.completed_at - session.started_at
            self.stats["sessions_completed"] += 1
            self.stats["average_completion_time"] = (
                self.stats["average_completion_time"]
                * (self.stats["sessions_completed"] - 1)
                + completion_time
            ) / self.stats["sessions_completed"]

            self._update_session(session)
            self._broadcast_progress_update(session)

            logger.info(
                f"Completed progressive analysis for session: {session_id} in {completion_time:.2f}s"
            )

        except Exception as e:
            logger.error(f"Progressive analysis failed for session {session_id}: {e}")
            self.stats["sessions_failed"] += 1

            # Update session with error
            session = self._get_session(session_id)
            if session:
                session.status = "error"
                session.completed_at = time.time()
                self._update_session(session)
                self._broadcast_progress_update(session)

    def _execute_stage(
        self, session: AnalysisSession, stage_index: int, stage_config: Dict[str, Any]
    ):
        """Execute a specific analysis stage."""
        stage = session.stages[stage_index]
        stage.status = "processing"
        stage.started_at = time.time()

        self._update_session(session)
        self._broadcast_progress_update(session)

        # Execute stage based on type
        stage_id = stage_config["stage_id"]

        if stage_id == "image_preprocessing":
            stage.result = self._execute_image_preprocessing(session)
        elif stage_id == "cache_checking":
            stage.result = self._execute_cache_checking(session)
        elif stage_id == "prompt_generation":
            stage.result = self._execute_prompt_generation(session)
        elif stage_id == "ai_analysis":
            stage.result = self._execute_ai_analysis(session)
        elif stage_id == "nutrition_calculation":
            stage.result = self._execute_nutrition_calculation(session)
        elif stage_id == "result_validation":
            stage.result = self._execute_result_validation(session)

        # Complete stage
        stage.status = "completed"
        stage.progress = 1.0
        stage.completed_at = time.time()

        # Update overall progress
        completed_weight = sum(
            config["weight"]
            for i, config in enumerate(self.analysis_stages)
            if i <= stage_index
        )
        session.overall_progress = completed_weight

        self.stats["stages_completed"] += 1

        self._update_session(session)
        self._broadcast_progress_update(session)

    def _execute_image_preprocessing(self, session: AnalysisSession) -> Dict[str, Any]:
        """Execute image preprocessing stage."""
        try:
            # Get image data
            image_cache_key = f"{self.cache_prefix}image_{session.session_id}"
            image_data = cache.get(image_cache_key)

            if not image_data:
                raise ValueError("Image data not found")

            # Validate image
            import io

            from PIL import Image

            img = Image.open(io.BytesIO(image_data))
            img.verify()

            # Get image properties
            img = Image.open(io.BytesIO(image_data))  # Reopen after verify
            width, height = img.size
            format_name = img.format
            mode = img.mode

            # Simple quality assessment
            quality_score = self._assess_image_quality(img)

            return {
                "image_valid": True,
                "width": width,
                "height": height,
                "format": format_name,
                "mode": mode,
                "quality_score": quality_score,
                "file_size": len(image_data),
            }

        except Exception as e:
            raise ValueError(f"Image preprocessing failed: {str(e)}")

    def _execute_cache_checking(self, session: AnalysisSession) -> Dict[str, Any]:
        """Execute cache checking stage."""
        try:
            from .ingredient_cache import ingredient_cache
            from .visual_similarity_cache import visual_cache

            # Get image data
            image_cache_key = f"{self.cache_prefix}image_{session.session_id}"
            image_data = cache.get(image_cache_key)

            # Check visual similarity cache
            visual_match = None
            if getattr(settings, "AI_USE_VISUAL_CACHE", True):
                visual_match = visual_cache.find_similar_analysis(
                    image_data, session.context
                )

            # Get cache statistics
            visual_stats = visual_cache.get_cache_stats()
            ingredient_stats = ingredient_cache.get_cache_stats()

            return {
                "visual_cache_hit": visual_match is not None,
                "visual_cache_entries": visual_stats["cached_entries"],
                "ingredient_cache_entries": ingredient_stats["cached_ingredients"],
                "cache_result": visual_match,
            }

        except Exception as e:
            raise ValueError(f"Cache checking failed: {str(e)}")

    def _execute_prompt_generation(self, session: AnalysisSession) -> Dict[str, Any]:
        """Execute prompt generation stage."""
        try:
            from .advanced_prompt_engine import AdvancedPromptEngine

            prompt_engine = AdvancedPromptEngine()

            # Estimate complexity
            complexity = prompt_engine.estimate_complexity(session.context)

            # Generate prompt
            prompt = prompt_engine.build_enhanced_prompt(
                context=session.context, complexity_hint=complexity, use_examples=True
            )

            return {
                "complexity_level": complexity,
                "prompt_length": len(prompt),
                "uses_examples": True,
                "uses_chain_of_thought": "reasoning" in prompt.lower(),
            }

        except Exception as e:
            raise ValueError(f"Prompt generation failed: {str(e)}")

    def _execute_ai_analysis(self, session: AnalysisSession) -> Dict[str, Any]:
        """Execute AI analysis stage."""
        try:
            from .gemini_service import GeminiService

            # Get image data
            image_cache_key = f"{self.cache_prefix}image_{session.session_id}"
            image_data = cache.get(image_cache_key)

            if not image_data:
                raise ValueError("Image data not found")

            # Initialize Gemini service
            gemini_service = GeminiService()

            # Perform analysis
            analysis_result = gemini_service.analyze_food_image(
                image_data, session.context
            )

            if not analysis_result.get("success"):
                raise ValueError(analysis_result.get("error", "AI analysis failed"))

            # Store result for next stage
            session.final_result = analysis_result

            return {
                "ai_success": True,
                "ingredients_found": len(
                    analysis_result.get("data", {}).get("ingredients", [])
                ),
                "confidence_score": analysis_result.get("data", {})
                .get("confidence", {})
                .get("overall", 0),
                "has_nutrition_data": "nutrition" in analysis_result.get("data", {}),
            }

        except Exception as e:
            raise ValueError(f"AI analysis failed: {str(e)}")

    def _execute_nutrition_calculation(
        self, session: AnalysisSession
    ) -> Dict[str, Any]:
        """Execute nutrition calculation stage."""
        try:
            if not session.final_result:
                raise ValueError("No AI analysis result available")

            nutrition_data = session.final_result.get("data", {}).get("nutrition", {})
            ingredients = session.final_result.get("data", {}).get("ingredients", [])

            # Calculate additional nutrition metrics
            total_calories = nutrition_data.get("calories", 0)
            total_protein = nutrition_data.get("protein", 0)
            total_carbs = nutrition_data.get("carbohydrates", 0)
            total_fat = nutrition_data.get("fat", 0)

            # Calculate macronutrient percentages
            total_macros = total_protein * 4 + total_carbs * 4 + total_fat * 9
            if total_macros > 0:
                protein_percentage = (total_protein * 4 / total_macros) * 100
                carbs_percentage = (total_carbs * 4 / total_macros) * 100
                fat_percentage = (total_fat * 9 / total_macros) * 100
            else:
                protein_percentage = carbs_percentage = fat_percentage = 0

            return {
                "total_calories": total_calories,
                "total_ingredients": len(ingredients),
                "macronutrient_breakdown": {
                    "protein_percentage": round(protein_percentage, 1),
                    "carbs_percentage": round(carbs_percentage, 1),
                    "fat_percentage": round(fat_percentage, 1),
                },
                "nutrition_complete": all(
                    nutrient in nutrition_data
                    for nutrient in ["calories", "protein", "carbohydrates", "fat"]
                ),
            }

        except Exception as e:
            raise ValueError(f"Nutrition calculation failed: {str(e)}")

    def _execute_result_validation(self, session: AnalysisSession) -> Dict[str, Any]:
        """Execute result validation stage."""
        try:
            if not session.final_result:
                raise ValueError("No analysis result to validate")

            data = session.final_result.get("data", {})

            # Validate required fields
            required_fields = ["description", "ingredients", "nutrition"]
            missing_fields = [field for field in required_fields if field not in data]

            # Validate ingredients
            ingredients = data.get("ingredients", [])
            valid_ingredients = [
                ing
                for ing in ingredients
                if ing.get("name") and ing.get("calories") is not None
            ]

            # Validate nutrition data
            nutrition = data.get("nutrition", {})
            nutrition_fields = ["calories", "protein", "carbohydrates", "fat"]
            valid_nutrition_fields = [
                field
                for field in nutrition_fields
                if field in nutrition and nutrition[field] is not None
            ]

            validation_score = (
                (0 if missing_fields else 30)
                + (len(valid_ingredients) / max(len(ingredients), 1) * 40)
                + (len(valid_nutrition_fields) / len(nutrition_fields) * 30)
            )

            return {
                "validation_score": round(validation_score, 1),
                "missing_fields": missing_fields,
                "valid_ingredients": len(valid_ingredients),
                "total_ingredients": len(ingredients),
                "valid_nutrition_fields": len(valid_nutrition_fields),
                "result_valid": validation_score >= 80,
            }

        except Exception as e:
            raise ValueError(f"Result validation failed: {str(e)}")

    def _assess_image_quality(self, img) -> float:
        """Assess image quality for analysis."""
        try:
            # Simple quality metrics
            width, height = img.size

            # Resolution score (0-40)
            min_dimension = min(width, height)
            resolution_score = min(40, (min_dimension / 300) * 40)

            # Aspect ratio score (0-20)
            aspect_ratio = max(width, height) / min(width, height)
            aspect_score = max(0, 20 - (aspect_ratio - 1) * 10)

            # Size score (0-40)
            if min_dimension >= 512:
                size_score = 40
            elif min_dimension >= 256:
                size_score = 30
            elif min_dimension >= 128:
                size_score = 20
            else:
                size_score = 10

            total_score = resolution_score + aspect_score + size_score
            return min(100, total_score)

        except Exception as e:
            logger.error(f"Image quality assessment failed: {str(e)}", exc_info=True)
            return 50.0  # Default score due to assessment error

    def _handle_stage_error(
        self, session: AnalysisSession, stage_index: int, error_message: str
    ):
        """Handle stage execution error."""
        stage = session.stages[stage_index]
        stage.status = "error"
        stage.error = error_message
        stage.completed_at = time.time()

        session.status = "error"
        session.completed_at = time.time()

        self._update_session(session)
        self._broadcast_progress_update(session)

        logger.error(
            f"Stage {stage.stage_id} failed for session {session.session_id}: {error_message}"
        )

    def _get_session(self, session_id: str) -> Optional[AnalysisSession]:
        """Get analysis session from cache."""
        try:
            cache_key = f"{self.cache_prefix}{session_id}"
            session_data = cache.get(cache_key)

            if session_data:
                # Convert stages back to AnalysisStage objects
                stages = [
                    AnalysisStage(**stage_data) for stage_data in session_data["stages"]
                ]
                session_data["stages"] = stages
                return AnalysisSession(**session_data)

            return None

        except Exception as e:
            logger.error(f"Failed to get session {session_id}: {e}")
            return None

    def _update_session(self, session: AnalysisSession):
        """Update session in cache."""
        try:
            cache_key = f"{self.cache_prefix}{session.session_id}"
            cache.set(cache_key, asdict(session), timeout=self.session_timeout)

        except Exception as e:
            logger.error(f"Failed to update session {session.session_id}: {e}")

    def _broadcast_progress_update(self, session: AnalysisSession):
        """Broadcast progress update via WebSockets."""
        try:
            if self.channel_layer:
                # Send to user's group
                group_name = f"user_{session.user_id}_analysis"

                message = {
                    "type": "analysis_progress",
                    "session_id": session.session_id,
                    "overall_progress": session.overall_progress,
                    "current_stage": session.current_stage,
                    "status": session.status,
                    "stages": [
                        {
                            "name": stage.name,
                            "description": stage.description,
                            "status": stage.status,
                            "progress": stage.progress,
                        }
                        for stage in session.stages
                    ],
                }

                # If analysis is complete, include final result
                if session.status == "completed" and session.final_result:
                    message["final_result"] = session.final_result

                async_to_sync(self.channel_layer.group_send)(group_name, message)

        except Exception as e:
            logger.warning(f"Failed to broadcast progress update: {e}")

    def get_session_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get current session status (for polling clients)."""
        session = self._get_session(session_id)
        if not session:
            return None

        return {
            "session_id": session.session_id,
            "overall_progress": session.overall_progress,
            "current_stage": session.current_stage,
            "status": session.status,
            "stages": [
                {
                    "stage_id": stage.stage_id,
                    "name": stage.name,
                    "description": stage.description,
                    "status": stage.status,
                    "progress": stage.progress,
                    "result": stage.result,
                }
                for stage in session.stages
            ],
            "final_result": (
                session.final_result if session.status == "completed" else None
            ),
        }

    def get_service_stats(self) -> Dict[str, Any]:
        """Get progressive analysis service statistics."""
        return {
            "sessions_created": self.stats["sessions_created"],
            "sessions_completed": self.stats["sessions_completed"],
            "sessions_failed": self.stats["sessions_failed"],
            "success_rate": (
                self.stats["sessions_completed"]
                / max(self.stats["sessions_created"], 1)
            )
            * 100,
            "average_completion_time": self.stats["average_completion_time"],
            "stages_completed": self.stats["stages_completed"],
            "active_threads": (
                len(self.executor._threads) if hasattr(self.executor, "_threads") else 0
            ),
        }


# Global instance
progressive_analysis_service = ProgressiveAnalysisService()
