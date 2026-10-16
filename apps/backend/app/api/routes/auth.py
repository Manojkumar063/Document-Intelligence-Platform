from datetime import UTC, datetime
import hashlib

from fastapi import APIRouter, Cookie, Depends, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.deps import DBSession
from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.redis_client import blacklist_token, check_auth_rate_limit
from app.schemas.auth import LoginRequest, SessionResponse
from app.schemas.user import UserCreate, UserResponse
from app.services.auth_service import AuthService
from app.utils.exceptions import UnauthorizedError

router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE_NAME = "rag_access_token"
_bearer = HTTPBearer(auto_error=False)


async def enforce_auth_rate_limit(request: Request, identifier: str) -> None:
    client_ip = request.client.host if request.client else "unknown"
    # Limit both the source IP and the normalized account identifier.
    ip_key = hashlib.sha256(client_ip.encode()).hexdigest()
    account_key = hashlib.sha256(identifier.strip().lower().encode()).hexdigest()
    if await check_auth_rate_limit(f"ip:{ip_key}") or await check_auth_rate_limit(f"account:{account_key}"):
        from app.utils.exceptions import AppError
        raise AppError(
            message="Too many authentication attempts. Please try again later.",
            code="AUTH_RATE_LIMITED",
            status_code=429,
        )


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(body: UserCreate, request: Request, db: DBSession) -> UserResponse:
    await enforce_auth_rate_limit(request, body.email)
    user = await AuthService(db).register(
        email=body.email, password=body.password, full_name=body.full_name
    )
    return UserResponse.model_validate(user)


@router.post("/login", response_model=SessionResponse)
async def login(body: LoginRequest, request: Request, db: DBSession, response: Response) -> SessionResponse:
    await enforce_auth_rate_limit(request, str(body.email))
    token = await AuthService(db).login(email=str(body.email).strip().lower(), password=body.password)
    settings = get_settings()
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=settings.jwt_access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.environment.lower() == "production",
        samesite="lax",
        path="/",
    )
    return SessionResponse()


@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    response: Response,
    session_token: str | None = Cookie(default=None, alias=COOKIE_NAME),
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> None:
    settings = get_settings()
    token = session_token or (credentials.credentials if credentials else None)
    if token:
        payload = decode_access_token(token)
        expires_at = payload.get("exp")
        if not isinstance(expires_at, (int, float)):
            raise UnauthorizedError("Token expiry missing")
        ttl = max(int(expires_at - datetime.now(UTC).timestamp()), 1)
        await blacklist_token(token, ttl)
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        secure=settings.environment.lower() == "production",
        samesite="lax",
        path="/",
    )
