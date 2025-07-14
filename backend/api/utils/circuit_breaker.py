"""
Circuit breaker pattern implementation for service reliability.

This module provides circuit breaker functionality to prevent cascading failures
and improve system resilience when dealing with external services.
"""

import time
import logging
from enum import Enum
from functools import wraps
from threading import Lock
from typing import Any, Callable, Dict, Optional

logger = logging.getLogger(__name__)


class CircuitBreakerState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Blocking calls due to failures
    HALF_OPEN = "half_open"  # Testing if service is recovered


class CircuitBreakerError(Exception):
    """Exception raised when circuit breaker is open."""
    pass


class CircuitBreaker:
    """
    Circuit breaker implementation for fault tolerance.
    
    The circuit breaker monitors failures and prevents calls to a failing service
    to allow it time to recover, improving overall system stability.
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception,
        name: str = "CircuitBreaker"
    ):
        """
        Initialize circuit breaker.
        
        Args:
            failure_threshold: Number of failures before opening circuit
            recovery_timeout: Seconds to wait before trying again
            expected_exception: Exception type that should trigger the circuit breaker
            name: Name for logging and identification
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.name = name
        
        # State management
        self._state = CircuitBreakerState.CLOSED
        self._failure_count = 0
        self._last_failure_time = None
        self._lock = Lock()
        
        logger.info(f"Circuit breaker '{name}' initialized")
    
    @property
    def state(self) -> CircuitBreakerState:
        """Get current circuit breaker state."""
        return self._state
    
    @property 
    def failure_count(self) -> int:
        """Get current failure count."""
        return self._failure_count
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset."""
        if self._last_failure_time is None:
            return False
        return time.time() - self._last_failure_time >= self.recovery_timeout
    
    def _on_success(self):
        """Handle successful operation."""
        with self._lock:
            self._failure_count = 0
            self._last_failure_time = None
            if self._state != CircuitBreakerState.CLOSED:
                logger.info(f"Circuit breaker '{self.name}' closing - service recovered")
                self._state = CircuitBreakerState.CLOSED
    
    def _on_failure(self, exception: Exception):
        """Handle failed operation."""
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()
            
            if self._failure_count >= self.failure_threshold:
                if self._state != CircuitBreakerState.OPEN:
                    logger.warning(
                        f"Circuit breaker '{self.name}' opening - "
                        f"failure threshold reached ({self._failure_count})"
                    )
                    self._state = CircuitBreakerState.OPEN
            
            logger.debug(
                f"Circuit breaker '{self.name}' failure count: {self._failure_count}"
            )
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function with circuit breaker protection.
        
        Args:
            func: Function to execute
            *args: Function arguments
            **kwargs: Function keyword arguments
            
        Returns:
            Function result
            
        Raises:
            CircuitBreakerError: When circuit is open
            Original exception: When function fails but circuit allows it
        """
        with self._lock:
            current_state = self._state
        
        # If circuit is open, check if we should attempt reset
        if current_state == CircuitBreakerState.OPEN:
            if self._should_attempt_reset():
                with self._lock:
                    self._state = CircuitBreakerState.HALF_OPEN
                logger.info(f"Circuit breaker '{self.name}' entering half-open state")
            else:
                raise CircuitBreakerError(
                    f"Circuit breaker '{self.name}' is open - service unavailable"
                )
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
            
        except self.expected_exception as e:
            self._on_failure(e)
            
            # If we were in half-open state and failed, go back to open
            if current_state == CircuitBreakerState.HALF_OPEN:
                with self._lock:
                    self._state = CircuitBreakerState.OPEN
                logger.warning(
                    f"Circuit breaker '{self.name}' reopening - half-open test failed"
                )
            
            raise
    
    def __call__(self, func: Callable) -> Callable:
        """Decorator implementation."""
        @wraps(func)
        def wrapper(*args, **kwargs):
            return self.call(func, *args, **kwargs)
        return wrapper


class CircuitBreakerRegistry:
    """Registry for managing multiple circuit breakers."""
    
    _instance = None
    _lock = Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._breakers = {}
        return cls._instance
    
    def get_breaker(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception
    ) -> CircuitBreaker:
        """
        Get or create a circuit breaker.
        
        Args:
            name: Circuit breaker name
            failure_threshold: Number of failures before opening
            recovery_timeout: Seconds to wait before retry
            expected_exception: Exception type to monitor
            
        Returns:
            CircuitBreaker instance
        """
        if name not in self._breakers:
            self._breakers[name] = CircuitBreaker(
                failure_threshold=failure_threshold,
                recovery_timeout=recovery_timeout,
                expected_exception=expected_exception,
                name=name
            )
        return self._breakers[name]
    
    def get_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all circuit breakers."""
        return {
            name: {
                "state": breaker.state.value,
                "failure_count": breaker.failure_count,
                "failure_threshold": breaker.failure_threshold,
                "recovery_timeout": breaker.recovery_timeout
            }
            for name, breaker in self._breakers.items()
        }


# Global registry instance
circuit_breaker_registry = CircuitBreakerRegistry()


def circuit_breaker(
    name: str,
    failure_threshold: int = 5,
    recovery_timeout: int = 60,
    expected_exception: type = Exception
):
    """
    Decorator for adding circuit breaker protection to functions.
    
    Args:
        name: Circuit breaker name
        failure_threshold: Number of failures before opening
        recovery_timeout: Seconds to wait before retry
        expected_exception: Exception type to monitor
    """
    def decorator(func: Callable) -> Callable:
        breaker = circuit_breaker_registry.get_breaker(
            name=name,
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
            expected_exception=expected_exception
        )
        return breaker(func)
    return decorator