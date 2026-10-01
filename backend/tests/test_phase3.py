"""Phase 3 tests — auth endpoints and user profile."""
import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


# ── Register ──────────────────────────────────────────────────────────────────

def test_register_missing_fields(client: TestClient) -> None:
    response = client.post("/api/v1/auth/register", json={})
    assert response.status_code == 422


def test_register_invalid_email(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": "secret", "full_name": "Test User"},
    )
    assert response.status_code == 422


# ── Login ─────────────────────────────────────────────────────────────────────

def test_login_missing_fields(client: TestClient) -> None:
    response = client.post("/api/v1/auth/login", json={})
    assert response.status_code == 422


# ── Users/me — unauthenticated ────────────────────────────────────────────────

def test_get_me_no_token(client: TestClient) -> None:
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_get_me_invalid_token(client: TestClient) -> None:
    response = client.get("/api/v1/users/me", headers={"Authorization": "Bearer bad.token.here"})
    assert response.status_code == 401


# ── Token shape ───────────────────────────────────────────────────────────────

def test_token_response_shape() -> None:
    from app.schemas.auth import TokenResponse
    token = create_access_token(subject="test-user-id")
    resp = TokenResponse(access_token=token)
    assert resp.token_type == "bearer"
    assert resp.access_token == token
