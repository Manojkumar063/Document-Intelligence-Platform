"""
Shared test fixtures.

Unit tests use mongomock-motor (no real DB needed).
Set MONGODB_URL to a real MongoDB instance for integration tests.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
