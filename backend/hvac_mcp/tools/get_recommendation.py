from services.recommendation_service import (
    RecommendationService,
)

service = RecommendationService()


def get_recommendation(
    unit_id: str,
):
    """
    Returns recommendation data
    for a HVAC unit.
    """

    return service.get_recommendation(
        unit_id
    )