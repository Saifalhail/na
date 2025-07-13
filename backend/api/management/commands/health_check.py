"""
Django management command for comprehensive health checks.
Usage: python manage.py health_check [--component database,redis,ai,celery]
"""

import json
import logging
import time

import psutil
import redis
from celery import Celery
from django.conf import settings
from django.core.cache import cache
from django.core.management.base import BaseCommand
from django.db import connection
from django.test import TestCase

from api.services.gemini_service import GeminiService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Perform comprehensive health checks on all system components"

    def add_arguments(self, parser):
        parser.add_argument(
            "--component",
            type=str,
            help="Comma-separated list of components to check (database,redis,ai,celery,system)",
            default="database,redis,ai,celery,system",
        )
        parser.add_argument(
            "--json", action="store_true", help="Output results in JSON format"
        )
        parser.add_argument(
            "--timeout", type=int, default=30, help="Timeout for each check in seconds"
        )

    def handle(self, *args, **options):
        components = options["component"].split(",")
        timeout = options["timeout"]
        results = {}

        for component in components:
            component = component.strip()
            start_time = time.time()

            try:
                if component == "database":
                    results["database"] = self.check_database(timeout)
                elif component == "redis":
                    results["redis"] = self.check_redis(timeout)
                elif component == "ai":
                    results["ai"] = self.check_ai_service(timeout)
                elif component == "celery":
                    results["celery"] = self.check_celery(timeout)
                elif component == "system":
                    results["system"] = self.check_system_resources()
                else:
                    results[component] = {
                        "status": "error",
                        "message": f"Unknown component: {component}",
                    }
            except Exception as e:
                results[component] = {
                    "status": "error",
                    "message": str(e),
                    "response_time": time.time() - start_time,
                }

        # Calculate overall health
        all_healthy = all(
            result.get("status") == "healthy" for result in results.values()
        )

        overall_result = {
            "status": "healthy" if all_healthy else "unhealthy",
            "timestamp": time.time(),
            "components": results,
        }

        if options["json"]:
            self.stdout.write(json.dumps(overall_result, indent=2))
        else:
            self.print_human_readable(overall_result)

        # Exit with appropriate code
        exit_code = 0 if all_healthy else 1
        return exit_code

    def check_database(self, timeout):
        """Check database connectivity and performance"""
        start_time = time.time()

        try:
            # Test basic connectivity
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                row = cursor.fetchone()

            # Test write operation
            with connection.cursor() as cursor:
                cursor.execute("CREATE TEMP TABLE health_check_temp (id INTEGER)")
                cursor.execute("INSERT INTO health_check_temp VALUES (1)")
                cursor.execute("SELECT COUNT(*) FROM health_check_temp")
                count = cursor.fetchone()[0]

            response_time = time.time() - start_time

            return {
                "status": "healthy",
                "response_time": response_time,
                "database": settings.DATABASES["default"]["NAME"],
                "engine": settings.DATABASES["default"]["ENGINE"],
            }

        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "response_time": time.time() - start_time,
            }

    def check_redis(self, timeout):
        """Check Redis connectivity and performance"""
        start_time = time.time()

        try:
            # Test cache connectivity
            test_key = "health_check_test"
            test_value = "test_value"

            cache.set(test_key, test_value, timeout=60)
            retrieved_value = cache.get(test_key)
            cache.delete(test_key)

            if retrieved_value != test_value:
                raise Exception("Cache value mismatch")

            # Test Redis directly if available
            redis_info = {}
            try:
                from django_redis import get_redis_connection

                redis_conn = get_redis_connection("default")
                redis_info = redis_conn.info()
            except:
                pass

            response_time = time.time() - start_time

            return {
                "status": "healthy",
                "response_time": response_time,
                "redis_version": redis_info.get("redis_version", "unknown"),
                "connected_clients": redis_info.get("connected_clients", "unknown"),
            }

        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "response_time": time.time() - start_time,
            }

    def check_ai_service(self, timeout):
        """Check AI service connectivity"""
        start_time = time.time()

        try:
            gemini_service = GeminiService()
            is_healthy = gemini_service.health_check()

            response_time = time.time() - start_time

            return {
                "status": "healthy" if is_healthy else "unhealthy",
                "response_time": response_time,
                "service": "Google Gemini Pro Vision",
                "api_key_configured": bool(settings.GEMINI_API_KEY),
            }

        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "response_time": time.time() - start_time,
            }

    def check_celery(self, timeout):
        """Check Celery worker status"""
        start_time = time.time()

        try:
            # Try to get Celery app
            from core.celery import app as celery_app

            # Check if workers are available
            inspect = celery_app.control.inspect()
            stats = inspect.stats()
            active = inspect.active()

            if not stats:
                raise Exception("No Celery workers found")

            worker_count = len(stats)
            total_active_tasks = (
                sum(len(tasks) for tasks in active.values()) if active else 0
            )

            response_time = time.time() - start_time

            return {
                "status": "healthy",
                "response_time": response_time,
                "worker_count": worker_count,
                "active_tasks": total_active_tasks,
                "workers": list(stats.keys()) if stats else [],
            }

        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "response_time": time.time() - start_time,
            }

    def check_system_resources(self):
        """Check system resource usage"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)

            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent

            # Disk usage
            disk = psutil.disk_usage("/")
            disk_percent = disk.percent

            # Determine health based on thresholds
            cpu_healthy = cpu_percent < 80
            memory_healthy = memory_percent < 80
            disk_healthy = disk_percent < 80

            overall_healthy = cpu_healthy and memory_healthy and disk_healthy

            return {
                "status": "healthy" if overall_healthy else "warning",
                "cpu_percent": cpu_percent,
                "memory_percent": memory_percent,
                "disk_percent": disk_percent,
                "cpu_healthy": cpu_healthy,
                "memory_healthy": memory_healthy,
                "disk_healthy": disk_healthy,
            }

        except Exception as e:
            return {"status": "error", "error": str(e)}

    def print_human_readable(self, result):
        """Print results in human-readable format"""
        status_emoji = "✅" if result["status"] == "healthy" else "❌"
        self.stdout.write(
            f"\n{status_emoji} Overall Health: {result['status'].upper()}"
        )
        self.stdout.write(f"Timestamp: {time.ctime(result['timestamp'])}\n")

        for component, details in result["components"].items():
            component_emoji = "✅" if details.get("status") == "healthy" else "❌"
            self.stdout.write(f"{component_emoji} {component.title()}:")

            for key, value in details.items():
                if key != "status":
                    self.stdout.write(f"  {key}: {value}")
            self.stdout.write("")
