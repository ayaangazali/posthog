from django.db import migrations

# Greenhouse Harvest v1 is deprecated by the vendor (removal on 2026-08-31); v3 is the current
# version. v1 and v3 share the same object/response shapes, so repinning is a pure version-label
# change with no data or schema transform required.
GREENHOUSE_SOURCE_TYPE = "Greenhouse"
DEPRECATED_VERSION = "v1"
TARGET_VERSION = "v3"


def repin_greenhouse_v1_to_v3(apps, schema_editor):
    ExternalDataSource = apps.get_model("warehouse_sources", "ExternalDataSource")

    # Source-level pin only. Schema-level `ExternalDataSchema.api_version` overrides are
    # user-managed and intentionally left untouched. ExternalDataSource is one row per configured
    # source (thousands, not events-scale), so a single filtered bulk update is quick — no batching.
    # The `api_version="v1"` filter keeps it idempotent (re-runs match nothing) and never touches
    # sources already on another version or pinned to v1 after this migration was written.
    ExternalDataSource.objects.filter(source_type=GREENHOUSE_SOURCE_TYPE, api_version=DEPRECATED_VERSION).update(
        api_version=TARGET_VERSION
    )


class Migration(migrations.Migration):
    dependencies = [
        ("warehouse_sources", "0078_alter_externaldatasource_source_type_and_more"),
    ]

    operations = [
        # Reverse is a no-op: rolling v3 sources back to the deprecated v1 would also drag along
        # sources legitimately created on v3, so we never automatically undo the repin.
        migrations.RunPython(repin_greenhouse_v1_to_v3, migrations.RunPython.noop, elidable=True),
    ]
