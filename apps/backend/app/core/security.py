"""JWT token creation/verification and Argon2 password hashing."""
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.utils.exceptions import UnauthorizedError

settings = get_settings()

# Argon2 is the winner of the Password Hashing Competition — preferred over bcrypt.
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
_RESERVED_CLAIMS = {"sub", "exp", "iat", "nbf", "iss", "aud", "jti"}


def hash_password(plain: str) -> str:
    if not plain or len(plain) > 128:
        raise ValueError("Password must contain between 1 and 128 characters")
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except (ValueError, TypeError):
        return False


def create_access_token(subject: str, extra: dict[str, Any] | None = None) -> str:
    """Create a short-lived signed JWT. Reserved security claims cannot be overridden."""
    if not subject.strip():
        raise ValueError("Token subject must not be empty")
    now = datetime.now(UTC)
    expire = now + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    payload: dict[str, Any] = {}
    if extra:
        payload.update({key: value for key, value in extra.items() if key not in _RESERVED_CLAIMS})
    payload.update({"sub": subject, "exp": expire, "iat": now})
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and verify required JWT claims. Raises UnauthorizedError on any failure."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"require_sub": True, "require_exp": True, "require_iat": True},
        )
        if not isinstance(payload.get("sub"), str) or not payload["sub"].strip():
            raise UnauthorizedError("Token subject missing")
        if not isinstance(payload.get("iat"), (int, float)):
            raise UnauthorizedError("Token issued-at claim is invalid")
        return payload
    except JWTError as exc:
        raise UnauthorizedError("Invalid or expired token") from exc
