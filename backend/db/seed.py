from pathlib import Path

import pandas as pd
from loguru import logger
from sqlalchemy import text

from db.database import (
    SessionLocal,
    engine,
)

from services.preprocessing_service import (
    PreprocessingService,
)

from services.alert_service import (
    AlertService,
)

BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
    .parent
)

CSV_PATH = (
    BASE_DIR
    / "data"
    / "hvac_sensor_data.csv"
)

SCHEMA_PATH = (
    BASE_DIR
    / "db"
    / "schema.sql"
)


def create_tables():
    logger.info(
        "Creating database tables..."
    )

    with engine.begin() as connection:
        with open(
            SCHEMA_PATH,
            "r",
            encoding="utf-8",
        ) as file:
            schema_sql = file.read()

        for statement in (
            schema_sql.split(";")
        ):
            statement = (
                statement.strip()
            )

            if statement:
                connection.execute(
                    text(statement)
                )

    logger.success(
        "Database tables ready"
    )


def database_has_data(
    db,
):
    result = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM sensor_readings
            """
        )
    ).scalar()

    return result > 0


def seed_sensor_readings(
    db,
    df: pd.DataFrame,
):
    logger.info(
        "Seeding sensor readings..."
    )

    query = text(
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
    )

    records = df.to_dict(
        orient="records"
    )

    db.execute(
        query,
        records,
    )

    logger.success(
        f"Inserted {len(records)} "
        f"sensor readings"
    )


def seed_hvac_status(
    db,
    df: pd.DataFrame,
):
    logger.info(
        "Creating HVAC status records..."
    )

    unique_units = (
        df["unit_id"]
        .unique()
    )

    query = text(
        """
        INSERT OR IGNORE INTO hvac_status (
            unit_id,
            health_score,
            status
        )
        VALUES (
            :unit_id,
            :health_score,
            :status
        )
        """
    )

    records = [
        {
            "unit_id": unit_id,
            "health_score": 100,
            "status": "healthy",
        }
        for unit_id in unique_units
    ]

    db.execute(
        query,
        records,
    )

    logger.success(
        f"Created {len(records)} "
        f"HVAC status records"
    )


def seed_database():
    logger.info(
        "Starting database initialization"
    )

    create_tables()

    db = SessionLocal()

    try:
        if database_has_data(db):
            logger.info(
                "Database already seeded"
            )

            return

        logger.info(
            "Loading CSV dataset"
        )

        df = pd.read_csv(
            CSV_PATH
        )

        preprocessor = (
            PreprocessingService()
        )

        df = preprocessor.clean(
            df
        )

        logger.success(
            "Preprocessing completed"
        )

        logger.info(
            f"Loaded {len(df)} rows"
        )

        seed_sensor_readings(
            db,
            df,
        )

        seed_hvac_status(
            db,
            df,
        )

        db.commit()

        logger.info(
            "Seeding initial alerts..."
        )

        alert_service = (
            AlertService()
        )

        alert_service.seed_initial_alerts()

        logger.success(
            "Database seeded successfully"
        )

    except Exception as e:
        db.rollback()

        logger.exception(
            f"Database seed failed: {e}"
        )

        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()