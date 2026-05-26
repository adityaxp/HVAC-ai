from fastapi import (
    APIRouter,
    HTTPException,
)
from loguru import logger
from sqlalchemy import text

from db.database import SessionLocal

router = APIRouter(
    prefix="/alerts",
    tags=["Alerts"],
)


@router.get("")
def get_alerts():
    db = SessionLocal()

    logger.info(
        "Fetching all alerts"
    )

    try:
        result = db.execute(
            text(
                """
                SELECT *
                FROM alerts
                ORDER BY created_at DESC
                """
            )
        )

        alerts = result.mappings().all()

        return {
            "count": len(alerts),
            "items": [
                dict(alert)
                for alert in alerts
            ],
        }

    finally:
        db.close()


@router.get("/active")
def get_active_alerts():
    db = SessionLocal()

    logger.info(
        "Fetching active alerts"
    )

    try:
        result = db.execute(
            text(
                """
                SELECT *
                FROM alerts
                WHERE resolved = 0
                ORDER BY created_at DESC
                """
            )
        )

        alerts = result.mappings().all()

        return {
            "count": len(alerts),
            "items": [
                dict(alert)
                for alert in alerts
            ],
        }

    finally:
        db.close()


@router.get("/{alert_id}")
def get_alert(
    alert_id: int,
):
    db = SessionLocal()

    logger.info(
        f"Fetching alert {alert_id}"
    )

    try:
        result = db.execute(
            text(
                """
                SELECT *
                FROM alerts
                WHERE id = :alert_id
                LIMIT 1
                """
            ),
            {
                "alert_id": alert_id,
            },
        )

        alert = result.mappings().first()

        if not alert:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Alert {alert_id} not found"
                ),
            )

        return dict(alert)

    finally:
        db.close()


@router.patch("/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
):
    db = SessionLocal()

    logger.info(
        f"Resolving alert {alert_id}"
    )

    try:
        existing = db.execute(
            text(
                """
                SELECT *
                FROM alerts
                WHERE id = :alert_id
                LIMIT 1
                """
            ),
            {
                "alert_id": alert_id,
            },
        ).mappings().first()

        if not existing:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Alert {alert_id} not found"
                ),
            )

        db.execute(
            text(
                """
                UPDATE alerts
                SET resolved = 1
                WHERE id = :alert_id
                """
            ),
            {
                "alert_id": alert_id,
            },
        )

        db.commit()

        logger.success(
            f"Resolved alert {alert_id}"
        )

        return {
            "success": True,
            "message":
                f"Alert {alert_id} resolved",
        }

    except Exception as e:
        logger.exception(
            f"Failed resolving alert {alert_id}"
        )

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )

    finally:
        db.close()