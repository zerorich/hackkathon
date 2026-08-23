from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from app.ai import AgentRouterClient, get_ai_client


@runtime_checkable
class AIClient(Protocol):
    async def complete(
        self,
        *,
        system: str,
        user: str,
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ) -> str: ...


class _AgentRouterAdapter:
    """Wraps Agent 1's AgentRouterClient to the agents-layer protocol."""

    def __init__(self, client: AgentRouterClient | Any) -> None:
        self._client = client

    @staticmethod
    def _extract_content(response: Any) -> str:
        if isinstance(response, str):
            return response

        choices = getattr(response, "choices", None)
        if choices:
            message = choices[0].message
            content = getattr(message, "content", None)
            if isinstance(content, str):
                return content
            if content is not None:
                return str(content)

        if isinstance(response, dict):
            try:
                content = response["choices"][0]["message"]["content"]
                return content if isinstance(content, str) else str(content)
            except (KeyError, IndexError, TypeError):
                pass

        raise TypeError("Unexpected chat_completions response shape")

    async def complete(
        self,
        *,
        system: str,
        user: str,
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ) -> str:
        if hasattr(self._client, "complete") and not isinstance(self._client, AgentRouterClient):
            return await self._client.complete(
                system=system,
                user=user,
                temperature=temperature,
                max_tokens=max_tokens,
            )

        response = await self._client.chat_completions(
            [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return self._extract_content(response)


def _wrap_client(client: Any) -> AIClient:
    if isinstance(client, _AgentRouterAdapter):
        return client
    if hasattr(client, "complete") and not isinstance(client, AgentRouterClient):
        return client
    if hasattr(client, "chat_completions") or isinstance(client, AgentRouterClient):
        return _AgentRouterAdapter(client)
    raise TypeError("Provided ai_client does not implement a supported completion interface")


async def resolve_ai_client(client: AIClient | AgentRouterClient | Any | None = None) -> AIClient:
    if client is not None:
        return _wrap_client(client)

    return _AgentRouterAdapter(get_ai_client())
