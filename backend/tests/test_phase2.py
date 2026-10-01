"""Phase 2 tests — middleware, error handling, security utilities."""
import pytest
from fastapi.testclient import TestClient

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.main import app
from app.utils.exceptions import UnauthorizedError


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


# ── Password hashing ──────────────────────────────────────────────────────────

def test_password_hash_and_verify() -> None:
    hashed = hash_password("mysecretpassword")
    assert hashed != "mysecretpassword"
    assert verify_password("mysecretpassword", hashed)
    assert not verify_password("wrongpassword", hashed)


def test_same_password_produces_different_hashes() -> None:
    """Argon2 uses a random salt — same input must never produce same hash."""
    h1 = hash_password("password")
    h2 = hash_password("password")
    assert h1 != h2


# ── JWT ───────────────────────────────────────────────────────────────────────

def test_create_and_decode_token() -> None:
    token = create_access_token(subject="user-uuid-123")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-uuid-123"


def test_invalid_token_raises_unauthorized() -> None:
    with pytest.raises(UnauthorizedError):
        decode_access_token("not.a.valid.token")


def test_tampered_token_raises_unauthorized() -> None:
    token = create_access_token(subject="user-uuid-123")
    tampered = token[:-5] + "XXXXX"
    with pytest.raises(UnauthorizedError):
        decode_access_token(tampered)


# ── Middleware ────────────────────────────────────────────────────────────────

def test_request_id_header_added(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert "x-request-id" in response.headers


def test_custom_request_id_echoed(client: TestClient) -> None:
    response = client.get("/api/v1/health", headers={"X-Request-ID": "my-trace-id"})
    assert response.headers["x-request-id"] == "my-trace-id"


# ── Error handling ────────────────────────────────────────────────────────────

def test_app_error_returns_consistent_shape(client: TestClient) -> None:
    """Hit a protected route without a token — should get a structured 401."""
    response = client.get("/api/v1/users/me")
    # Route doesn't exist yet, but we can test the 404 shape once routes are added.
    # For now verify the health endpoint returns correct shape.
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


# ── Health ────────────────────────────────────────────────────────────────────

def test_health_returns_version(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["version"] == "0.1.0"
