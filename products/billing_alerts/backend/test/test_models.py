from decimal import Decimal

from products.billing_alerts.backend.models import BillingAlertEvent
from products.billing_alerts.backend.presentation.serializers import BillingAlertEventSerializer


def test_relative_delta_percentage_supports_full_value_range() -> None:
    field = BillingAlertEvent._meta.get_field("relative_delta_percentage")

    assert field.max_digits == 28
    assert field.decimal_places == 6


def test_relative_delta_percentage_serializer_supports_model_value_range() -> None:
    event = BillingAlertEvent(
        metric="spend",
        relative_delta_percentage=Decimal("9999999999999999999999.999999"),
        reason="Large relative change",
    )

    data = BillingAlertEventSerializer(event).data

    assert data["relative_delta_percentage"] == "9999999999999999999999.999999"
