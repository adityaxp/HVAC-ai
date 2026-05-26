from services.scoring_service import (
    ScoringService,
)

service = ScoringService()


def get_hvac_status(
    unit_id: str,
):
    """
    Returns health status
    for a specific HVAC unit.
    """

    scores = service.get_hvac_scores()

    result = next(
        (
            item
            for item in scores
            if item["unit_id"] == unit_id
        ),
        None,
    )

    return result