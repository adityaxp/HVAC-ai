from datetime import datetime, timedelta

from fastapi import (
    APIRouter,
    HTTPException,
    Query,
)
from loguru import logger
from sqlalchemy import text

from db.database import SessionLocal
from schemas.event import SensorEvent
from services.alert_service import AlertService


router = APIRouter(
    prefix="/events",
    tags=["Events"],
)


@router.post("")
def create_sensor_event(
    event: SensorEvent,
):
    db = SessionLocal()

    logger.info(
        f"Creating sensor event for {event.unit_id}"
    )

    try:
        latest = db.execute(
            text(
                """
                SELECT timestamp
                FROM sensor_readings
                WHERE unit_id = :unit_id
                ORDER BY timestamp DESC
                LIMIT 1
                """
            ),
            {
                "unit_id": event.unit_id,
            },
        ).scalar()

        if event.timestamp:
            timestamp = event.timestamp

        elif latest:
            timestamp = (
                datetime.fromisoformat(
                    latest
                )
                + timedelta(minutes=5)
            )

        else:
            timestamp = datetime.now()

        db.execute(
            text(
                """
                INSERT INTO sensor_readings (
                    timestamp,
                    unit_id,
                    temp,
                    pressure,
                    airflow,
                    vibration,
                    power
                )
                VALUES (
                    :timestamp,
                    :unit_id,
                    :temp,
                    :pressure,
                    :airflow,
                    :vibration,
                    :power
                )
                """
            ),
            {
                "timestamp": str(
                    timestamp
                ),
                "unit_id": event.unit_id,
                "temp": event.temp,
                "pressure": event.pressure,
                "airflow": event.airflow,
                "vibration": event.vibration,
                "power": event.power,
            },
        )

        db.commit()
        alert_service = AlertService()

        alert_result = alert_service.generate_alert(unit_id=event.unit_id, timestamp=timestamp)


        logger.success(
            f"Sensor event recorded for {event.unit_id}"
        )

        return {
            "success": True,
            "message":
                "Sensor event recorded successfully",
            "alert": alert_result,
            "data": {
                "unit_id":
                    event.unit_id,

                "timestamp":
                    str(timestamp),
            },
        }

    except Exception as e:
        logger.exception(
            f"Failed creating sensor event for {event.unit_id}"
        )

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )

    finally:
        db.close()


@router.get("/latest/{unit_id}")
def get_latest_reading(
    unit_id: str,
):
    db = SessionLocal()

    logger.info(
        f"Fetching latest reading for {unit_id}"
    )

    try:
        result = db.execute(
            text(
                """
                SELECT *
                FROM sensor_readings
                WHERE unit_id = :unit_id
                ORDER BY timestamp DESC
                LIMIT 1
                """
            ),
            {
                "unit_id": unit_id,
            },
        )

        row = result.mappings().first()

        if not row:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"No readings found "
                    f"for {unit_id}"
                ),
            )

        return dict(row)

    finally:
        db.close()


@router.get("/history/{unit_id}")
def get_unit_history(
    unit_id: str,
    limit: int = Query(
        default=50,
        ge=1,
        le=500,
    ),
):
    db = SessionLocal()

    logger.info(
        f"Fetching history for {unit_id}"
    )

    try:
        result = db.execute(
            text(
                """
                SELECT *
                FROM sensor_readings
                WHERE unit_id = :unit_id
                ORDER BY timestamp DESC
                LIMIT :limit
                """
            ),
            {
                "unit_id": unit_id,
                "limit": limit,
            },
        )

        rows = result.mappings().all()

        return {
            "unit_id": unit_id,
            "count": len(rows),
            "items": [
                dict(row)
                for row in rows
            ],
        }

    finally:
        db.close()