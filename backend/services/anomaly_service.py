import pandas as pd
from loguru import logger
from sqlalchemy import text
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from db.database import SessionLocal


class AnomalyService:
    def __init__(self):
        self.contamination = 0.05

        self.features = [
            "temp",
            "pressure",
            "airflow",
            "vibration",
            "power",
        ]

    def _load_all_data(self) -> pd.DataFrame:
        db = SessionLocal()

        try:
            query = text(
                """
                SELECT
                    timestamp,
                    unit_id,
                    temp,
                    pressure,
                    airflow,
                    vibration,
                    power
                FROM sensor_readings
                ORDER BY timestamp
                """
            )

            result = db.execute(query)

            rows = result.fetchall()

            return pd.DataFrame(
                rows,
                columns=result.keys(),
            )

        finally:
            db.close()

    def _build_predictions(
        self,
        df: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Applies scaling + Isolation Forest
        and returns dataframe with anomaly
        predictions attached.
        """

        features = df[self.features]

        scaler = StandardScaler()

        X_scaled = scaler.fit_transform(
            features
        )

        model = IsolationForest(
            contamination=self.contamination,
            random_state=42,
        )

        model.fit(X_scaled)

        result_df = df.copy()

        result_df["is_anomaly"] = (
            model.predict(X_scaled)
        )

        result_df["anomaly_score"] = (
            model.decision_function(X_scaled)
        )

        return result_df

    def detect_all_units(self):
        logger.info(
            "Running global anomaly detection"
        )

        df = self._load_all_data()

        if df.empty:
            raise ValueError(
                "No sensor data found"
            )

        df = self._build_predictions(df)

        anomaly_counts = (
            df[df["is_anomaly"] == -1]
            .groupby("unit_id")
            .size()
            .reset_index(name="anomaly_count")
        )

        total_counts = (
            df.groupby("unit_id")
            .size()
            .reset_index(name="total_readings")
        )

        results = anomaly_counts.merge(
            total_counts,
            on="unit_id",
            how="right",
        ).fillna(0)

        results["anomaly_percentage"] = (
            results["anomaly_count"]
            / results["total_readings"]
            * 100
        ).round(2)

        results = results.sort_values(
            by="anomaly_count",
            ascending=False,
        )

        logger.success(
            "Global anomaly detection completed"
        )

        return results.to_dict("records")

    def get_top_anomalies(
        self,
        unit_id: str,
        limit: int = 5,
    ):
        df = self._load_all_data()

        if df.empty:
            raise ValueError(
                "No sensor data found"
            )

        df = self._build_predictions(df)

        anomalies = df[
            (df["unit_id"] == unit_id)
            & (df["is_anomaly"] == -1)
        ]

        return anomalies.sort_values(
            by="anomaly_score"
        ).head(limit)

    def get_all_anomaly_records(self):

        df = self._load_all_data()

        if df.empty:
            raise ValueError(
                "No sensor data found"
            )

        return self._build_predictions(df)