from __future__ import annotations

import json

import httpx
import pytest

from server.ai.client import AgentRouterClient
from server.ai.fixtures import resolve_fixture_key
from server.core.errors import AppError
from server.core.settings import Settings


@pytest.mark.asyncio
async def test_ai_client_uses_mocked_http():
    fixture = {
        "title": "Test Quiz",
        "questions": [
            {
                "prompt": "Q1?",
                "type": "TRUE_FALSE",
                "explanation": "Because.",
                "points": 1,
                "options": [
                    {"text": "True", "is_correct": True},
                    {"text": "False", "is_correct": False},
                ],
            }
        ]
        * 5,
    }

    mock_response = httpx.Response(
        200,
        json={"choices": [{"message": {"content": json.dumps(fixture)}}]},
        request=httpx.Request("POST", "https://agentrouter.org/v1/chat/completions"),
    )

    settings = Settings(
        agentrouter_api_key="test-key",
        ai_use_fallback_on_error=False,
        agentrouter_max_retries=1,
    )
    client = httpx.AsyncClient(transport=httpx.MockTransport(lambda req: mock_response))
    ai = AgentRouterClient(settings=settings, client=client)

    result = await ai.generate_challenge(
        subject="Math",
        topic="Fractions",
        description=None,
        difficulty="MEDIUM",
        question_count=5,
        use_fallback=False,
    )
    assert result["title"] == "Test Quiz"
    assert len(result["questions"]) == 5
    await ai.close()


@pytest.mark.asyncio
async def test_ai_client_fallback_on_provider_error():
    settings = Settings(
        agentrouter_api_key="invalid",
        ai_use_fallback_on_error=True,
        agentrouter_max_retries=1,
    )

    async def fail_transport(_request):
        return httpx.Response(503, request=_request)

    client = httpx.AsyncClient(transport=httpx.MockTransport(fail_transport))
    ai = AgentRouterClient(settings=settings, client=client)

    result = await ai.generate_challenge(
        subject="Math",
        topic="Fractions",
        description=None,
        difficulty="MEDIUM",
        question_count=5,
    )
    assert len(result["questions"]) == 5
    assert "Fraction" in result["title"]
    await ai.close()


@pytest.mark.asyncio
async def test_ai_client_fallback_on_default_api_key():
    settings = Settings(
        agentrouter_api_key="your-api-key-here",
        ai_use_fallback_on_error=True,
    )
    ai = AgentRouterClient(settings=settings)

    result = await ai.generate_challenge(
        subject="Physics",
        topic="Motion",
        description=None,
        difficulty="MEDIUM",
        question_count=5,
    )
    assert result["title"] == "Motion Practice"
    await ai.close()


@pytest.mark.asyncio
async def test_ai_client_retries_invalid_json_then_fallback():
    settings = Settings(
        agentrouter_api_key="test-key",
        ai_use_fallback_on_error=True,
        agentrouter_max_retries=0,
    )
    calls = {"count": 0}

    async def invalid_then_fail(_request):
        calls["count"] += 1
        if calls["count"] == 1:
            return httpx.Response(
                200,
                json={"choices": [{"message": {"content": "not-json"}}]},
                request=_request,
            )
        return httpx.Response(503, request=_request)

    client = httpx.AsyncClient(transport=httpx.MockTransport(invalid_then_fail))
    ai = AgentRouterClient(settings=settings, client=client)

    result = await ai.generate_challenge(
        subject="English",
        topic="Present Perfect",
        description=None,
        difficulty="MEDIUM",
        question_count=5,
    )
    assert calls["count"] == 2
    assert result["title"] == "Present Perfect Practice"
    await ai.close()


@pytest.mark.asyncio
async def test_ai_client_raises_without_fallback():
    settings = Settings(
        agentrouter_api_key="invalid",
        ai_use_fallback_on_error=False,
        agentrouter_max_retries=1,
    )

    async def fail_transport(_request):
        return httpx.Response(503, request=_request)

    client = httpx.AsyncClient(transport=httpx.MockTransport(fail_transport))
    ai = AgentRouterClient(settings=settings, client=client)

    with pytest.raises(AppError) as exc:
        await ai.generate_challenge(
            subject="Math",
            topic="Fractions",
            description=None,
            difficulty="MEDIUM",
            question_count=5,
            use_fallback=False,
        )
    assert exc.value.code == "AI_PROVIDER_UNAVAILABLE"
    await ai.close()


def test_fixture_topic_matching():
    assert resolve_fixture_key(subject_name="Math", topic_name="Fractions") == "fractions"
    assert resolve_fixture_key(subject_name="English", topic_name="Past Simple") == "past_simple"
    assert resolve_fixture_key(subject_name="Physics", topic_name="Newton's Laws") == "newton"
    assert resolve_fixture_key(subject_name="Math", topic_name="Quadratic Equations") == "quadratic"
