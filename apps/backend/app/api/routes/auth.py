from fastapi import APIRouter, Response

from app.api.deps import DBSession
from app.core.config import get_settings
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE_NAME = "rag_access_token"


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(body: UserCreate, db: DBSession) -> UserResponse:
    user = await AuthService(db).register(
        email=body.email, password=body.password, full_name=body.full_name
    )
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: DBSession, response: Response) -> TokenResponse:
    token = await AuthService(db).login(email=body.email, password=body.password)
    settings = get_settings()
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=settings.jwt_access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        path="/",
    )
    return TokenResponse(access_token=token)


@router.post("/logout", status_code=204)
async def logout(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        path="/",
    )
