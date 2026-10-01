"""Phase 1 tests — config loading and health endpoint."""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_health_ready(client: TestClient) -> None:
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_config_loads() -> None:
    from app.core.config import get_settings
    settings = get_settings()
    assert settings.app_name == "RAG Application"
    assert settings.vector_dimension == 1536
    assert settings.chunk_size == 1000
