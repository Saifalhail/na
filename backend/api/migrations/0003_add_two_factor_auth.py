# Generated manually for two-factor authentication

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_add_social_avatar_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='two_factor_enabled',
            field=models.BooleanField(default=False, help_text='Whether two-factor authentication is enabled for this user', verbose_name='2FA enabled'),
        ),
        migrations.CreateModel(
            name='TOTPDevice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Human-readable name for this device', max_length=64, verbose_name='device name')),
                ('confirmed', models.BooleanField(default=False, help_text='Whether this device has been confirmed by entering a valid token', verbose_name='confirmed')),
                ('key', models.CharField(help_text='Base32-encoded secret key', max_length=80, verbose_name='secret key')),
                ('tolerance', models.PositiveSmallIntegerField(default=1, help_text='Number of periods before/after current time to allow', verbose_name='tolerance')),
                ('t0', models.BigIntegerField(default=0, help_text='Unix timestamp of when to start counting time steps', verbose_name='t0')),
                ('step', models.PositiveSmallIntegerField(default=30, help_text='Time step in seconds', verbose_name='step')),
                ('drift', models.SmallIntegerField(default=0, help_text='Current drift between server and device clocks', verbose_name='drift')),
                ('last_t', models.BigIntegerField(default=-1, help_text='Timestamp of the last successfully verified token', verbose_name='last token timestamp')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='updated at')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='totp_devices', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'TOTP device',
                'verbose_name_plural': 'TOTP devices',
                'db_table': 'totp_devices',
            },
        ),
        migrations.CreateModel(
            name='BackupCode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(help_text='Single-use backup code', max_length=16, unique=True, verbose_name='backup code')),
                ('used', models.BooleanField(default=False, help_text='Whether this code has been used', verbose_name='used')),
                ('used_at', models.DateTimeField(blank=True, help_text='When this code was used', null=True, verbose_name='used at')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='created at')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='backup_codes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'backup code',
                'verbose_name_plural': 'backup codes',
                'db_table': 'backup_codes',
            },
        ),
        migrations.AddIndex(
            model_name='backupcode',
            index=models.Index(fields=['user', 'used'], name='backup_code_user_id_used_idx'),
        ),
        migrations.AddIndex(
            model_name='backupcode',
            index=models.Index(fields=['code'], name='backup_code_code_idx'),
        ),
    ]