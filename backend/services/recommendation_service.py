from services.anomaly_service import (
    AnomalyService,
)


class RecommendationService:
    def __init__(self):
        self.anomaly_service = (
            AnomalyService()
        )

    def _build_recommendation(
        self,
        anomalies,
        unit_id: str,
    ):
        anomaly_count = len(anomalies)

        vibration_count = (
            anomalies["vibration"] > 0.15
        ).sum()

        airflow_count = (
            anomalies["airflow"] < 250
        ).sum()

        power_count = (
            anomalies["power"] > 8
        ).sum()

        temp_count = (
            anomalies["temp"] > 25
        ).sum()

        all_data = (
            self.anomaly_service
            .get_all_anomaly_records()
        )

        unit_data = all_data[
            all_data["unit_id"] == unit_id
        ]

        evidence = {
            "high_vibration_events": int(vibration_count),
            "low_airflow_events": int(airflow_count),
            "high_power_events": int(power_count),
            "high_temperature_events": int(temp_count),

            "avg_vibration": round(
                anomalies["vibration"].mean(),
                3,
            ),

            "avg_airflow": round(
                anomalies["airflow"].mean(),
                2,
            ),

            "avg_power": round(
                anomalies["power"].mean(),
                2,
            ),

            "avg_temperature": round(
                anomalies["temp"].mean(),
                2,
            ),

            "worst_anomaly_score": round(
                anomalies["anomaly_score"].min(),
                4,
            ),

            "baseline_vibration": round(
                unit_data["vibration"].mean(),
                3,
            ),

            "baseline_airflow": round(
                unit_data["airflow"].mean(),
                2,
            ),

            "baseline_power": round(
                unit_data["power"].mean(),
                2,
            ),

            "baseline_temperature": round(
                unit_data["temp"].mean(),
                2,
            ),
            "vibration_change_pct": round(
                (
                    (
                        anomalies["vibration"].mean()
                        - unit_data["vibration"].mean()
                    )
                    / unit_data["vibration"].mean()
                ) * 100,
                1,
            ),
            "airflow_change_pct": round(
                (
                    (
                        anomalies["airflow"].mean()
                        - unit_data["airflow"].mean()
                    )
                    / unit_data["airflow"].mean()
                ) * 100,
                1,
            ),
            "power_change_pct": round(
                (
                    (
                        anomalies["power"].mean()
                        - unit_data["power"].mean()
                    )
                    / unit_data["power"].mean()
                ) * 100,
                1,
            ),
            "temperature_change_pct": round(
                (
                    (
                        anomalies["temp"].mean()
                        - unit_data["temp"].mean()
                    )
                    / unit_data["temp"].mean()
                ) * 100,
                1,
            ),
        }

        # Critical pattern:
        # High vibration + low airflow + high power

        if (
            vibration_count >= 3
            and airflow_count >= 3
            and power_count >= 3
        ):
            return {
                "unit_id": unit_id,
                "priority": "critical",
                "confidence": "high",
                "issue":
                    "Potential blower motor degradation",
                "description":
                    (
                        f"{vibration_count}/5 recent anomalies "
                        "show elevated vibration levels, "
                        f"{power_count}/5 show excessive power "
                        "consumption, and "
                        f"{airflow_count}/5 show reduced airflow. "
                        "This pattern is commonly associated "
                        "with bearing wear, fan imbalance, "
                        "belt slippage, or mechanical resistance "
                        "within the blower assembly."
                    ),
                "recommendations": [
                    "Inspect blower motor bearings",
                    "Check fan balance and shaft alignment",
                    "Inspect belts and coupling components",
                    "Verify airflow path is unobstructed",
                ],
                "evidence": evidence,
            }

        # High vibration

        if vibration_count >= 3:
            return {
                "unit_id": unit_id,
                "priority": "high",
                "confidence": "high",
                "issue":
                    "Mechanical vibration anomaly",
                "description":
                    (
                        f"{vibration_count}/5 recent anomalies "
                        "contain elevated vibration levels. "
                        "This may indicate component wear, "
                        "misalignment, imbalance, or loose "
                        "mounting hardware."
                    ),
                "recommendations": [
                    "Inspect bearings",
                    "Check mounting hardware",
                    "Verify fan balance",
                    "Inspect rotating assemblies",
                ],
                "evidence": evidence,
            }

        # Low airflow

        if airflow_count >= 3:
            return {
                "unit_id": unit_id,
                "priority": "medium",
                "confidence": "medium",
                "issue":
                    "Airflow restriction detected",
                "description":
                    (
                        f"{airflow_count}/5 recent anomalies "
                        "show reduced airflow levels. "
                        "This may indicate clogged filters, "
                        "duct obstruction, damper issues, "
                        "or reduced fan performance."
                    ),
                "recommendations": [
                    "Inspect air filters",
                    "Check ductwork for blockage",
                    "Verify fan operation",
                    "Inspect dampers and vents",
                ],
                "evidence": evidence,
            }

        # High power

        if power_count >= 3:
            return {
                "unit_id": unit_id,
                "priority": "medium",
                "confidence": "medium",
                "issue":
                    "Elevated power consumption",
                "description":
                    (
                        f"{power_count}/5 recent anomalies "
                        "show excessive power consumption. "
                        "This may indicate increased motor "
                        "load, mechanical resistance, or "
                        "declining operational efficiency."
                    ),
                "recommendations": [
                    "Inspect motor load conditions",
                    "Check electrical connections",
                    "Inspect drive components",
                    "Review operating schedule",
                ],
                "evidence": evidence,
            }

        # High temperature

        if temp_count >= 3:
            return {
                "unit_id": unit_id,
                "priority": "medium",
                "confidence": "medium",
                "issue":
                    "Thermal efficiency degradation",
                "description":
                    (
                        f"{temp_count}/5 recent anomalies "
                        "show elevated operating temperatures. "
                        "This may reduce system efficiency "
                        "and accelerate equipment wear."
                    ),
                "recommendations": [
                    "Inspect cooling components",
                    "Verify airflow levels",
                    "Check heat exchange surfaces",
                    "Review operating load",
                ],
                "evidence": evidence,
            }

        # Small number of isolated anomalies
        if (
            anomaly_count <= 2
            and (
                vibration_count >= 1
                or airflow_count >= 1
                or temp_count >= 1
            )
        ):
            return {
                "unit_id": unit_id,
                "priority": "low",
                "confidence": "medium",
                "issue":
                    "Isolated abnormal operating event",
                "description":
                    "A small number of anomalous readings were detected "
                    "containing unusually high vibration, elevated temperature, "
                    "or reduced airflow. No recurring fault pattern has emerged, "
                    "but continued monitoring is recommended.",
                "evidence": evidence,
                "recommendations": [
                    "Monitor future sensor readings",
                    "Review maintenance history",
                    "Inspect during next maintenance window",
                ],
            }

        if anomaly_count <= 2:
            return {
                "unit_id": unit_id,
                "priority": "low",
                "confidence": "medium",
                "issue":
                    "Minor operational deviations observed",
                "description":
                    (
                        f"{anomaly_count} isolated anomalous "
                        "reading(s) were detected, however no "
                        "recurring fault signature was identified. "
                        "The unit is currently operating within "
                        "acceptable limits but should continue "
                        "to be monitored."
                    ),
                "recommendations": [
                    "Monitor future sensor readings",
                    "Review maintenance history",
                    "Continue routine inspections",
                ],
                "evidence": evidence,
            }

        # Unknown pattern

        return {
            "unit_id": unit_id,
            "priority": "medium",
            "confidence": "low",
            "issue":
                "Inconsistent operating behavior detected",
            "description":
                (
                    "Multiple anomalies were detected but "
                    "they do not match a known failure pattern. "
                    "Additional monitoring and inspection may "
                    "be required."
                ),
            "recommendations": [
                "Review recent sensor trends",
                "Inspect unit during next maintenance window",
                "Monitor for recurring anomalies",
            ],
            "evidence": evidence,
        }

    def get_recommendation(
        self,
        unit_id: str,
    ):
        anomalies = (
            self.anomaly_service
            .get_top_anomalies(
                unit_id=unit_id,
                limit=5,
            )
        )

        if anomalies.empty:
            return {
                "unit_id": unit_id,
                "priority": "healthy",
                "confidence": "high",
                "issue":
                    "Operating within expected parameters",
                "description":
                    (
                        "No significant anomalies were "
                        "detected for this HVAC unit."
                    ),
                "recommendations": [
                    "Continue routine monitoring",
                ],
            }

        return self._build_recommendation(
            anomalies,
            unit_id,
        )