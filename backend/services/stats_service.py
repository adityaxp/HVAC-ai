from collections import defaultdict

from sqlalchemy import text

from db.database import SessionLocal

from services.scoring_service import (
    ScoringService,
)

from services.alert_service import (
    AlertService,
)


class StatsService:
    def __init__(self):
        self.scoring_service = (
            ScoringService()
        )

        self.alert_service = (
            AlertService()
        )

    def get_overview_stats(
        self,
    ):
        db = SessionLocal()

        try:
            hvac_scores = (
                self.scoring_service
                .get_hvac_scores()
            )

            scores = []

            critical_units = 0

            for unit in hvac_scores:
                scores.append(
                    unit[
                        "health_score"
                    ]
                )

                if (
                    unit["status"]
                    == "critical"
                ):
                    critical_units += 1

            average_health = round(
                sum(scores)
                / len(scores),
                1,
            )

            active_alerts = (
                self.alert_service
                .get_active_alert_count()
            )

            rows = db.execute(
                text(
                    """
                    SELECT
                        timestamp,
                        vibration
                    FROM sensor_readings
                    ORDER BY timestamp ASC
                    """
                )
            ).mappings().all()

            grouped = defaultdict(
                float
            )

            days = [
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
                "Sun",
            ]

            for index, row in enumerate(rows):
                vibration = row[
                    "vibration"
                ]

                simulated_day = days[
                    index % 7
                ]

                # Use vibration intensity
                # to simulate anomaly activity

                grouped[
                    simulated_day
                ] += (
                    vibration * 6
                )

            trend = []

            for day in days:
                trend.append(
                    {
                        "day": day,
                        "count": round(
                            grouped.get(
                                day,
                                0,
                            )
                        ),
                    }
                )

            return {
                "total_units":
                    len(hvac_scores),

                "healthy_units":
                    len(hvac_scores)
                    - critical_units,

                "critical_units":
                    critical_units,

                "active_alerts":
                    active_alerts,

                "average_health_score":
                    average_health,

                "anomaly_trend":
                    trend,
            }

        finally:
            db.close()