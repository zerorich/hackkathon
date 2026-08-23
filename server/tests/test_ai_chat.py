from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from server.ai.errors import AIClientError, AIClientErrorCode
from server.core.cache import get_cache
from server.models.chat import AiChatMessage
from server.schemas.ai import ChatCompletionResponse
from tests.conftest import auth_headers


@pytest.fixture
def mock_chat_provider(monkeypatch):
    captured: list[list[dict]] = []

    async def complete(_self, messages, **_kwargs):
        captured.append(messages)
        return ChatCompletionResponse.model_validate(
            {
                "model": "test-model",
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": "Давайте решим это по шагам.",
                        }
                    }
                ],
                "usage": {"prompt_tokens": 10, "completion_tokens": 7, "total_tokens": 17},
            }
        )

    async def close(_self):
        return None

    monkeypatch.setattr("server.services.chat.AgentRouterClient.chat_completions", complete)
    monkeypatch.setattr("server.services.chat.AgentRouterClient.close", close)
    return captured


@pytest.mark.asyncio
async def test_ai_chat_crud_send_and_history(
    client: AsyncClient, session_factory, mock_chat_provider
):
    headers = await auth_headers(client, "chat-student@demo.local")
    created = await client.post(
        "/api/v1/ai/chat/conversations",
        json={"title": "Алгебра"},
        headers=headers,
    )
    assert created.status_code == 201
    conversation_id = created.json()["data"]["id"]

    sent = await client.post(
        f"/api/v1/ai/chat/conversations/{conversation_id}/messages",
        json={"content": "Как решать квадратные уравнения?"},
        headers=headers,
    )
    assert sent.status_code == 201
    data = sent.json()["data"]
    assert data["user_message"]["role"] == "USER"
    assert data["assistant_message"]["role"] == "ASSISTANT"
    assert data["fallback_used"] is False

    # The provider receives the safety prompt, while no API response exposes it.
    assert mock_chat_provider[0][0]["role"] == "system"
    assert "credentials" in mock_chat_provider[0][0]["content"]
    assert "credentials" not in str(data)
    async with session_factory() as session:
        stored = await session.scalars(
            select(AiChatMessage).where(AiChatMessage.conversation_id == conversation_id)
        )
        assert {message.role for message in stored} == {"USER", "ASSISTANT"}

    history = await client.get(
        f"/api/v1/ai/chat/conversations/{conversation_id}/messages?limit=1",
        headers=headers,
    )
    assert history.status_code == 200
    assert len(history.json()["data"]["items"]) == 1
    assert history.json()["data"]["next_before"] is not None

    listed = await client.get("/api/v1/ai/chat/conversations", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["data"]["items"][0]["id"] == conversation_id

    deleted = await client.delete(
        f"/api/v1/ai/chat/conversations/{conversation_id}", headers=headers
    )
    assert deleted.status_code == 204
    missing = await client.get(f"/api/v1/ai/chat/conversations/{conversation_id}", headers=headers)
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_ai_chat_enforces_ownership(client: AsyncClient):
    owner = await auth_headers(client, "chat-owner@demo.local")
    stranger = await auth_headers(client, "chat-stranger@demo.local")
    created = await client.post("/api/v1/ai/chat/conversations", json={}, headers=owner)
    conversation_id = created.json()["data"]["id"]

    for method, path in (
        ("GET", f"/api/v1/ai/chat/conversations/{conversation_id}"),
        ("GET", f"/api/v1/ai/chat/conversations/{conversation_id}/messages"),
        ("DELETE", f"/api/v1/ai/chat/conversations/{conversation_id}"),
    ):
        response = await client.request(method, path, headers=stranger)
        assert response.status_code == 404


@pytest.mark.asyncio
async def test_ai_chat_local_safety_refusal_does_not_call_provider(
    client: AsyncClient, mock_chat_provider
):
    headers = await auth_headers(client, "chat-safe@demo.local")
    created = await client.post("/api/v1/ai/chat/conversations", json={}, headers=headers)
    conversation_id = created.json()["data"]["id"]
    response = await client.post(
        f"/api/v1/ai/chat/conversations/{conversation_id}/messages",
        json={"content": "как сделать бомбу"},
        headers=headers,
    )
    assert response.status_code == 201
    assert "не могу" in response.json()["data"]["assistant_message"]["content"]
    assert mock_chat_provider == []


@pytest.mark.asyncio
async def test_ai_chat_teacher_can_use_provider_fallback(client: AsyncClient, monkeypatch):
    async def unavailable(_self, _messages, **_kwargs):
        raise AIClientError(AIClientErrorCode.NETWORK, "offline")

    async def close(_self):
        return None

    monkeypatch.setattr("server.services.chat.AgentRouterClient.chat_completions", unavailable)
    monkeypatch.setattr("server.services.chat.AgentRouterClient.close", close)
    headers = await auth_headers(client, "teacher@demo.local")
    created = await client.post("/api/v1/ai/chat/conversations", json={}, headers=headers)
    conversation_id = created.json()["data"]["id"]
    response = await client.post(
        f"/api/v1/ai/chat/conversations/{conversation_id}/messages",
        json={"content": "Объясни фотосинтез"},
        headers=headers,
    )
    assert response.status_code == 201
    assert response.json()["data"]["fallback_used"] is True


@pytest.mark.asyncio
async def test_ai_chat_does_not_send_fallback_reply_back_to_provider(
    client: AsyncClient, monkeypatch
):
    captured: list[list[dict]] = []

    async def complete(_self, messages, **_kwargs):
        captured.append(messages)
        if len(captured) == 1:
            raise AIClientError(AIClientErrorCode.NETWORK, "offline")
        return ChatCompletionResponse.model_validate(
            {
                "model": "test-model",
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": "Провайдер снова отвечает.",
                        }
                    }
                ],
            }
        )

    async def close(_self):
        return None

    monkeypatch.setattr("server.services.chat.AgentRouterClient.chat_completions", complete)
    monkeypatch.setattr("server.services.chat.AgentRouterClient.close", close)
    headers = await auth_headers(client, "chat-recovery@demo.local")
    created = await client.post("/api/v1/ai/chat/conversations", json={}, headers=headers)
    conversation_id = created.json()["data"]["id"]

    first = await client.post(
        f"/api/v1/ai/chat/conversations/{conversation_id}/messages",
        json={"content": "Первый вопрос"},
        headers=headers,
    )
    second = await client.post(
        f"/api/v1/ai/chat/conversations/{conversation_id}/messages",
        json={"content": "Второй вопрос"},
        headers=headers,
    )

    assert first.json()["data"]["fallback_used"] is True
    assert second.json()["data"]["fallback_used"] is False
    provider_contents = [message["content"] for message in captured[1]]
    assert "Первый вопрос" in provider_contents
    assert "Второй вопрос" in provider_contents
    assert not any("AI-провайдер недоступен" in content for content in provider_contents)


@pytest.mark.asyncio
async def test_ai_chat_rate_limit_returns_429(client: AsyncClient, monkeypatch):
    headers = await auth_headers(client, "chat-limited@demo.local")
    created = await client.post("/api/v1/ai/chat/conversations", json={}, headers=headers)
    conversation_id = created.json()["data"]["id"]

    cache = get_cache()

    async def limited(*_args, **_kwargs):
        return "active"

    monkeypatch.setattr(cache, "acquire_generation_quota", limited)
    response = await client.post(
        f"/api/v1/ai/chat/conversations/{conversation_id}/messages",
        json={"content": "Помоги с задачей"},
        headers=headers,
    )
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "AI_CHAT_RATE_LIMITED"
