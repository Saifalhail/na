"""
Cache locking utilities to prevent cache stampede conditions.

This module provides distributed locking mechanisms to prevent multiple
processes from regenerating the same expensive cached data simultaneously.
"""

import logging
import time
from contextlib import contextmanager
from typing import Any, Callable, Optional

from django.core.cache import cache

logger = logging.getLogger(__name__)


class CacheLockError(Exception):
    """Exception raised when cache locking fails."""
    pass


class CacheLock:
    """
    Distributed cache lock implementation using Django cache backend.
    
    Prevents cache stampede by ensuring only one process generates
    expensive cached data at a time.
    """
    
    def __init__(
        self,
        key: str,
        timeout: int = 300,  # 5 minutes default
        retry_delay: float = 0.1,
        max_retries: int = 50
    ):
        """
        Initialize cache lock.
        
        Args:
            key: Unique identifier for the lock
            timeout: Maximum time to hold the lock (seconds)
            retry_delay: Time to wait between lock acquisition attempts
            max_retries: Maximum number of retry attempts
        """
        self.key = f"cache_lock:{key}"
        self.timeout = timeout
        self.retry_delay = retry_delay
        self.max_retries = max_retries
        self._acquired = False
    
    def acquire(self, blocking: bool = True) -> bool:
        """
        Acquire the cache lock.
        
        Args:
            blocking: Whether to block until lock is acquired
            
        Returns:
            True if lock was acquired, False otherwise
        """
        if self._acquired:
            return True
            
        # Try to set the lock atomically
        acquired = cache.add(self.key, time.time(), timeout=self.timeout)
        
        if acquired:
            self._acquired = True
            logger.debug(f"Cache lock acquired: {self.key}")
            return True
        
        if not blocking:
            return False
        
        # Wait for lock to be released
        for attempt in range(self.max_retries):
            time.sleep(self.retry_delay)
            
            # Check if lock has expired or been released
            acquired = cache.add(self.key, time.time(), timeout=self.timeout)
            if acquired:
                self._acquired = True
                logger.debug(f"Cache lock acquired after {attempt + 1} attempts: {self.key}")
                return True
        
        raise CacheLockError(f"Failed to acquire cache lock after {self.max_retries} attempts: {self.key}")
    
    def release(self):
        """Release the cache lock."""
        if self._acquired:
            cache.delete(self.key)
            self._acquired = False
            logger.debug(f"Cache lock released: {self.key}")
    
    def is_locked(self) -> bool:
        """Check if the lock is currently held by any process."""
        return cache.get(self.key) is not None
    
    def __enter__(self):
        """Context manager entry."""
        self.acquire()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.release()


@contextmanager
def cache_lock(key: str, timeout: int = 300, retry_delay: float = 0.1, max_retries: int = 50):
    """
    Context manager for cache locking.
    
    Args:
        key: Unique identifier for the lock
        timeout: Maximum time to hold the lock (seconds)
        retry_delay: Time to wait between lock acquisition attempts
        max_retries: Maximum number of retry attempts
        
    Yields:
        CacheLock instance
    """
    lock = CacheLock(key, timeout, retry_delay, max_retries)
    try:
        lock.acquire()
        yield lock
    finally:
        lock.release()


