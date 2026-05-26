from fastapi import (
    APIRouter,
    HTTPException,
)
from loguru import logger

from services.ai_service import AIService

from schemas.chat import ChatRequest

router = APIRouter(
    prefix="/assistant",
    tags=["Assistant"],
)

ai_service = AIService()


@router.get("/explain/{unit_id}")
def explain_hvac(
    unit_id: str,
):


    logger.info(
        f"Generating explanation for {unit_id}"
    )

    try:
        explanation = (
            ai_service.explain_hvac(
                unit_id
            )
        )

        return {
            "unit_id": unit_id,
            "explanation": explanation,
        }

    except Exception as e:
        logger.exception(
            f"Failed generating explanation for {unit_id}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


@router.get("/context/{unit_id}")
def get_context(
    unit_id: str,
):

    logger.info(
        f"Fetching AI context for {unit_id}"
    )

    try:
        context = (
            ai_service.get_recommendation_context(
                unit_id
            )
        )

        return {
            "unit_id": unit_id,
            "context": context,
        }

    except Exception as e:
        logger.exception(
            f"Failed fetching context for {unit_id}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


@router.post("/chat")
def chat(
    request: ChatRequest,
):
    """
    HVAC maintenance assistant.
    """

    logger.info(
        f"Chat request for {request.unit_id}"
    )

    try:
        answer = (
            ai_service.chat(
                unit_id=request.unit_id,
                question=request.question,
            )
        )

        return {
            "unit_id":
                request.unit_id,

            "question":
                request.question,

            "answer":
                answer,
        }

    except Exception as e:
        logger.exception(
            f"Chat failed for {request.unit_id}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )