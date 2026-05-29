from fastapi import APIRouter

from services.stats_service import (
    StatsService,
)

router = APIRouter(
    prefix="/stats",
    tags=["Stats"],
)

stats_service = (
    StatsService()
)


@router.get("/overview")
def get_overview_stats():
    return (
        stats_service
        .get_overview_stats()
    )