from datetime import datetime

from loguru import logger
from sqlalchemy import text

from db.database import SessionLocal
from services.recommendation_service import (
    RecommendationService,
)


class AlertService:
    def __init__(self):
        self.recommendation_service = (
            RecommendationService()
        )

    def generate_alert(
        self,
        unit_id: str,
        timestamp: datetime,

    ):
        logger.info(
            f"Evaluating alerts for {unit_id}"
        )

        recommendation = (
            self.recommendation_service
            .get_recommendation(
                unit_id
            )
        )

        priority = recommendation[
            "priority"
        ]

        # Ignore healthy/low risk units

        if priority in [
            "healthy",
            "low",
        ]:
            logger.info(
                f"No alert required for {unit_id}"
            )

            return {
                "created": False,
                "reason":
                    "priority_below_threshold",
            }

        db = SessionLocal()

        try:
            # Prevent duplicate active alerts

            existing_alert = db.execute(
                text(
                    """
                    SELECT id
                    FROM alerts
                    WHERE unit_id = :unit_id
                    AND resolved = 0
                    LIMIT 1
                    """
                ),
                {
                    "unit_id": unit_id,
                },
            ).scalar()

            if existing_alert:
                logger.info(
                    f"Active alert already exists for {unit_id}"
                )

                return {
                    "created": False,
                    "reason":
                        "active_alert_exists",
                    "alert_id":
                        existing_alert,
                }

            title = (f"{unit_id}: " f"{recommendation['issue']}")

            message = recommendation[
                "description"
            ]

            severity = priority

            db.execute(
                text(
                    """
                    INSERT INTO alerts (
                        unit_id,
                        severity,
                        title,
                        message,
                        created_at
                    )
                    VALUES (
                        :unit_id,
                        :severity,
                        :title,
                        :message,
                        :created_at
                    )
                    """
                ),
                {
                    "unit_id":
                        unit_id,

                    "severity":
                        severity,

                    "title":
                        title,

                    "message":
                        message,

                    "created_at":
                        str(
                            timestamp
                        ),
                },
            )

            db.commit()

            alert_id = db.execute(
                text(
                    """
                    SELECT last_insert_rowid()
                    """
                )
            ).scalar()

            logger.success(
                f"Created {severity} alert for {unit_id}"
            )

            return {
                "created": True,
                "alert_id": alert_id,
                "unit_id": unit_id,
                "severity": severity,
                "title": title,
            }

        except Exception:
            logger.exception(
                f"Failed creating alert for {unit_id}"
            )

            db.rollback()

            raise

        finally:
            db.close()

    def get_active_alert_count(
        self,
    ):
        db = SessionLocal()

        try:
            count = db.execute(
                text(
                    """
                    SELECT COUNT(*)
                    FROM alerts
                    WHERE resolved = 0
                    """
                )
            ).scalar()

            return count

        finally:
            db.close()