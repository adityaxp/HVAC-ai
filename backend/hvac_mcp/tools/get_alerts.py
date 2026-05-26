from sqlalchemy import text

from db.database import SessionLocal


def get_alerts(
    unit_id: str | None = None,
):
    """
    Returns active alerts.
    Optionally filter
    by HVAC unit.
    """

    db = SessionLocal()

    try:
        if unit_id:
            query = """
            SELECT *
            FROM alerts
            WHERE unit_id = :unit_id
            AND resolved = 0
            ORDER BY created_at DESC
            """

            params = {
                "unit_id": unit_id,
            }

        else:
            query = """
            SELECT *
            FROM alerts
            WHERE resolved = 0
            ORDER BY created_at DESC
            """

            params = {}

        result = db.execute(
            text(query),
            params,
        )

        return [
            dict(row)
            for row in result.mappings().all()
        ]

    finally:
        db.close()