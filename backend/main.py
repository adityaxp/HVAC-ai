from fastapi import FastAPI

from api.hvac import (
    router as hvac_router,
)

from api.events import (
    router as events_router,
)

from api.alerts import (
    router as alerts_router,
)

from api.assistant import (
    router as assistant_router,
)

from db.seed import seed_database

from api.stats import (
    router as stats_router,
)

seed_database()


app = FastAPI(
    title="HVAC Monitoring API"
)

app.include_router(
    hvac_router
)

app.include_router(
    events_router
)

app.include_router(
    alerts_router
)

app.include_router(
    assistant_router
)

app.include_router(
    stats_router
)