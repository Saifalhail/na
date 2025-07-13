# Generated migration for performance optimization indexes

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        (
            "api",
            "0013_rename_idx_malware_scan_hash_malware_sca_file_ha_3d2038_idx_and_more",
        ),
    ]

    operations = [
        # Temporarily disabled - will add performance indexes after schema stabilizes
        # migrations.RunSQL("SELECT 1;", reverse_sql="SELECT 1;"),
    ]
