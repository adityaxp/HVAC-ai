from services.recommendation_service import (
    RecommendationService
)
import json

service = RecommendationService()

for unit_id in [
    "HVAC_1",
    "HVAC_2",
    "HVAC_3",
    "HVAC_4",
    "HVAC_5",
]:
    print("\n====================")
    print(unit_id)
    print("====================")

    result = service.get_recommendation(
        unit_id
    )

    print(json.dumps(result, indent=4, default=str))