# ============================================================
# app/core/config.py
# Centralised configuration via pydantic-settings.
# All config comes from environment variables or .env file.
# Never access os.environ directly — always use settings.
# ============================================================
from __future__ import annotations

from functools import lru_cache
from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ─────────────────────────────────────────
    app_name: str    = Field(default="emart-course-service")
    app_version: str = Field(default="1.0.0")
    app_env: str     = Field(default="development")
    port: int        = Field(default=8083)
    debug: bool      = Field(default=False)

    # ── PostgreSQL ───────────────────────────────────────────
    db_host: str     = Field(default="localhost")
    db_port: int     = Field(default=5432)
    db_name: str     = Field(default="coursedb")
    db_user: str     = Field(default="emart_course")
    db_password: str = Field(default="")
    db_pool_min: int = Field(default=2)
    db_pool_max: int = Field(default=10)
    db_ssl: bool     = Field(default=False)

    # ── JWT — MUST match Login Service JWT_SECRET exactly ────
    jwt_secret: str      = Field(default="")
    jwt_algorithm: str   = Field(default="HS256")

    # ── Logging ──────────────────────────────────────────────
    log_level: str   = Field(default="INFO")
    log_json: bool   = Field(default=False)

    # ── Computed ─────────────────────────────────────────────
    @computed_field
    @property
    def database_url(self) -> str:
        """Async SQLAlchemy URL for asyncpg driver."""
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @computed_field
    @property
    def database_url_sync(self) -> str:
        """Sync URL (used only for Alembic / test setup)."""
        return (
            f"postgresql+psycopg2://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @computed_field
    @property
    def is_production(self) -> bool:
        return self.app_env in ("production", "prod")

    def validate_required(self) -> None:
        """Fail fast in production if critical vars are missing."""
        if self.is_production:
            missing = []
            if not self.jwt_secret:
                missing.append("JWT_SECRET")
            if not self.db_password:
                missing.append("DB_PASSWORD")
            if missing:
                raise ValueError(f"Missing required env vars: {', '.join(missing)}")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached singleton — call get_settings() everywhere."""
    s = Settings()
    s.validate_required()
    return s
