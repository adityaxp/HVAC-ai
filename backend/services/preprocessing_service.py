import pandas as pd
from loguru import logger


class PreprocessingService:

    def clean(self, df: pd.DataFrame) -> pd.DataFrame:

        logger.info("Starting preprocessing")

        df = df.drop_duplicates()

        df = df.sort_values("timestamp")

        numeric_columns = [
            "temp",
            "pressure",
            "airflow",
            "vibration",
            "power",
        ]

        for column in numeric_columns:
            df[column] = (
                df[column]
                .interpolate()
                .bfill()
                .ffill()
            )

        logger.success("Preprocessing completed")

        return df