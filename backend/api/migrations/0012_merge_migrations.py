# Generated manually to merge conflicting migrations

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0011_add_malware_scan_log"),
        ("api", "0011_synclog_alter_devicetoken_options_and_more"),
    ]

    operations = [
        # This is a merge migration with no operations
    ]
