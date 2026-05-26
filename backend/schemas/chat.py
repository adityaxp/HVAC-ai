from typing import Literal

from pydantic import BaseModel


class ChatRequest(BaseModel):
    unit_id: Literal[
        "HVAC_1",
        "HVAC_2",
        "HVAC_3",
        "HVAC_4",
        "HVAC_5",
    ]

    question: str