from __future__ import annotations

from enum import StrEnum
from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppEnv(StrEnum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: AppEnv = AppEnv.DEVELOPMENT
    app_debug: bool = False
    app_name: str = "maktab-ai-arena"
    app_timezone: str = "Asia/Tashkent"
    api_v1_prefix: str = "/api/v1"

    host: str = "0.0.0.0"
    port: int = 8000

    database_url: str = "sqlite+aiosqlite:///./maktab.db"
    database_pool_size: int = Field(default=5, ge=1, le=50)
    database_max_overflow: int = Field(default=10, ge=0, le=100)
    database_pool_timeout_seconds: float = Field(default=30.0, ge=1)

    redis_url: str | None = None
    redis_leaderboard_ttl_seconds: int = Field(default=60, ge=5)
    redis_otp_cooldown_seconds: int = Field(default=60, ge=10)
    redis_ai_generation_limit_per_user: int = Field(default=3, ge=1)

    jwt_secret: SecretStr = Field(default=SecretStr("dev-secret-change-in-production"))
    jwt_access_ttl_minutes: int = Field(default=15, ge=1)
    jwt_refresh_ttl_days: int = Field(default=30, ge=1)
    jwt_algorithm: str = "HS256"

    otp_demo_mode: bool = True
    otp_demo_code: str = "123456"
    otp_ttl_minutes: int = Field(default=10, ge=1)
    otp_max_verify_attempts: int = Field(default=5, ge=1)

    agentrouter_api_key: SecretStr = Field(default=SecretStr("your-api-key-here"))
    agentrouter_base_url: str = "https://agentrouter.org/v1"
    agentrouter_model: str = "claude-opus-5"
    agentrouter_timeout_seconds: float = 120.0
    agentrouter_max_retries: int = 3
    agentrouter_user_agent: str = "claude-cli/2.1.119 (external, cli)"
    ai_use_fallback_on_error: bool = True

    demo_question_count: int = Field(default=5, ge=5, le=10)
    duel_expiry_hours: int = Field(default=24, ge=1)

    max_concurrent_ai_jobs: int = Field(default=2, ge=1, le=20)
    http_client_timeout_seconds: float = Field(default=30.0, ge=1)
    http_client_max_connections: int = Field(default=20, ge=1)

    seed_on_startup: bool = False

    @property
    def is_development(self) -> bool:
        return self.app_env == AppEnv.DEVELOPMENT

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def chat_completions_url(self) -> str:
        base = self.agentrouter_base_url.rstrip("/")
        return f"{base}/chat/completions"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def clear_settings_cache() -> None:
    get_settings.cache_clear()
