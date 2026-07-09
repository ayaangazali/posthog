from posthog.test.base import APIBaseTest, ClickhouseTestMixin

from posthog.hogql.context import HogQLContext
from posthog.hogql.database.database import Database
from posthog.hogql.query import execute_hogql_query

from posthog.models.team import Team

from products.data_catalog.backend.logic.metrics import upsert_metric
from products.data_catalog.backend.models.metric import Metric
from products.product_analytics.backend.models.insight import Insight

_HOGQL = {"kind": "HogQLQuery", "query": "select count() from events"}


class TestInformationSchemaMetrics(ClickhouseTestMixin, APIBaseTest):
    def _rows(self, where: str = "") -> dict:
        response = execute_hogql_query(
            f"SELECT name, description, status, is_drifted, definition_kind FROM system.information_schema.metrics {where}",
            team=self.team,
        )
        return {row[0]: row for row in response.results}

    def test_metric_is_discoverable_via_ilike(self) -> None:
        upsert_metric(
            team=self.team, user=self.user, name="mrr", description="Monthly recurring revenue", definition=_HOGQL
        )
        rows = self._rows("WHERE name ILIKE '%mrr%'")
        assert "mrr" in rows
        assert rows["mrr"][1] == "Monthly recurring revenue"
        assert rows["mrr"][2] == "proposed"
        assert rows["mrr"][4] == "HogQLQuery"

    def test_is_drifted_reflects_source_insight(self) -> None:
        insight = Insight.objects.create(team=self.team, created_by=self.user, query=_HOGQL)
        upsert_metric(
            team=self.team, user=self.user, name="active", description="d", source_insight_short_id=insight.short_id
        )
        assert self._rows("WHERE name = 'active'")["active"][3] in (False, 0)

        Insight.objects.filter(pk=insight.pk).update(
            query={"kind": "HogQLQuery", "query": "select count() from persons"}
        )
        assert self._rows("WHERE name = 'active'")["active"][3] in (True, 1)

    def test_team_isolation(self) -> None:
        other = Team.objects.create_with_data(organization=self.organization, initiating_user=self.user, name="Other")
        upsert_metric(team=other, user=self.user, name="theirs", description="d", definition=_HOGQL)
        assert "theirs" not in self._rows()

    def test_metric_hidden_when_referenced_table_denied(self) -> None:
        allowed = upsert_metric(
            team=self.team, user=self.user, name="allowed_metric", description="d", definition=_HOGQL
        )
        denied = upsert_metric(team=self.team, user=self.user, name="denied_metric", description="d", definition=_HOGQL)
        Metric.objects.for_team(self.team.pk).filter(pk=allowed.pk).update(referenced_table_names=["allowed_source"])
        Metric.objects.for_team(self.team.pk).filter(pk=denied.pk).update(referenced_table_names=["denied_source"])

        database = Database.create_for(team=self.team, user=self.user)
        database._denied_tables.add("denied_source")
        context = HogQLContext(team=self.team, team_id=self.team.pk, database=database)

        response = execute_hogql_query(
            "SELECT name FROM system.information_schema.metrics", team=self.team, context=context
        )
        names = {row[0] for row in response.results}
        assert "allowed_metric" in names
        assert "denied_metric" not in names
