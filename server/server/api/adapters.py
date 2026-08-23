from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from server.core.exceptions import AppError, ErrorCode


@runtime_checkable
class OrchestratorProtocol(Protocol):
    """Expected interface for multi-agent / background orchestration (Agent 5)."""

    async def generate_challenge(self, *, challenge_id: str, requested_by_id: str) -> None: ...

    async def retry_ai_job(self, *, job_id: str) -> None: ...


class ServiceRegistry:
    """Thin wiring layer so routers stay free of business internals."""

    def __init__(self) -> None:
        self.orchestrator: OrchestratorProtocol | None = None
        self.auth: Any | None = None
        self.classes: Any | None = None
        self.subjects: Any | None = None
        self.topics: Any | None = None
        self.challenges: Any | None = None
        self.attempts: Any | None = None
        self.duels: Any | None = None
        self.student: Any | None = None
        self.leaderboard: Any | None = None
        self.teacher: Any | None = None
        self.admin: Any | None = None

    def require(self, name: str) -> Any:
        service = getattr(self, name, None)
        if service is None:
            raise AppError(
                ErrorCode.INTERNAL_ERROR,
                f"Service '{name}' is not wired yet",
                status_code=503,
            )
        return service


_registry = ServiceRegistry()


def get_registry() -> ServiceRegistry:
    return _registry


def wire_orchestrator(orchestrator: OrchestratorProtocol) -> None:
    _registry.orchestrator = orchestrator


def wire_services(**services: Any) -> None:
    for name, service in services.items():
        if hasattr(_registry, name):
            setattr(_registry, name, service)


def autowire_from_packages() -> None:
    """Best-effort imports from sibling agent packages when they appear."""
    try:
        from server.agents.orchestrator import Orchestrator  # type: ignore[import-not-found]

        _registry.orchestrator = Orchestrator()
    except ImportError:
        pass

    service_modules = {
        "auth": "server.services.auth",
        "classes": "server.services.classes",
        "subjects": "server.services.subjects",
        "topics": "server.services.topics",
        "challenges": "server.services.challenges",
        "attempts": "server.services.attempts",
        "duels": "server.services.duels",
        "student": "server.services.student",
        "leaderboard": "server.services.leaderboard",
        "teacher": "server.services.teacher",
        "admin": "server.services.admin",
    }
    for attr, module_path in service_modules.items():
        if getattr(_registry, attr) is not None:
            continue
        try:
            import importlib

            module = importlib.import_module(module_path)
            service_cls = getattr(module, "Service", None)
            if service_cls is not None:
                setattr(_registry, attr, service_cls())
        except ImportError:
            continue
