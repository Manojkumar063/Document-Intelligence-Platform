"""Middleware: attaches a unique request_id to every request for tracing."""
import logging
import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        started_at = time.perf_counter()
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            logger.log(
                logging.ERROR if status_code >= 500 else (
                    logging.WARNING if status_code >= 400 else logging.INFO
                ),
                "HTTP request completed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": status_code,
                    "duration_ms": round((time.perf_counter() - started_at) * 1000, 2),
                },
            )


class SameOriginMutationMiddleware(BaseHTTPMiddleware):
    """Reject cross-origin browser mutations before cookie authentication is used."""

    _SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        origin = request.headers.get("origin")
        from app.core.config import get_settings

        allowed_origins = set(get_settings().cors_origins)
        if (
            request.method.upper() not in self._SAFE_METHODS
            and origin is not None
            and origin not in allowed_origins
        ):
            from fastapi.responses import JSONResponse

            return JSONResponse(
                status_code=403,
                content={
                    "error": {
                        "code": "CSRF_ORIGIN_REJECTED",
                        "message": "Request origin is not allowed",
                    }
                },
            )
        return await call_next(request)
