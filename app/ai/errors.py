from __future__ import annotations

from enum import StrEnum
from typing import Any


class AIClientErrorCode(StrEnum):
    TIMEOUT = "AI_CLIENT_TIMEOUT"
    NETWORK = "AI_CLIENT_NETWORK"
    RATE_LIMITED = "AI_CLIENT_RATE_LIMITED"
    SERVER_ERROR = "AI_CLIENT_SERVER_ERROR"
    INVALID_RESPONSE = "AI_CLIENT_INVALID_RESPONSE"
    AUTH_ERROR = "AI_CLIENT_AUTH_ERROR"
    CLIENT_ERROR = "AI_CLIENT_CLIENT_ERROR"


class AIClientError(Exception):
    def __init__(
        self,
        code: AIClientErrorCode,
        message: str,
        *,
        status_code: int | None = None,
        details: Any | None = None,
        retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        self.retryable = retryable
