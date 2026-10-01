"""Health check endpoints — liveness and readiness."""
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from app.api.deps import DBSession
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str


class ReadinessResponse(HealthResponse):
    database: str
    pgvector: str


@router.get("/health", response_model=HealthResponse, summary="Liveness check")
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=settings.app_version,
        environment=settings.environment,
    )


@router.get("/health/ready", response_model=ReadinessResponse, summary="Readiness check")
async def health_ready(db: DBSession) -> ReadinessResponse:
    """Verifies database connectivity and pgvector extension availability."""
    db_status = "unreachable"
    pgvector_status = "unavailable"

    try:
        await db.execute(text("SELECT 1"))
        db_status = "ok"

        result = await db.execute(
            text("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
        )
        pgvector_status = "ok" if result.scalar() else "not_installed"
    except Exception:
        pass

    overall = "ok" if db_status == "ok" and pgvector_status == "ok" else "degraded"

    return ReadinessResponse(
        status=overall,
        version=settings.app_version,
        environment=settings.environment,
        database=db_status,
        pgvector=pgvector_status,
    )
