from fastapi import FastAPI

from api.hvac import (
    router as hvac_router,
)

app = FastAPI(
    title="HVAC Monitoring API"
)

app.include_router(
    hvac_router
)