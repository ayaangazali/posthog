from posthog.api.routing import RouterRegistry

from products.messaging.backend.api.message_categories import MessageCategoryViewSet
from products.messaging.backend.api.message_preferences import MessagePreferencesViewSet
from products.messaging.backend.api.message_templates import MessageTemplatesViewSet


def register_routes(routers: RouterRegistry) -> None:
    routers.projects.register(
        r"messaging_templates", MessageTemplatesViewSet, "project_messaging_templates", ["team_id"]
    )
    routers.projects.register(
        r"messaging_categories", MessageCategoryViewSet, "project_messaging_categories", ["team_id"]
    )
    routers.projects.register(
        r"messaging_preferences", MessagePreferencesViewSet, "project_messaging_preferences", ["team_id"]
    )
