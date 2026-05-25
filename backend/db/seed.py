from pathlib import Path

import pandas as pd
from loguru import logger
from sqlalchemy import text

from db.database import SessionLocal, engine

from services.preprocessing_service import (
    PreprocessingService
)

BASE_DIR = Path(__file__).resolve().parent.parent

CSV_PATH = BASE_DIR / "data" / "hvac_sensor_data.csv"
SCHEMA_PATH = BASE_DIR / "db" / "schema.sql"


def create_tables():
    logger.info("Creating database tables...")

    with engine.begin() as connection:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as file:
            schema_sql = file.read()

        for statement in schema_sql.split(";"):
            statement = statement.strip()

            if statement:
                connection.execute(text(statement))

    logger.success("Database tables created successfully")


def seed_sensor_readings(db, df: pd.DataFrame):
    logger.info("Seeding sensor readings...")

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

    records = df.to_dict(orient="records")

    db.execute(query, records)

    logger.success(
        f"Inserted {len(records)} sensor readings"
    )


def seed_hvac_status(db, df: pd.DataFrame):
    logger.info("Creating HVAC status records...")

    unique_units = df["unit_id"].unique()

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

    db.execute(query, records)

    logger.success(
        f"Created {len(records)} HVAC status records"
    )


def clear_existing_data(db):
    logger.info("Clearing existing data...")

    db.execute(text("DELETE FROM sensor_readings"))
    db.execute(text("DELETE FROM hvac_status"))
    db.execute(text("DELETE FROM alerts"))

    logger.success("Existing data cleared")


def main():
    logger.info("Starting database seed process")

    df = pd.read_csv(CSV_PATH)
    preprocessor = PreprocessingService()
    df = preprocessor.clean(df)

    logger.success("Preprocessing completed")

    logger.info(
        f"Loaded {len(df)} rows from CSV"
    )

    db = SessionLocal()

    try:
        create_tables()

        clear_existing_data(db)

        seed_sensor_readings(db, df)

        seed_hvac_status(db, df)

        db.commit()

        logger.success(
            "Database seeded successfully"
        )

    except Exception as e:
        db.rollback()

        logger.exception(
            f"Seed process failed: {e}"
        )

        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()