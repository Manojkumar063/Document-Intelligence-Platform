"""FastAPI application factory."""
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.logging import get_logger, setup_logging
from app.core.middleware import RequestIDMiddleware
from app.db.database import close_db, get_database
from app.db.vector_store import close_vector_store
from app.utils.exceptions import AppError

logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    setup_logging(debug=settings.debug)
    logger.info("Starting RAG application", extra={"version": settings.app_version})
    # Create MongoDB indexes on startup
    db = get_database()
    await db["users"].create_index("email", unique=True)
    await db["documents"].create_index("user_id")
    await db["document_chunks"].create_index("document_id")
    await db["conversations"].create_index("user_id")
    await db["messages"].create_index("conversation_id")
    await db["notifications"].create_index([("user_id", 1), ("created_at", -1)])
    await db["usage_events"].create_index([("action", 1), ("created_at", -1)])
    await db["document_versions"].create_index([("document_id", 1), ("version", -1)])
    await db["collections"].create_index("name_key", unique=True)
    await db["documents"].create_index("collection_id")
    yield
    await close_db()
    await close_vector_store()
    logger.info("Shutting down RAG application")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        logger.warning("Application error", extra={"code": exc.code, "status": exc.status_code})
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error("Unhandled exception", extra={"error": str(exc)}, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}},
        )

    from app.api.routes import admin, health, auth, users, documents, conversations, notifications, collections
    app.include_router(health.router, prefix="/api/v1")
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(users.router, prefix="/api/v1")
    app.include_router(documents.router, prefix="/api/v1")
    app.include_router(conversations.router, prefix="/api/v1")
    app.include_router(admin.router, prefix="/api/v1")
    app.include_router(notifications.router, prefix="/api/v1")
    app.include_router(collections.router, prefix="/api/v1")

    return app


app = create_app()
