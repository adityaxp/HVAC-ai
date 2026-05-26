from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class SensorEvent(BaseModel):
    timestamp: datetime | None = None

    unit_id: Literal[
        "HVAC_1",
        "HVAC_2",
        "HVAC_3",
        "HVAC_4",
        "HVAC_5",
    ]

    temp: float
    pressure: float
    airflow: float
    vibration: float
    power: float