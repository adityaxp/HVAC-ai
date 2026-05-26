import os

from dotenv import load_dotenv
from loguru import logger
from openai import OpenAI

from services.recommendation_service import (
    RecommendationService,
)

from constants.system_prompt import (
    SYSTEM_PROMPT,
)

load_dotenv()



class AIService:
    def __init__(self):
        self.recommendation_service = (
            RecommendationService()
        )

        self.client = OpenAI(
            api_key=os.getenv(
                "OPENROUTER_API_KEY"
            ),
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": "http://localhost",
                "X-Title": "HVAC Maintenance Assistant",
            }
        )

        self.model = (
            "openai/gpt-4o-mini"
        )

    def _build_prompt(
        self,
        recommendation: dict,
    ) -> str:
        evidence = recommendation.get(
            "evidence",
            {},
        )

        return f"""
                Issue:
                {recommendation.get("issue")}

                Priority:
                {recommendation.get("priority")}

                Confidence:
                {recommendation.get("confidence")}

                Description:
                {recommendation.get("description")}

                Evidence:
                {evidence}

                Recommended Maintenance Actions:
                {recommendation.get("recommendations")}

                Explain:

                1. Why this HVAC unit was flagged.
                2. What the evidence means.
                3. What the most likely causes are.
                4. What technicians should inspect first.
                5. Why this issue should (or should not) be prioritized.

                Use the provided evidence only.
                """

    def explain_hvac(
        self,
        unit_id: str,
    ) -> str:
        logger.info(
            f"Generating AI explanation for {unit_id}"
        )

        recommendation = (
            self.recommendation_service
            .get_recommendation(
                unit_id
            )
        )

        prompt = self._build_prompt(
            recommendation
        )

        try:
            response = (
                self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": SYSTEM_PROMPT,
                        },
                        {
                            "role": "user",
                            "content": prompt,
                        },
                    ],
                    temperature=0.2,
                )
            )

            explanation = (
                response
                .choices[0]
                .message
                .content
            )

            logger.success(
                f"Generated explanation for {unit_id}"
            )

            return explanation

        except Exception:
            logger.exception(
                f"Failed generating explanation for {unit_id}"
            )

            raise

    def get_recommendation_context(
        self,
        unit_id: str,
    ) -> dict:
        """
        Useful for debugging prompts
        and future chat functionality.
        """

        return (
            self.recommendation_service
            .get_recommendation(
                unit_id
            )
        )

    def chat(
        self,
        unit_id: str,
        question: str,
    ) -> str:
        logger.info(
            f"Processing chat request for {unit_id}"
        )

        recommendation = (
            self.recommendation_service
            .get_recommendation(
                unit_id
            )
        )

        prompt = f"""
                HVAC Unit:
                {unit_id}

                Current Assessment:
                {recommendation['issue']}

                Priority:
                {recommendation['priority']}

                Confidence:
                {recommendation['confidence']}

                Description:
                {recommendation['description']}

                Evidence:
                {recommendation['evidence']}

                Recommended Actions:
                {recommendation['recommendations']}

                Technician Question:
                {question}

                Answer the technician's question
                using only the information provided.
                If the answer cannot be determined
                from the available evidence,
                state that clearly.
                """

        try:
            response = (
                self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": SYSTEM_PROMPT,
                        },
                        {
                            "role": "user",
                            "content": prompt,
                        },
                    ],
                    temperature=0.2,
                )
            )

            return (
                response
                .choices[0]
                .message
                .content
            )

        except Exception:
            logger.exception(
                f"Chat request failed for {unit_id}"
            )
            raise