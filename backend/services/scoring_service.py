from services.anomaly_service import (
    AnomalyService,
)


class ScoringService:
    def __init__(self):
        self.anomaly_service = (
            AnomalyService()
        )

    def _calculate_health_score(
        self,
        anomaly_percentage: float,
    ) -> int:
        score = max(
            0,
            round(
                100 - (
                    anomaly_percentage * 3
                )
            ),
        )

        return score

    def _get_status(
        self,
        score: int,
    ) -> str:
        if score >= 80:
            return "healthy"

        if score >= 50:
            return "warning"

        return "critical"

    def get_hvac_scores(self):
        anomaly_results = (
            self.anomaly_service
            .detect_all_units()
        )

        results = []

        for unit in anomaly_results:
            score = (
                self._calculate_health_score(
                    unit[
                        "anomaly_percentage"
                    ]
                )
            )

            status = self._get_status(
                score
            )

            results.append(
                {
                    "unit_id":
                        unit["unit_id"],

                    "health_score":
                        score,

                    "status":
                        status,

                    "anomaly_percentage":
                        unit[
                            "anomaly_percentage"
                        ],
                }
            )

        return results