"""
Confidence-Based AI Model Routing System

This module provides intelligent routing between different AI models and configurations
based on image complexity, confidence requirements, and performance optimization.
"""

import logging
import time
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from django.conf import settings
from django.core.cache import cache
from .gemini_service import GeminiService
from .advanced_prompt_engine import AdvancedPromptEngine
import hashlib
import json

logger = logging.getLogger(__name__)


@dataclass
class ModelConfig:
    """Configuration for an AI model."""
    model_id: str
    model_name: str
    api_key_setting: str
    cost_per_token: float
    speed_tier: str  # 'fast', 'medium', 'slow'
    accuracy_tier: str  # 'high', 'medium', 'low'
    max_image_size: int
    supports_batch: bool
    confidence_boost: float  # Multiplier for confidence scores


@dataclass
class RoutingDecision:
    """Result of model routing decision."""
    selected_model: str
    reasoning: str
    estimated_cost: float
    estimated_time: float
    confidence_threshold: float
    fallback_models: List[str]
    routing_factors: Dict[str, float]


@dataclass
class ModelPerformance:
    """Performance tracking for a model."""
    model_id: str
    total_requests: int
    successful_requests: int
    average_response_time: float
    average_confidence: float
    average_cost: float
    last_used: float
    error_rate: float


class ConfidenceRoutingService:
    """
    Intelligent AI model routing based on confidence requirements and optimization.
    
    Features:
    - Multi-model support with performance tracking
    - Dynamic routing based on image complexity and requirements
    - Cost optimization and budget management
    - Fallback routing for failed requests
    - Performance monitoring and model health tracking
    - A/B testing capabilities for model comparison
    """
    
    def __init__(self):
        """Initialize the confidence routing service."""
        self.cache_prefix = "confidence_routing_"
        self.performance_cache_key = "model_performance_stats"
        self.routing_cache_ttl = getattr(settings, 'CONFIDENCE_ROUTING_CACHE_TTL', 3600)
        
        # Model configurations
        self.available_models = self._configure_available_models()
        
        # Routing configuration
        self.default_confidence_threshold = getattr(settings, 'DEFAULT_CONFIDENCE_THRESHOLD', 75.0)
        self.enable_cost_optimization = getattr(settings, 'ENABLE_COST_OPTIMIZATION', True)
        self.max_cost_per_request = getattr(settings, 'MAX_COST_PER_REQUEST', 0.10)
        self.enable_fallback_routing = getattr(settings, 'ENABLE_FALLBACK_ROUTING', True)
        
        # Performance tracking
        self.performance_stats = self._load_performance_stats()
        
        # Prompt engine for complexity estimation
        self.prompt_engine = AdvancedPromptEngine()
    
    def _configure_available_models(self) -> Dict[str, ModelConfig]:
        """Configure available AI models."""
        models = {}
        
        # Gemini Pro (primary model)
        if getattr(settings, 'GEMINI_API_KEY', None):
            models['gemini-pro'] = ModelConfig(
                model_id='gemini-pro',
                model_name='gemini-1.5-pro',
                api_key_setting='GEMINI_API_KEY',
                cost_per_token=0.000125,  # Approximate cost
                speed_tier='medium',
                accuracy_tier='high',
                max_image_size=20 * 1024 * 1024,  # 20MB
                supports_batch=False,
                confidence_boost=1.0
            )
        
        # Gemini Flash (faster, lower cost)
        if getattr(settings, 'GEMINI_API_KEY', None):
            models['gemini-flash'] = ModelConfig(
                model_id='gemini-flash',
                model_name='gemini-1.5-flash',
                api_key_setting='GEMINI_API_KEY',
                cost_per_token=0.000075,  # Lower cost
                speed_tier='fast',
                accuracy_tier='medium',
                max_image_size=20 * 1024 * 1024,
                supports_batch=True,
                confidence_boost=0.95
            )
        
        # OpenAI GPT-4 Vision (if configured)
        if getattr(settings, 'OPENAI_API_KEY', None):
            models['gpt-4-vision'] = ModelConfig(
                model_id='gpt-4-vision',
                model_name='gpt-4-vision-preview',
                api_key_setting='OPENAI_API_KEY',
                cost_per_token=0.01,  # Higher cost
                speed_tier='slow',
                accuracy_tier='high',
                max_image_size=20 * 1024 * 1024,
                supports_batch=False,
                confidence_boost=1.05
            )
        
        return models
    
    def _load_performance_stats(self) -> Dict[str, ModelPerformance]:
        """Load model performance statistics from cache."""
        try:
            cached_stats = cache.get(self.performance_cache_key, {})
            
            performance_stats = {}
            for model_id, stats_dict in cached_stats.items():
                if model_id in self.available_models:
                    performance_stats[model_id] = ModelPerformance(**stats_dict)
            
            # Initialize stats for new models
            for model_id in self.available_models:
                if model_id not in performance_stats:
                    performance_stats[model_id] = ModelPerformance(
                        model_id=model_id,
                        total_requests=0,
                        successful_requests=0,
                        average_response_time=0.0,
                        average_confidence=0.0,
                        average_cost=0.0,
                        last_used=0.0,
                        error_rate=0.0
                    )
            
            return performance_stats
            
        except Exception as e:
            logger.error(f"Failed to load performance stats: {e}")
            return {}
    
    def _save_performance_stats(self):
        """Save performance statistics to cache."""
        try:
            stats_dict = {
                model_id: asdict(stats)
                for model_id, stats in self.performance_stats.items()
            }
            cache.set(self.performance_cache_key, stats_dict, timeout=86400 * 7)  # 7 days
            
        except Exception as e:
            logger.error(f"Failed to save performance stats: {e}")
    
    def route_analysis_request(
        self,
        image_data: bytes,
        context: Optional[Dict[str, Any]] = None,
        confidence_requirement: Optional[float] = None,
        cost_limit: Optional[float] = None,
        speed_requirement: Optional[str] = None
    ) -> RoutingDecision:
        """
        Route analysis request to the best available model.
        
        Args:
            image_data: Image data for analysis
            context: Analysis context
            confidence_requirement: Minimum confidence required (0-100)
            cost_limit: Maximum cost limit for this request
            speed_requirement: Speed requirement ('fast', 'medium', 'slow')
            
        Returns:
            RoutingDecision with selected model and reasoning
        """
        try:
            # Estimate image complexity
            complexity_score = self._estimate_image_complexity(image_data, context)
            
            # Set default requirements
            confidence_requirement = confidence_requirement or self.default_confidence_threshold
            cost_limit = cost_limit or self.max_cost_per_request
            speed_requirement = speed_requirement or 'medium'
            
            # Calculate routing factors
            routing_factors = self._calculate_routing_factors(
                complexity_score=complexity_score,
                confidence_requirement=confidence_requirement,
                cost_limit=cost_limit,
                speed_requirement=speed_requirement
            )
            
            # Score available models
            model_scores = self._score_models(routing_factors)
            
            # Select best model
            if not model_scores:
                raise ValueError("No suitable models available")
            
            best_model_id = max(model_scores.keys(), key=lambda k: model_scores[k]['total_score'])
            best_model = self.available_models[best_model_id]
            best_score_info = model_scores[best_model_id]
            
            # Create fallback list
            fallback_models = [
                model_id for model_id, score_info in 
                sorted(model_scores.items(), key=lambda x: x[1]['total_score'], reverse=True)
                if model_id != best_model_id
            ][:2]  # Top 2 fallbacks
            
            # Estimate cost and time
            estimated_tokens = self._estimate_token_usage(image_data, context)
            estimated_cost = estimated_tokens * best_model.cost_per_token
            estimated_time = self._estimate_response_time(best_model_id, complexity_score)
            
            # Create routing decision
            decision = RoutingDecision(
                selected_model=best_model_id,
                reasoning=best_score_info['reasoning'],
                estimated_cost=estimated_cost,
                estimated_time=estimated_time,
                confidence_threshold=confidence_requirement,
                fallback_models=fallback_models,
                routing_factors=routing_factors
            )
            
            logger.info(f"Routed to model {best_model_id}: {best_score_info['reasoning']}")
            return decision
            
        except Exception as e:
            logger.error(f"Error in model routing: {e}")
            # Fallback to default model
            default_model = 'gemini-pro' if 'gemini-pro' in self.available_models else list(self.available_models.keys())[0]
            return RoutingDecision(
                selected_model=default_model,
                reasoning="Fallback due to routing error",
                estimated_cost=0.05,  # Default estimate
                estimated_time=5.0,   # Default estimate
                confidence_threshold=confidence_requirement or self.default_confidence_threshold,
                fallback_models=[],
                routing_factors={}
            )
    
    def _estimate_image_complexity(self, image_data: bytes, context: Optional[Dict[str, Any]]) -> float:
        """Estimate the complexity of analyzing this image (0-100)."""
        try:
            from PIL import Image
            import io
            
            # Basic image properties
            img = Image.open(io.BytesIO(image_data))
            width, height = img.size
            
            complexity_score = 0.0
            
            # Resolution complexity (0-25 points)
            pixel_count = width * height
            if pixel_count > 2000000:  # > 2MP
                complexity_score += 25
            elif pixel_count > 1000000:  # > 1MP
                complexity_score += 20
            elif pixel_count > 500000:   # > 0.5MP
                complexity_score += 15
            else:
                complexity_score += 10
            
            # Aspect ratio complexity (0-15 points)
            aspect_ratio = max(width, height) / min(width, height)
            if aspect_ratio > 3:  # Very wide/tall images
                complexity_score += 15
            elif aspect_ratio > 2:
                complexity_score += 10
            else:
                complexity_score += 5
            
            # Context complexity (0-30 points)
            if context:
                # Multiple food items or complex dishes
                if context.get('meal_type') in ['buffet', 'mixed', 'platter']:
                    complexity_score += 20
                elif context.get('cuisine_type') in ['fusion', 'molecular', 'gourmet']:
                    complexity_score += 15
                else:
                    complexity_score += 10
                
                # Additional context increases complexity
                if context.get('user_notes') and len(context['user_notes']) > 50:
                    complexity_score += 10
            
            # Content estimation complexity (0-30 points)
            # This is a simplified approach - in practice you might use
            # computer vision techniques to analyze image content
            file_size = len(image_data)
            if file_size > 5 * 1024 * 1024:  # > 5MB
                complexity_score += 30  # Large files often mean complex images
            elif file_size > 2 * 1024 * 1024:  # > 2MB
                complexity_score += 20
            else:
                complexity_score += 10
            
            return min(100.0, complexity_score)
            
        except Exception as e:
            logger.warning(f"Failed to estimate image complexity: {e}")
            return 50.0  # Default medium complexity
    
    def _calculate_routing_factors(
        self,
        complexity_score: float,
        confidence_requirement: float,
        cost_limit: float,
        speed_requirement: str
    ) -> Dict[str, float]:
        """Calculate routing factors for model selection."""
        # Convert speed requirement to numeric weight
        speed_weights = {'fast': 0.8, 'medium': 0.5, 'slow': 0.2}
        speed_weight = speed_weights.get(speed_requirement, 0.5)
        
        return {
            'complexity_score': complexity_score,
            'confidence_requirement': confidence_requirement,
            'cost_limit': cost_limit,
            'speed_weight': speed_weight,
            'accuracy_weight': 1.0 - speed_weight,  # Inverse relationship
            'cost_weight': 0.3 if self.enable_cost_optimization else 0.1
        }
    
    def _score_models(self, routing_factors: Dict[str, float]) -> Dict[str, Dict[str, Any]]:
        """Score available models based on routing factors."""
        model_scores = {}
        
        for model_id, model_config in self.available_models.items():
            try:
                performance = self.performance_stats.get(model_id)
                if not performance:
                    continue
                
                scores = {}
                reasoning_parts = []
                
                # Accuracy score (0-100)
                accuracy_multiplier = {'high': 1.0, 'medium': 0.8, 'low': 0.6}
                base_accuracy = accuracy_multiplier[model_config.accuracy_tier] * 100
                confidence_adjustment = model_config.confidence_boost - 1.0  # Convert to adjustment
                scores['accuracy'] = min(100, base_accuracy + (confidence_adjustment * 20))
                
                if scores['accuracy'] >= routing_factors['confidence_requirement']:
                    reasoning_parts.append(f"meets confidence requirement ({scores['accuracy']:.1f})")
                else:
                    reasoning_parts.append(f"below confidence requirement ({scores['accuracy']:.1f} < {routing_factors['confidence_requirement']})")
                
                # Speed score (0-100)
                speed_multiplier = {'fast': 1.0, 'medium': 0.7, 'slow': 0.4}
                scores['speed'] = speed_multiplier[model_config.speed_tier] * 100
                
                # Cost score (0-100, higher is better/cheaper)
                if routing_factors['cost_limit'] > 0:
                    estimated_cost = self._estimate_token_usage(None, None) * model_config.cost_per_token
                    if estimated_cost <= routing_factors['cost_limit']:
                        scores['cost'] = (1.0 - (estimated_cost / routing_factors['cost_limit'])) * 100
                        reasoning_parts.append(f"within cost limit (${estimated_cost:.4f})")
                    else:
                        scores['cost'] = 0
                        reasoning_parts.append(f"exceeds cost limit (${estimated_cost:.4f})")
                else:
                    scores['cost'] = 50  # Neutral score if no cost limit
                
                # Performance score based on historical data (0-100)
                if performance.total_requests > 0:
                    success_rate = performance.successful_requests / performance.total_requests
                    avg_confidence_score = performance.average_confidence
                    recency_bonus = max(0, 20 - ((time.time() - performance.last_used) / 3600))  # Bonus for recent use
                    
                    scores['performance'] = (success_rate * 50) + (avg_confidence_score * 0.3) + recency_bonus
                    reasoning_parts.append(f"success rate {success_rate:.2%}")
                else:
                    scores['performance'] = 70  # Default for untested models
                    reasoning_parts.append("untested model")
                
                # Complexity handling score (0-100)
                complexity_handling = {
                    'high': {'high': 100, 'medium': 80, 'low': 60},
                    'medium': {'high': 90, 'medium': 100, 'low': 70},
                    'low': {'high': 80, 'medium': 90, 'low': 100}
                }
                
                if routing_factors['complexity_score'] >= 70:
                    complexity_level = 'high'
                elif routing_factors['complexity_score'] >= 40:
                    complexity_level = 'medium'
                else:
                    complexity_level = 'low'
                
                scores['complexity'] = complexity_handling[complexity_level][model_config.accuracy_tier]
                
                # Calculate weighted total score
                weights = {
                    'accuracy': routing_factors['accuracy_weight'] * 0.4,
                    'speed': routing_factors['speed_weight'] * 0.25,
                    'cost': routing_factors['cost_weight'] * 0.2,
                    'performance': 0.1,
                    'complexity': 0.05
                }
                
                total_score = sum(scores[factor] * weight for factor, weight in weights.items())
                
                # Apply penalties
                if scores['cost'] == 0:  # Over budget
                    total_score *= 0.5
                if scores['accuracy'] < routing_factors['confidence_requirement']:
                    total_score *= 0.7
                
                model_scores[model_id] = {
                    'total_score': total_score,
                    'component_scores': scores,
                    'reasoning': '; '.join(reasoning_parts),
                    'weights': weights
                }
                
            except Exception as e:
                logger.warning(f"Failed to score model {model_id}: {e}")
                continue
        
        return model_scores
    
    def _estimate_token_usage(self, image_data: Optional[bytes], context: Optional[Dict[str, Any]]) -> int:
        """Estimate token usage for the request."""
        # Base tokens for image analysis
        base_tokens = 1000
        
        # Additional tokens for context
        context_tokens = 0
        if context:
            context_tokens += len(str(context)) // 4  # Rough approximation
        
        # Additional tokens for complex images
        if image_data and len(image_data) > 2 * 1024 * 1024:  # > 2MB
            base_tokens += 500
        
        return base_tokens + context_tokens
    
    def _estimate_response_time(self, model_id: str, complexity_score: float) -> float:
        """Estimate response time for the model."""
        model_config = self.available_models[model_id]
        performance = self.performance_stats.get(model_id)
        
        # Base time by speed tier
        base_times = {'fast': 2.0, 'medium': 4.0, 'slow': 8.0}
        base_time = base_times[model_config.speed_tier]
        
        # Adjust for complexity
        complexity_multiplier = 1.0 + (complexity_score / 100.0)
        
        # Use historical data if available
        if performance and performance.average_response_time > 0:
            historical_time = performance.average_response_time
            estimated_time = (base_time + historical_time) / 2 * complexity_multiplier
        else:
            estimated_time = base_time * complexity_multiplier
        
        return estimated_time
    
    def execute_routed_analysis(
        self,
        routing_decision: RoutingDecision,
        image_data: bytes,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute analysis using the routed model with fallback support.
        
        Args:
            routing_decision: Routing decision from route_analysis_request
            image_data: Image data for analysis
            context: Analysis context
            
        Returns:
            Analysis result
        """
        start_time = time.time()
        
        # Try primary model
        result = self._try_model_analysis(
            routing_decision.selected_model,
            image_data,
            context,
            routing_decision.confidence_threshold
        )
        
        if result.get('success'):
            response_time = time.time() - start_time
            self._update_model_performance(
                routing_decision.selected_model,
                success=True,
                response_time=response_time,
                confidence=result.get('data', {}).get('confidence', {}).get('overall', 0),
                cost=routing_decision.estimated_cost
            )
            
            result['routing_info'] = {
                'model_used': routing_decision.selected_model,
                'routing_reasoning': routing_decision.reasoning,
                'estimated_cost': routing_decision.estimated_cost,
                'actual_time': response_time
            }
            
            return result
        
        # Try fallback models if enabled
        if self.enable_fallback_routing and routing_decision.fallback_models:
            logger.warning(f"Primary model {routing_decision.selected_model} failed, trying fallbacks")
            
            for fallback_model in routing_decision.fallback_models:
                fallback_result = self._try_model_analysis(
                    fallback_model,
                    image_data,
                    context,
                    routing_decision.confidence_threshold
                )
                
                if fallback_result.get('success'):
                    response_time = time.time() - start_time
                    self._update_model_performance(
                        fallback_model,
                        success=True,
                        response_time=response_time,
                        confidence=fallback_result.get('data', {}).get('confidence', {}).get('overall', 0),
                        cost=routing_decision.estimated_cost * 0.8  # Estimate for fallback
                    )
                    
                    fallback_result['routing_info'] = {
                        'model_used': fallback_model,
                        'routing_reasoning': f"Fallback from {routing_decision.selected_model}",
                        'primary_model_failed': routing_decision.selected_model,
                        'estimated_cost': routing_decision.estimated_cost,
                        'actual_time': response_time
                    }
                    
                    return fallback_result
        
        # All models failed
        response_time = time.time() - start_time
        self._update_model_performance(
            routing_decision.selected_model,
            success=False,
            response_time=response_time,
            confidence=0,
            cost=0
        )
        
        return {
            'success': False,
            'error': 'All available models failed',
            'routing_info': {
                'primary_model': routing_decision.selected_model,
                'fallback_models_tried': routing_decision.fallback_models,
                'total_time': response_time
            }
        }
    
    def _try_model_analysis(
        self,
        model_id: str,
        image_data: bytes,
        context: Optional[Dict[str, Any]],
        confidence_threshold: float
    ) -> Dict[str, Any]:
        """Try analysis with a specific model."""
        try:
            model_config = self.available_models[model_id]
            
            # For now, we only support Gemini models
            # In a full implementation, you'd have different service classes for different models
            if model_id.startswith('gemini'):
                # Create a Gemini service instance configured for this specific model
                service = GeminiService()
                
                # Override model name if different from default
                if model_id == 'gemini-flash':
                    service.model = service.model.__class__('gemini-1.5-flash')
                
                result = service.analyze_food_image(image_data, context)
                
                # Check if confidence meets requirements
                if result.get('success'):
                    confidence = result.get('data', {}).get('confidence', {}).get('overall', 0)
                    if confidence < confidence_threshold:
                        logger.warning(f"Model {model_id} confidence {confidence} below threshold {confidence_threshold}")
                        return {
                            'success': False,
                            'error': f'Confidence {confidence} below required threshold {confidence_threshold}'
                        }
                
                return result
            
            else:
                # Placeholder for other models (OpenAI, etc.)
                return {
                    'success': False,
                    'error': f'Model {model_id} not yet implemented'
                }
                
        except Exception as e:
            logger.error(f"Model {model_id} analysis failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _update_model_performance(
        self,
        model_id: str,
        success: bool,
        response_time: float,
        confidence: float,
        cost: float
    ):
        """Update performance statistics for a model."""
        try:
            if model_id not in self.performance_stats:
                return
            
            performance = self.performance_stats[model_id]
            
            # Update counters
            performance.total_requests += 1
            if success:
                performance.successful_requests += 1
            
            # Update averages
            if performance.total_requests == 1:
                performance.average_response_time = response_time
                performance.average_confidence = confidence
                performance.average_cost = cost
            else:
                # Exponential moving average with alpha = 0.1
                alpha = 0.1
                performance.average_response_time = (alpha * response_time) + ((1 - alpha) * performance.average_response_time)
                if success:  # Only update confidence for successful requests
                    performance.average_confidence = (alpha * confidence) + ((1 - alpha) * performance.average_confidence)
                performance.average_cost = (alpha * cost) + ((1 - alpha) * performance.average_cost)
            
            # Update error rate
            performance.error_rate = 1.0 - (performance.successful_requests / performance.total_requests)
            
            # Update last used timestamp
            performance.last_used = time.time()
            
            # Save updated statistics
            self._save_performance_stats()
            
        except Exception as e:
            logger.error(f"Failed to update performance stats for {model_id}: {e}")
    
    def get_routing_stats(self) -> Dict[str, Any]:
        """Get routing service statistics."""
        try:
            model_stats = {}
            for model_id, performance in self.performance_stats.items():
                model_config = self.available_models.get(model_id)
                if model_config:
                    model_stats[model_id] = {
                        'performance': asdict(performance),
                        'config': asdict(model_config),
                        'health_score': self._calculate_model_health_score(performance),
                        'last_used_ago': (time.time() - performance.last_used) / 3600 if performance.last_used > 0 else None
                    }
            
            return {
                'available_models': len(self.available_models),
                'model_statistics': model_stats,
                'routing_config': {
                    'default_confidence_threshold': self.default_confidence_threshold,
                    'enable_cost_optimization': self.enable_cost_optimization,
                    'max_cost_per_request': self.max_cost_per_request,
                    'enable_fallback_routing': self.enable_fallback_routing
                },
                'total_requests': sum(perf.total_requests for perf in self.performance_stats.values()),
                'overall_success_rate': self._calculate_overall_success_rate()
            }
            
        except Exception as e:
            logger.error(f"Failed to get routing stats: {e}")
            return {'error': str(e)}
    
    def _calculate_model_health_score(self, performance: ModelPerformance) -> float:
        """Calculate a health score for a model (0-100)."""
        if performance.total_requests == 0:
            return 50.0  # Neutral score for untested models
        
        success_rate = performance.successful_requests / performance.total_requests
        confidence_score = performance.average_confidence / 100.0
        recency_score = max(0, 1.0 - ((time.time() - performance.last_used) / (86400 * 7)))  # Decay over 7 days
        
        health_score = (success_rate * 50) + (confidence_score * 30) + (recency_score * 20)
        return min(100.0, health_score)
    
    def _calculate_overall_success_rate(self) -> float:
        """Calculate overall success rate across all models."""
        total_requests = sum(perf.total_requests for perf in self.performance_stats.values())
        total_successes = sum(perf.successful_requests for perf in self.performance_stats.values())
        
        if total_requests == 0:
            return 0.0
        
        return (total_successes / total_requests) * 100


# Global instance
confidence_routing_service = ConfidenceRoutingService()