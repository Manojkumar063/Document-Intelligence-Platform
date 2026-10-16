from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App
    app_name: str = "RAG Application"
    app_version: str = "0.1.0"
    debug: bool = False
    environment: str = "development"

    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "rag_db"

    # Vector search
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "document_chunks"

    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30

    # LLM
    llm_provider: str = "openai"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.0
    llm_max_tokens: int = 2048
    llm_input_cost_per_million_tokens: float = 0.15
    llm_output_cost_per_million_tokens: float = 0.60
    embedding_cost_per_million_tokens: float = 0.02
    default_monthly_budget_usd: float = 25.0
    default_user_monthly_token_quota: int = 500000
    default_user_requests_per_minute: int = 20

    # Embeddings
    embedding_provider: str = "openai"
    embedding_model: str = "text-embedding-3-small"
    vector_dimension: int = 1536

    # RAG
    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k: int = 5
    reranking_enabled: bool = False

    # File storage
    storage_backend: Literal["local", "s3"] = "local"
    upload_dir: str = "uploads"
    max_file_size_mb: int = 50
    allowed_extensions: list[str] = ["pdf", "txt", "docx"]
    aws_region: str = "us-east-1"
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_session_token: str | None = None
    s3_bucket: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379"
    redis_enabled: bool = True
    cache_ttl_seconds: int = 3600
    rate_limit_requests: int = 20
    rate_limit_window_seconds: int = 60
    auth_rate_limit_requests: int = 10
    auth_rate_limit_window_seconds: int = 60

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    @model_validator(mode="after")
    def validate_file_storage(self) -> "Settings":
        if self.storage_backend == "s3" and not self.s3_bucket.strip():
            raise ValueError("S3_BUCKET is required when STORAGE_BACKEND=s3")
        if bool(self.aws_access_key_id) != bool(self.aws_secret_access_key):
            raise ValueError("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set together")
        if self.environment.lower() == "production" and not self.redis_enabled:
            raise ValueError("Redis must be enabled in production for session revocation and authentication rate limiting")
        if self.jwt_access_token_expire_minutes < 1:
            raise ValueError("JWT access-token lifetime must be at least one minute")
        if self.auth_rate_limit_requests < 1 or self.auth_rate_limit_window_seconds < 1:
            raise ValueError("Authentication rate limits must be positive")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