def with_cache_lock(
    key_func: Callable = None,
    timeout: int = 300,
    retry_delay: float = 0.1,
    max_retries: int = 50,
    use_stale_on_lock: bool = True
):
    """
    Decorator that adds cache locking to prevent stampede conditions.
    
    Args:
        key_func: Function to generate lock key from arguments
        timeout: Maximum time to hold the lock
        retry_delay: Time to wait between lock acquisition attempts  
        max_retries: Maximum number of retry attempts
        use_stale_on_lock: Whether to return stale cache data if lock can't be acquired
        
    Example:
        @with_cache_lock(key_func=lambda *args: f"expensive_calc_{args[0]}")
        def expensive_calculation(user_id):
            # This will be protected by cache lock
            return perform_expensive_operation(user_id)
    """
    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            # Generate lock key
            if key_func:
                lock_key = key_func(*args, **kwargs)
            else:
                # Default key based on function name and arguments
                lock_key = f"{func.__name__}_{hash(str(args) + str(sorted(kwargs.items())))}"
            
            # Try to acquire lock
            lock = CacheLock(lock_key, timeout, retry_delay, max_retries)
            
            try:
                if lock.acquire(blocking=False):
                    # We got the lock, execute the function
                    result = func(*args, **kwargs)
                    lock.release()
                    return result
                else:
                    # Lock is held by another process
                    if use_stale_on_lock:
                        # Try to get stale data from cache
                        cache_key = f"stale_data:{lock_key}"
                        stale_data = cache.get(cache_key)
                        if stale_data is not None:
                            logger.info(f"Returning stale cache data for {lock_key}")
                            return stale_data
                    
                    # Either no stale data or use_stale_on_lock is False
                    # Wait for lock and execute
                    lock.acquire(blocking=True)
                    result = func(*args, **kwargs)
                    
                    # Store result as stale data for future use
                    if use_stale_on_lock:
                        stale_cache_key = f"stale_data:{lock_key}"
                        cache.set(stale_cache_key, result, timeout=timeout * 2)
                    
                    lock.release()
                    return result
                    
            except CacheLockError as e:
                logger.error(f"Cache lock error: {e}")
                # If we can't get the lock and no stale data, execute anyway
                logger.warning(f"Executing {func.__name__} without lock due to timeout")
                return func(*args, **kwargs)
            except Exception as e:
                # Make sure to release lock on any error
                lock.release()
                raise
                
        return wrapper
    return decorator


class CacheStampedeProtection:
    """
    Advanced cache stampede protection with multiple strategies.
    """
    
    @staticmethod
    def get_or_set_with_lock(
        cache_key: str,
        generator_func: Callable,
        timeout: int = 3600,
        lock_timeout: int = 300,
        stale_timeout: int = 7200
    ) -> Any:
        """
        Get cached value or generate it with stampede protection.
        
        Args:
            cache_key: Cache key to use
            generator_func: Function to generate the value if not cached
            timeout: Cache timeout for fresh data
            lock_timeout: Lock timeout
            stale_timeout: Timeout for stale data cache
            
        Returns:
            Cached or newly generated value
        """
        # Try to get fresh data from cache
        value = cache.get(cache_key)
        if value is not None:
            return value
        
        # No fresh data, try with lock
        lock_key = f"gen_lock:{cache_key}"
        stale_key = f"stale:{cache_key}"
        
        with cache_lock(lock_key, timeout=lock_timeout) as lock:
            # Double-check cache after acquiring lock
            value = cache.get(cache_key)
            if value is not None:
                return value
            
            # Generate new value
            try:
                value = generator_func()
                
                # Store fresh data
                cache.set(cache_key, value, timeout=timeout)
                
                # Store stale copy with longer timeout
                cache.set(stale_key, value, timeout=stale_timeout)
                
                logger.debug(f"Generated and cached new value for {cache_key}")
                return value
                
            except Exception as e:
                # If generation fails, try to return stale data
                stale_value = cache.get(stale_key)
                if stale_value is not None:
                    logger.warning(f"Returning stale data for {cache_key} due to generation error: {e}")
                    return stale_value
                raise
    
    @staticmethod
    def warm_cache_with_lock(
        cache_key: str,
        generator_func: Callable,
        timeout: int = 3600,
        lock_timeout: int = 300
    ) -> bool:
        """
        Warm cache in background with lock protection.
        
        Args:
            cache_key: Cache key to warm
            generator_func: Function to generate the value
            timeout: Cache timeout
            lock_timeout: Lock timeout
            
        Returns:
            True if cache was warmed, False if already fresh or locked
        """
        # Check if cache is already fresh
        if cache.get(cache_key) is not None:
            return False
        
        lock_key = f"warm_lock:{cache_key}"
        lock = CacheLock(lock_key, timeout=lock_timeout)
        
        if not lock.acquire(blocking=False):
            # Another process is already warming this cache
            return False
        
        try:
            # Double-check after acquiring lock
            if cache.get(cache_key) is not None:
                return False
            
            # Generate and cache value
            value = generator_func()
            cache.set(cache_key, value, timeout=timeout)
            
            logger.info(f"Successfully warmed cache for {cache_key}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to warm cache for {cache_key}: {e}")
            return False
        finally:
            lock.release()