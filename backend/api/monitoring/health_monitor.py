"""
Health monitoring system for Nutrition AI backend.
Provides comprehensive monitoring of system health and performance metrics.
"""

import logging
import threading
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import psutil
from django.conf import settings
from django.core.cache import cache
from django.db import connection

logger = logging.getLogger(__name__)


@dataclass
class HealthMetric:
    """Represents a single health metric"""

    name: str
    value: float
    status: str  # 'healthy', 'warning', 'critical'
    timestamp: float
    threshold_warning: Optional[float] = None
    threshold_critical: Optional[float] = None


@dataclass
class HealthReport:
    """Comprehensive health report"""

    overall_status: str
    timestamp: float
    metrics: Dict[str, HealthMetric]
    alerts: List[str]


class HealthMonitor:
    """
    Monitors system health and generates alerts.
    Can be run as a background task or called on-demand.
    """

    def __init__(self):
        self.metrics_cache_key = "health_monitor_metrics"
        self.alerts_cache_key = "health_monitor_alerts"
        self.cache_timeout = 300  # 5 minutes

        # Default thresholds
        self.thresholds = {
            "cpu_percent": {"warning": 70, "critical": 85},
            "memory_percent": {"warning": 75, "critical": 90},
            "disk_percent": {"warning": 80, "critical": 95},
            "response_time_api": {"warning": 1.0, "critical": 2.0},
            "response_time_db": {"warning": 0.1, "critical": 0.5},
            "active_connections": {"warning": 80, "critical": 95},
        }

    def collect_metrics(self) -> Dict[str, HealthMetric]:
        """Collect all health metrics"""
        metrics = {}
        timestamp = time.time()

        # System metrics
        metrics.update(self._collect_system_metrics(timestamp))

        # Database metrics
        metrics.update(self._collect_database_metrics(timestamp))

        # Cache metrics
        metrics.update(self._collect_cache_metrics(timestamp))

        # Application metrics
        metrics.update(self._collect_application_metrics(timestamp))

        return metrics

    def _collect_system_metrics(self, timestamp: float) -> Dict[str, HealthMetric]:
        """Collect system resource metrics"""
        metrics = {}

        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            metrics["cpu_percent"] = HealthMetric(
                name="CPU Usage",
                value=cpu_percent,
                status=self._get_status(cpu_percent, "cpu_percent"),
                timestamp=timestamp,
                threshold_warning=self.thresholds["cpu_percent"]["warning"],
                threshold_critical=self.thresholds["cpu_percent"]["critical"],
            )

            # Memory usage
            memory = psutil.virtual_memory()
            metrics["memory_percent"] = HealthMetric(
                name="Memory Usage",
                value=memory.percent,
                status=self._get_status(memory.percent, "memory_percent"),
                timestamp=timestamp,
                threshold_warning=self.thresholds["memory_percent"]["warning"],
                threshold_critical=self.thresholds["memory_percent"]["critical"],
            )

            # Disk usage
            disk = psutil.disk_usage("/")
            metrics["disk_percent"] = HealthMetric(
                name="Disk Usage",
                value=disk.percent,
                status=self._get_status(disk.percent, "disk_percent"),
                timestamp=timestamp,
                threshold_warning=self.thresholds["disk_percent"]["warning"],
                threshold_critical=self.thresholds["disk_percent"]["critical"],
            )

            # Network connections
            connections = len(psutil.net_connections())
            metrics["network_connections"] = HealthMetric(
                name="Network Connections",
                value=connections,
                status="healthy",  # No specific thresholds for now
                timestamp=timestamp,
            )

        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")

        return metrics

    def _collect_database_metrics(self, timestamp: float) -> Dict[str, HealthMetric]:
        """Collect database performance metrics"""
        metrics = {}

        try:
            start_time = time.time()

            # Test database response time
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()

            db_response_time = time.time() - start_time

            metrics["response_time_db"] = HealthMetric(
                name="Database Response Time",
                value=db_response_time,
                status=self._get_status(db_response_time, "response_time_db"),
                timestamp=timestamp,
                threshold_warning=self.thresholds["response_time_db"]["warning"],
                threshold_critical=self.thresholds["response_time_db"]["critical"],
            )

            # Database connections
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT count(*) 
                    FROM pg_stat_activity 
                    WHERE state = 'active'
                """
                )
                active_connections = cursor.fetchone()[0]

            metrics["db_active_connections"] = HealthMetric(
                name="Active DB Connections",
                value=active_connections,
                status="healthy" if active_connections < 20 else "warning",
                timestamp=timestamp,
            )

        except Exception as e:
            logger.error(f"Error collecting database metrics: {e}")
            metrics["database_error"] = HealthMetric(
                name="Database Error", value=1, status="critical", timestamp=timestamp
            )

        return metrics

    def _collect_cache_metrics(self, timestamp: float) -> Dict[str, HealthMetric]:
        """Collect cache performance metrics"""
        metrics = {}

        try:
            start_time = time.time()

            # Test cache response time
            test_key = f"health_test_{timestamp}"
            cache.set(test_key, "test", timeout=60)
            value = cache.get(test_key)
            cache.delete(test_key)

            cache_response_time = time.time() - start_time
            cache_working = value == "test"

            metrics["response_time_cache"] = HealthMetric(
                name="Cache Response Time",
                value=cache_response_time,
                status=(
                    "healthy"
                    if cache_working and cache_response_time < 0.1
                    else "warning"
                ),
                timestamp=timestamp,
            )

            metrics["cache_working"] = HealthMetric(
                name="Cache Working",
                value=1 if cache_working else 0,
                status="healthy" if cache_working else "critical",
                timestamp=timestamp,
            )

        except Exception as e:
            logger.error(f"Error collecting cache metrics: {e}")
            metrics["cache_error"] = HealthMetric(
                name="Cache Error", value=1, status="critical", timestamp=timestamp
            )

        return metrics

    def _collect_application_metrics(self, timestamp: float) -> Dict[str, HealthMetric]:
        """Collect application-specific metrics"""
        metrics = {}

        try:
            # Check if critical services are running
            from api.services.gemini_service import GeminiService

            gemini_service = GeminiService()
            ai_healthy = gemini_service.health_check()

            metrics["ai_service"] = HealthMetric(
                name="AI Service Health",
                value=1 if ai_healthy else 0,
                status="healthy" if ai_healthy else "critical",
                timestamp=timestamp,
            )

        except Exception as e:
            logger.error(f"Error collecting application metrics: {e}")

        return metrics

    def _get_status(self, value: float, metric_type: str) -> str:
        """Determine status based on thresholds"""
        if metric_type not in self.thresholds:
            return "healthy"

        thresholds = self.thresholds[metric_type]

        if value >= thresholds["critical"]:
            return "critical"
        elif value >= thresholds["warning"]:
            return "warning"
        else:
            return "healthy"

    def generate_report(self) -> HealthReport:
        """Generate comprehensive health report"""
        metrics = self.collect_metrics()
        alerts = self._generate_alerts(metrics)

        # Determine overall status
        overall_status = "healthy"
        for metric in metrics.values():
            if metric.status == "critical":
                overall_status = "critical"
                break
            elif metric.status == "warning" and overall_status != "critical":
                overall_status = "warning"

        report = HealthReport(
            overall_status=overall_status,
            timestamp=time.time(),
            metrics=metrics,
            alerts=alerts,
        )

        # Cache the report
        cache.set(self.metrics_cache_key, asdict(report), timeout=self.cache_timeout)

        return report

    def _generate_alerts(self, metrics: Dict[str, HealthMetric]) -> List[str]:
        """Generate alerts based on metric status"""
        alerts = []

        for metric in metrics.values():
            if metric.status == "critical":
                alerts.append(f"CRITICAL: {metric.name} is at {metric.value}")
            elif metric.status == "warning":
                alerts.append(f"WARNING: {metric.name} is at {metric.value}")

        return alerts

    def get_cached_report(self) -> Optional[HealthReport]:
        """Get cached health report if available"""
        cached_data = cache.get(self.metrics_cache_key)
        if cached_data:
            return HealthReport(**cached_data)
        return None

    def is_healthy(self) -> bool:
        """Quick health check"""
        try:
            report = self.get_cached_report()
            if not report:
                report = self.generate_report()

            return report.overall_status in ["healthy", "warning"]
        except Exception as e:
            logger.error(f"Error checking health: {e}")
            return False

    def start_monitoring(self, interval: int = 60):
        """Start continuous monitoring in background"""

        def monitor_loop():
            while True:
                try:
                    report = self.generate_report()

                    # Log critical alerts
                    for alert in report.alerts:
                        if "CRITICAL" in alert:
                            logger.critical(alert)
                        elif "WARNING" in alert:
                            logger.warning(alert)

                    time.sleep(interval)

                except Exception as e:
                    logger.error(f"Error in monitoring loop: {e}")
                    time.sleep(interval)

        monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
        monitor_thread.start()
        logger.info(f"Health monitoring started with {interval}s interval")


# Global health monitor instance
health_monitor = HealthMonitor()
