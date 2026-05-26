from services.ai_service import (
    AIService,
)

service = AIService()


def explain_hvac(
    unit_id: str,
):
    """
    Returns AI explanation
    for a HVAC unit.
    """

    return service.explain_hvac(
        unit_id
    )