from __future__ import annotations

from enum import StrEnum
from functools import lru_cache

from pydantic import Field, SecretStr, field_validator, model_validator
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
    app_name: str = "Zehn AI"
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
    otp_delivery_webhook_url: str | None = None

    agentrouter_api_key: SecretStr = Field(default=SecretStr("your-api-key-here"))
    agentrouter_base_url: str = "https://agentrouter.org/v1"
    agentrouter_model: str = "claude-opus-5"
    agentrouter_fallback_models: str = "gpt-5.6-sol,claude-opus-4-8"
    agentrouter_timeout_seconds: float = 120.0
    agentrouter_max_retries: int = 3
    agentrouter_user_agent: str = "claude-cli/2.1.119 (external, cli)"
    ai_use_fallback_on_error: bool = True
    ai_chat_active_limit_per_user: int = Field(default=2, ge=1, le=10)
    ai_chat_daily_limit_per_user: int = Field(default=100, ge=1, le=5000)
    ai_chat_context_messages: int = Field(default=20, ge=2, le=100)
    ai_chat_max_response_tokens: int = Field(default=800, ge=64, le=4000)
    ai_chat_max_response_chars: int = Field(default=12000, ge=500, le=50000)
    ai_chat_model_timeout_seconds: float = Field(default=15.0, ge=5.0, le=60.0)
    ai_chat_primary_model: str = "gpt-5.6-sol"

    demo_question_count: int = Field(default=5, ge=5, le=10)
    duel_expiry_hours: int = Field(default=24, ge=1)

    max_concurrent_ai_jobs: int = Field(default=2, ge=1, le=20)
    ai_generation_daily_limit_per_user: int = Field(default=30, ge=1, le=1000)
    ai_job_poll_interval_seconds: float = Field(default=1.0, ge=0.1, le=60)
    http_client_timeout_seconds: float = Field(default=30.0, ge=1)
    http_client_max_connections: int = Field(default=20, ge=1)

    seed_on_startup: bool = False

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+asyncpg://", 1)
        return value

    @model_validator(mode="after")
    def validate_production_safety(self) -> Settings:
        if self.app_env not in (AppEnv.STAGING, AppEnv.PRODUCTION):
            return self

        jwt_secret = self.jwt_secret.get_secret_value()
        if (
            len(jwt_secret) < 32
            or jwt_secret
            in {
                "dev-secret-change-in-production",
                "change-me-in-production",
            }
            or jwt_secret.startswith("replace-with-")
        ):
            raise ValueError("JWT_SECRET must be a unique secret of at least 32 characters")
        if self.otp_demo_mode:
            raise ValueError("OTP_DEMO_MODE must be false outside development")
        if not self.otp_delivery_webhook_url or "your-otp-provider.example" in (
            self.otp_delivery_webhook_url
        ):
            raise ValueError("OTP_DELIVERY_WEBHOOK_URL is required outside development")
        if self.is_sqlite:
            raise ValueError("PostgreSQL is required outside development")
        if not self.redis_url:
            raise ValueError("REDIS_URL is required outside development")
        provider_key = self.agentrouter_api_key.get_secret_value()
        if provider_key in {"", "your-api-key-here"} or provider_key.startswith("replace-with-"):
            raise ValueError("A real AGENTROUTER_API_KEY is required outside development")
        if self.seed_on_startup:
            raise ValueError("SEED_ON_STARTUP must be false outside development")
        if self.app_debug:
            raise ValueError("APP_DEBUG must be false outside development")
        return self

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

    @property
    def agentrouter_chat_models(self) -> tuple[str, ...]:
        models = [
            self.ai_chat_primary_model,
            self.agentrouter_model,
            *(model.strip() for model in self.agentrouter_fallback_models.split(",")),
        ]
        return tuple(dict.fromkeys(model for model in models if model))


@lru_cache
def get_settings() -> Settings:
    return Settings()


def clear_settings_cache() -> None:
    get_settings.cache_clear()
