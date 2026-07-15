from posthog.test.base import BaseTest

from parameterized import parameterized

from posthog.models import Team

from products.error_tracking.backend.models import ErrorTrackingSettings, autocapture_exceptions_enabled

NO_ROW = object()


class TestAutocaptureExceptionsEnabled(BaseTest):
    def _team(self, *, team_value: bool | None, ets_value: object) -> Team:
        # Build a team with independent Team and ErrorTrackingSettings values. Create the team
        # opted-out so the signal writes no row, then set each side directly (queryset update
        # bypasses the signal) so the two can disagree — which is what the accessor arbitrates.
        team = Team.objects.create(organization=self.organization)
        Team.objects.filter(id=team.id).update(autocapture_exceptions_opt_in=team_value)
        if ets_value is not NO_ROW:
            ErrorTrackingSettings.objects.update_or_create(
                team_id=team.id, defaults={"autocapture_exceptions_opt_in": ets_value}
            )
        team.refresh_from_db()
        return team

    @parameterized.expand(
        [
            # The mirror is the source of truth and wins over a disagreeing Team value.
            ("mirror_true_wins_over_team_false", False, True, True),
            ("mirror_false_wins_over_team_true", True, False, False),
            # No mirror row yet (historical team pre-backfill): fall back to Team so it stays correct.
            ("fallback_to_team_true_when_no_row", True, NO_ROW, True),
            ("fallback_to_team_false_when_no_row", False, NO_ROW, False),
        ]
    )
    def test_reads_mirror_with_team_fallback(
        self, _name: str, team_value: bool | None, ets_value: object, expected: bool
    ):
        team = self._team(team_value=team_value, ets_value=ets_value)

        assert autocapture_exceptions_enabled(team) is expected
