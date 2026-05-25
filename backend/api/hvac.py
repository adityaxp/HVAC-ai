from fastapi import APIRouter, HTTPException

from services.scoring_service import (
    ScoringService,
)
from services.recommendation_service import (
    RecommendationService,
)

router = APIRouter(
    prefix="/hvac",
    tags=["HVAC"],
)

scoring_service = ScoringService()
recommendation_service = RecommendationService()


@router.get("")
def get_all_hvac_units():


    scores = scoring_service.get_hvac_scores()

    results = []

    for score in scores:
        recommendation = (
            recommendation_service.get_recommendation(
                score["unit_id"]
            )
        )

        results.append(
            {
                "unit_id": score["unit_id"],
                "health_score": score["health_score"],
                "status": score["status"],
                "priority": recommendation[
                    "priority"
                ],
                "confidence": recommendation[
                    "confidence"
                ],
                "issue": recommendation[
                    "issue"
                ],
            }
        )

    results.sort(
        key=lambda item: (
            item["health_score"],
            item["unit_id"],
        )
    )

    return {
        "count": len(results),
        "items": results,
    }


@router.get("/{unit_id}")
def get_hvac_details(
    unit_id: str,
):
   
    scores = scoring_service.get_hvac_scores()

    hvac_score = next(
        (
            item
            for item in scores
            if item["unit_id"] == unit_id
        ),
        None,
    )

    if not hvac_score:
        raise HTTPException(
            status_code=404,
            detail=f"{unit_id} not found",
        )

    recommendation = (
        recommendation_service.get_recommendation(
            unit_id
        )
    )

    return {
        "unit_id": unit_id,
        "health_score": hvac_score[
            "health_score"
        ],
        "status": hvac_score[
            "status"
        ],
        "anomaly_percentage": hvac_score[
            "anomaly_percentage"
        ],
        "recommendation": recommendation,
    }