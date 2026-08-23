from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from typing import Any, Literal, Self, overload

import httpx
import structlog

from server.ai.errors import AIClientError, AIClientErrorCode
from server.ai.fixtures import get_fixture
from server.ai.validator import parse_ai_response
from server.core.errors import ERROR_CODES, AppError
from server.core.settings import Settings, get_settings
from server.schemas.ai import ChatCompletionResponse, ChatCompletionStreamChunk

logger = structlog.get_logger(__name__)

RETRYABLE_STATUS_CODES = frozenset({429, 500, 502, 503, 504})


class AgentRouterClient:
    """Async OpenAI-compatible client for AgentRouter."""

    def __init__(
        self,
        settings: Settings | None = None,
        *,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self._owns_client = client is None
        self._client = client

    @property
    def default_model(self) -> str:
        return self.settings.agentrouter_model

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            limits = httpx.Limits(
                max_connections=self.settings.http_client_max_connections,
                max_keepalive_connections=self.settings.http_client_max_connections,
            )
            timeout = httpx.Timeout(
                connect=10.0,
                read=self.settings.agentrouter_timeout_seconds,
                write=30.0,
                pool=10.0,
            )
            self._client = httpx.AsyncClient(limits=limits, timeout=timeout)
        return self._client

    def _headers(self) -> dict[str, str]:
        api_key = self.settings.agentrouter_api_key.get_secret_value()
        return {
            "Authorization": f"Bearer {api_key}",
            "User-Agent": self.settings.agentrouter_user_agent,
            "Content-Type": "application/json",
        }

    @staticmethod
    def _normalize_messages(messages: list[Any]) -> list[dict[str, Any]]:
        normalized: list[dict[str, Any]] = []
        for message in messages:
            if hasattr(message, "model_dump"):
                normalized.append(message.model_dump(exclude_none=True))
            elif isinstance(message, dict):
                normalized.append(message)
            else:
                raise TypeError(f"Unsupported message type: {type(message)!r}")
        return normalized

    def _build_payload(
        self,
        messages: list[dict[str, Any]],
        *,
        model: str | None,
        stream: bool,
        extra: dict[str, Any],
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": model or self.default_model,
            "messages": messages,
            "stream": stream,
        }
        payload.update(extra)
        return payload

    @staticmethod
    def _error_from_response(response: httpx.Response) -> AIClientError:
        status = response.status_code
        try:
            body = response.json()
        except json.JSONDecodeError:
            body = {"raw": response.text[:500]}

        message = "AgentRouter request failed"
        if isinstance(body, dict):
            err = body.get("error")
            if isinstance(err, dict) and err.get("message"):
                message = str(err["message"])
            elif body.get("message"):
                message = str(body["message"])

        if status in (401, 403):
            return AIClientError(
                AIClientErrorCode.AUTH_ERROR,
                message,
                status_code=status,
                details=body,
                retryable=False,
            )
        if status == 429:
            return AIClientError(
                AIClientErrorCode.RATE_LIMITED,
                message,
                status_code=status,
                details=body,
                retryable=True,
            )
        if status >= 500:
            return AIClientError(
                AIClientErrorCode.SERVER_ERROR,
                message,
                status_code=status,
                details=body,
                retryable=True,
            )
        return AIClientError(
            AIClientErrorCode.CLIENT_ERROR,
            message,
            status_code=status,
            details=body,
            retryable=False,
        )

    async def _backoff(
        self,
        attempt: int,
        error: AIClientError,
        *,
        response: httpx.Response | None = None,
    ) -> None:
        delay = min(2**attempt, 8)
        if response is not None:
            retry_after = response.headers.get("Retry-After")
            if retry_after and retry_after.isdigit():
                delay = max(delay, int(retry_after))

        logger.warning(
            "agentrouter_retry",
            attempt=attempt + 1,
            delay_seconds=delay,
            error_code=error.code,
            status_code=error.status_code,
        )
        await asyncio.sleep(delay)

    async def _request_with_retries(
        self,
        method: str,
        url: str,
        *,
        json_payload: dict[str, Any] | None = None,
    ) -> httpx.Response:
        client = await self._get_client()
        max_retries = self.settings.agentrouter_max_retries
        last_error: AIClientError | None = None

        for attempt in range(max_retries + 1):
            try:
                response = await client.request(
                    method,
                    url,
                    headers=self._headers(),
                    json=json_payload,
                )
            except httpx.TimeoutException as exc:
                last_error = AIClientError(
                    AIClientErrorCode.TIMEOUT,
                    "AgentRouter request timed out",
                    retryable=True,
                )
                if attempt >= max_retries:
                    raise last_error from exc
                await self._backoff(attempt, last_error)
                continue
            except httpx.TransportError as exc:
                last_error = AIClientError(
                    AIClientErrorCode.NETWORK,
                    "AgentRouter network error",
                    retryable=True,
                )
                if attempt >= max_retries:
                    raise last_error from exc
                await self._backoff(attempt, last_error)
                continue

            if response.is_success:
                return response

            err = self._error_from_response(response)
            if not err.retryable or attempt >= max_retries:
                raise err

            last_error = err
            await self._backoff(attempt, err, response=response)

        assert last_error is not None
        raise last_error

    @overload
    async def chat_completions(
        self,
        messages: list[Any],
        *,
        model: str | None = None,
        stream: Literal[False] = False,
        **kwargs: Any,
    ) -> ChatCompletionResponse: ...

    @overload
    async def chat_completions(
        self,
        messages: list[Any],
        *,
        model: str | None = None,
        stream: Literal[True],
        **kwargs: Any,
    ) -> AsyncIterator[ChatCompletionStreamChunk]: ...

    async def chat_completions(
        self,
        messages: list[Any],
        *,
        model: str | None = None,
        stream: bool = False,
        **kwargs: Any,
    ) -> ChatCompletionResponse | AsyncIterator[ChatCompletionStreamChunk]:
        normalized = self._normalize_messages(messages)
        payload = self._build_payload(
            normalized,
            model=model,
            stream=stream,
            extra=kwargs,
        )
        url = self.settings.chat_completions_url

        logger.info(
            "agentrouter_chat_completions",
            model=payload["model"],
            stream=stream,
            message_count=len(normalized),
        )

        if stream:
            return self._stream_chat_completions(url, payload)
        return await self._complete_chat_completions(url, payload)

    async def _complete_chat_completions(
        self,
        url: str,
        payload: dict[str, Any],
    ) -> ChatCompletionResponse:
        response = await self._request_with_retries("POST", url, json_payload=payload)
        try:
            data = response.json()
        except json.JSONDecodeError as exc:
            raise AIClientError(
                AIClientErrorCode.INVALID_RESPONSE,
                "AgentRouter returned non-JSON response",
                status_code=response.status_code,
                retryable=False,
            ) from exc

        return ChatCompletionResponse.model_validate(data)

    async def _stream_chat_completions(
        self,
        url: str,
        payload: dict[str, Any],
    ) -> AsyncIterator[ChatCompletionStreamChunk]:
        client = await self._get_client()
        max_retries = self.settings.agentrouter_max_retries

        for attempt in range(max_retries + 1):
            try:
                async with client.stream(
                    "POST",
                    url,
                    headers=self._headers(),
                    json=payload,
                ) as response:
                    if not response.is_success:
                        err = self._error_from_response(response)
                        if err.retryable and attempt < max_retries:
                            await self._backoff(attempt, err, response=response)
                            continue
                        raise err

                    async for chunk in self._parse_sse_stream(response):
                        yield chunk
                    return
            except httpx.TimeoutException as exc:
                err = AIClientError(
                    AIClientErrorCode.TIMEOUT,
                    "AgentRouter stream timed out",
                    retryable=True,
                )
                if attempt >= max_retries:
                    raise err from exc
                await self._backoff(attempt, err)
            except httpx.TransportError as exc:
                err = AIClientError(
                    AIClientErrorCode.NETWORK,
                    "AgentRouter stream network error",
                    retryable=True,
                )
                if attempt >= max_retries:
                    raise err from exc
                await self._backoff(attempt, err)

        raise AIClientError(
            AIClientErrorCode.SERVER_ERROR,
            "AgentRouter stream failed after retries",
            retryable=False,
        )

    @staticmethod
    async def _parse_sse_stream(
        response: httpx.Response,
    ) -> AsyncIterator[ChatCompletionStreamChunk]:
        async for line in response.aiter_lines():
            if not line or not line.startswith("data:"):
                continue
            data = line[5:].strip()
            if data == "[DONE]":
                break
            try:
                parsed = json.loads(data)
            except json.JSONDecodeError:
                logger.warning("agentrouter_sse_parse_skip", line=data[:120])
                continue
            yield ChatCompletionStreamChunk.model_validate(parsed)

    def _build_prompt(
        self,
        *,
        subject: str,
        topic: str,
        description: str | None,
        difficulty: str,
        question_count: int,
    ) -> str:
        return (
            "Generate a school quiz challenge as JSON only.\n"
            f"Subject: {subject}\n"
            f"Topic: {topic}\n"
            f"Context: {description or 'N/A'}\n"
            f"Difficulty: {difficulty}\n"
            f"Question count: {question_count}\n"
            "Rules:\n"
            "- ONLY SINGLE_CHOICE or TRUE_FALSE types\n"
            "- Exactly one correct option per question\n"
            "- No empty options\n"
            'Return JSON: {"title": str, "questions": [{'
            '"prompt": str, "type": "SINGLE_CHOICE"|"TRUE_FALSE", '
            '"explanation": str, "points": 1, '
            '"options": [{"text": str, "is_correct": bool}]}]}'
        )

    @staticmethod
    def _api_key_missing(settings: Settings) -> bool:
        api_key = settings.agentrouter_api_key.get_secret_value()
        return not api_key or api_key == "your-api-key-here"

    def _fixture_response(
        self,
        *,
        subject: str,
        topic: str,
        question_count: int,
    ) -> dict[str, Any]:
        fixture = get_fixture(
            subject_name=subject,
            topic_name=topic,
            question_count=question_count,
        )
        return parse_ai_response(json.dumps(fixture), expected_count=question_count)

    async def generate_challenge(
        self,
        *,
        subject: str,
        topic: str,
        description: str | None,
        difficulty: str,
        question_count: int,
        use_fallback: bool | None = None,
    ) -> dict[str, Any]:
        use_fallback = (
            self.settings.ai_use_fallback_on_error if use_fallback is None else use_fallback
        )

        prompt = self._build_prompt(
            subject=subject,
            topic=topic,
            description=description,
            difficulty=difficulty,
            question_count=question_count,
        )

        if self._api_key_missing(self.settings):
            if use_fallback:
                logger.warning("ai_generation_fallback_no_api_key")
                return self._fixture_response(
                    subject=subject,
                    topic=topic,
                    question_count=question_count,
                )
            raise AppError(
                ERROR_CODES.AI_PROVIDER_UNAVAILABLE,
                "AgentRouter API key not configured",
                status_code=503,
            )

        last_error: Exception | None = None
        max_validation_attempts = 2

        for attempt in range(max_validation_attempts):
            try:
                raw = await self._call_api(prompt)
                return parse_ai_response(raw, expected_count=question_count)
            except AppError as exc:
                last_error = exc
                if (
                    exc.code == ERROR_CODES.AI_OUTPUT_INVALID
                    and attempt < max_validation_attempts - 1
                ):
                    logger.warning("ai_generation_invalid_retry", attempt=attempt + 1)
                    continue
                break
            except AIClientError as exc:
                last_error = exc
                break
            except Exception as exc:  # noqa: BLE001 -- normalize provider/transport failures
                last_error = exc
                break

        if use_fallback:
            logger.warning("ai_generation_fallback", error=str(last_error))
            return self._fixture_response(
                subject=subject,
                topic=topic,
                question_count=question_count,
            )

        if isinstance(last_error, AppError):
            raise last_error

        raise AppError(
            ERROR_CODES.AI_PROVIDER_UNAVAILABLE,
            "AI provider unavailable",
            status_code=503,
        ) from last_error

    async def _call_api(self, prompt: str) -> str:
        response = await self._request_with_retries(
            "POST",
            self.settings.chat_completions_url,
            json_payload={
                "model": self.settings.agentrouter_model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
            },
        )

        data = response.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise AppError(
                ERROR_CODES.AI_OUTPUT_INVALID,
                "Unexpected AI response shape",
                status_code=502,
            ) from exc

    async def close(self) -> None:
        if self._owns_client and self._client is not None:
            await self._client.aclose()
            self._client = None

    async def aclose(self) -> None:
        await self.close()

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.close()


_client: AgentRouterClient | None = None


def get_ai_client() -> AgentRouterClient:
    global _client
    if _client is None:
        _client = AgentRouterClient()
    return _client


async def close_ai_client() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None
