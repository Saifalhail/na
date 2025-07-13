"""
Database configuration with connection pooling for production.

This module provides optimized database settings for high-performance
production environments with connection pooling, monitoring, and failover.
"""

import os

from django.core.exceptions import ImproperlyConfigured


def get_database_config(environment="production"):
    """
    Get database configuration with connection pooling.

    Args:
        environment: The environment type ('production', 'development', 'testing')

    Returns:
        dict: Database configuration dictionary
    """

    # Base database configuration
    config = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }

    # Validate required settings
    required_settings = ["NAME", "USER", "PASSWORD"]
    for setting in required_settings:
        if not config[setting]:
            raise ImproperlyConfigured(f"Database {setting} is required")

    # Environment-specific optimizations
    if environment == "production":
        config.update(
            {
                "OPTIONS": {
                    # SSL configuration for production
                    "sslmode": "require",
                    # Connection pooling with pgbouncer compatibility
                    "CONN_MAX_AGE": 600,  # 10 minutes
                    "MAX_CONNS": 20,  # Maximum connections per process
                    # Performance optimizations
                    "connect_timeout": 10,
                    "statement_timeout": 30000,  # 30 seconds
                    "idle_in_transaction_session_timeout": 300000,  # 5 minutes
                    # Prepared statements for better performance
                    "DISABLE_SERVER_SIDE_CURSORS": True,
                    # Additional PostgreSQL optimizations
                    "isolation_level": 1,  # READ_COMMITTED
                    "autocommit": True,
                },
                # Django-specific connection settings
                "CONN_MAX_AGE": 600,  # Reuse connections for 10 minutes
                "CONN_HEALTH_CHECKS": True,  # Enable connection health checks
                # Test database configuration (for CI/CD)
                "TEST": {
                    "NAME": "test_" + config["NAME"],
                    "CHARSET": "utf8",
                    "COLLATION": "utf8_general_ci",
                },
            }
        )

    elif environment == "development":
        config.update(
            {
                "OPTIONS": {
                    "connect_timeout": 5,
                    "statement_timeout": 60000,  # 1 minute for development
                },
                "CONN_MAX_AGE": 60,  # Shorter connection reuse for development
            }
        )

    elif environment == "testing":
        config.update(
            {
                "OPTIONS": {
                    "connect_timeout": 2,
                    "statement_timeout": 10000,  # 10 seconds for tests
                },
                "CONN_MAX_AGE": 0,  # No connection reuse for testing
                "TEST": {
                    "NAME": "test_" + config["NAME"],
                    "SERIALIZE": False,  # Faster test execution
                },
            }
        )

    return config


def get_read_replica_config():
    """
    Get read replica database configuration for read-heavy operations.

    Returns:
        dict: Read replica database configuration or None if not configured
    """

    replica_host = os.getenv("DB_READ_REPLICA_HOST")
    if not replica_host:
        return None

    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_READ_REPLICA_NAME", os.getenv("DB_NAME")),
        "USER": os.getenv("DB_READ_REPLICA_USER", os.getenv("DB_USER")),
        "PASSWORD": os.getenv("DB_READ_REPLICA_PASSWORD", os.getenv("DB_PASSWORD")),
        "HOST": replica_host,
        "PORT": os.getenv("DB_READ_REPLICA_PORT", "5432"),
        "OPTIONS": {
            "sslmode": "require",
            "connect_timeout": 5,
            "statement_timeout": 15000,  # Shorter timeout for reads
            "CONN_MAX_AGE": 300,  # 5 minutes for read replicas
        },
        "CONN_MAX_AGE": 300,
        "CONN_HEALTH_CHECKS": True,
    }


def get_databases_config(environment="production"):
    """
    Get complete databases configuration including replicas.

    Args:
        environment: The environment type

    Returns:
        dict: Complete databases configuration
    """

    databases = {"default": get_database_config(environment)}

    # Add read replica if configured
    read_replica = get_read_replica_config()
    if read_replica:
        databases["read_replica"] = read_replica

    return databases


class DatabaseRouter:
    """
    Database router for read/write splitting with read replicas.

    Routes read operations to read replicas when available,
    and write operations to the primary database.
    """

    def db_for_read(self, model, **hints):
        """Suggest the database to read from."""
        # Use read replica for read operations if available
        from django.conf import settings

        if "read_replica" in settings.DATABASES:
            return "read_replica"
        return "default"

    def db_for_write(self, model, **hints):
        """Suggest the database to write to."""
        # Always use primary database for writes
        return "default"

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Ensure that migrations only run on the primary database."""
        return db == "default"

    def allow_relation(self, obj1, obj2, **hints):
        """Allow relations between objects in the same database."""
        db_set = {"default", "read_replica"}
        if obj1._state.db in db_set and obj2._state.db in db_set:
            return True
        return None


# Connection pooling middleware for monitoring
class DatabaseConnectionMonitoringMiddleware:
    """
    Middleware to monitor database connection usage and performance.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        import time

        from django.conf import settings
        from django.db import connections

        # Record start time and connection counts
        start_time = time.time()
        start_queries = {}

        for db_name, connection in connections.all():
            start_queries[db_name] = len(connection.queries)

        # Process request
        response = self.get_response(request)

        # Calculate metrics
        end_time = time.time()
        request_time = end_time - start_time

        # Log connection usage in debug mode
        if settings.DEBUG:
            for db_name, connection in connections.all():
                query_count = len(connection.queries) - start_queries.get(db_name, 0)
                if query_count > 0:
                    print(f"DB {db_name}: {query_count} queries in {request_time:.3f}s")

        # Add performance headers for monitoring
        response["X-DB-Query-Time"] = f"{request_time:.3f}"
        response["X-DB-Query-Count"] = str(
            sum(
                len(conn.queries) - start_queries.get(name, 0)
                for name, conn in connections.all()
            )
        )

        return response


# Health check for database connections
def check_database_health():
    """
    Check health of all database connections.

    Returns:
        dict: Health status for each database connection
    """
    import time

    from django.db import connections

    health_status = {}

    for db_name in connections:
        try:
            start_time = time.time()
            connection = connections[db_name]

            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()

            response_time = int((time.time() - start_time) * 1000)

            health_status[db_name] = {
                "healthy": True,
                "response_time_ms": response_time,
                "connection_count": len(connection.queries),
            }

        except Exception as e:
            health_status[db_name] = {
                "healthy": False,
                "error": str(e),
            }

    return health_status


# Connection pool statistics
def get_connection_pool_stats():
    """
    Get connection pool statistics for monitoring.

    Returns:
        dict: Connection pool statistics
    """
    from django.db import connections

    stats = {}

    for db_name in connections:
        connection = connections[db_name]

        # Get connection info
        stats[db_name] = {
            "database": connection.settings_dict["NAME"],
            "host": connection.settings_dict["HOST"],
            "port": connection.settings_dict["PORT"],
            "conn_max_age": connection.settings_dict.get("CONN_MAX_AGE", 0),
            "queries_executed": len(connection.queries),
            "is_connected": connection.connection is not None,
        }

        # Add connection pool info if available
        if hasattr(connection, "pool"):
            pool = connection.pool
            stats[db_name]["pool"] = {
                "size": getattr(pool, "size", "unknown"),
                "checked_out": getattr(pool, "checked_out", "unknown"),
                "overflow": getattr(pool, "overflow", "unknown"),
            }

    return stats
