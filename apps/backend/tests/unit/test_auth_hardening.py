"""Regression tests for authentication hardening."""
from datetime import UTC, datetime, timedelta

import pytest
from pydantic import ValidationError

from app.core.security import create_access_token, decode_access_token, verify_password
from app.schemas.auth import LoginRequest
from app.schemas.user import UserCreate


def test_registration_normalizes_email_and_name() -> None:
    user = UserCreate(
        email="  Example.User@Example.com ",
        password="a-strong-password",
        full_name="  Example   User  ",
    )
    assert user.email == "example.user@example.com"
    assert user.full_name == "Example User"


@pytest.mark.parametrize(
    "payload",
    [
        {"email": "person@example.com", "password": "short", "full_name": "Person Name"},
        {"email": "person@example.com", "password": "x" * 129, "full_name": "Person Name"},
        {"email": "person@example.com", "password": "a-strong-password", "full_name": "  "},
    ],
)
def test_registration_rejects_weak_or_invalid_fields(payload: dict[str, str]) -> None:
    with pytest.raises(ValidationError):
        UserCreate(**payload)


def test_login_rejects_empty_or_oversized_password() -> None:
    with pytest.raises(ValidationError):
        LoginRequest(email="person@example.com", password="")
    with pytest.raises(ValidationError):
        LoginRequest(email="person@example.com", password="x" * 129)


def test_password_verification_handles_invalid_hash() -> None:
    assert not verify_password("some-password", "not-a-valid-password-hash")


def test_access_token_has_required_claims_and_round_trips() -> None:
    token = create_access_token("user-123")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-123"
    assert isinstance(payload["iat"], (int, float))
    assert payload["exp"] > datetime.now(UTC).timestamp()


def test_access_token_does_not_allow_reserved_claim_override() -> None:
    token = create_access_token(
        "user-123",
        {"sub": "attacker", "exp": (datetime.now(UTC) - timedelta(days=1)).timestamp()},
    )
    assert decode_access_token(token)["sub"] == "user-123"


def test_cross_origin_mutation_is_rejected() -> None:
    from fastapi.testclient import TestClient
    from app.main import app

    response = TestClient(app).post(
        "/api/v1/auth/logout",
        headers={"Origin": "https://attacker.example"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "CSRF_ORIGIN_REJECTED"
