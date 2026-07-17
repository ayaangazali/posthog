from django.db.models.signals import post_save
from django.dispatch import receiver

from posthog.models import Team

from products.error_tracking.backend.models import sync_autocapture_opt_in


@receiver(post_save, sender=Team)
def mirror_autocapture_opt_in_to_settings(sender, instance: Team, update_fields=None, **kwargs) -> None:
    # Skip saves that list update_fields without this one; full saves fall through.
    if update_fields is not None and "autocapture_exceptions_opt_in" not in update_fields:
        return
    sync_autocapture_opt_in(team_id=instance.pk, opt_in=instance.autocapture_exceptions_opt_in)
