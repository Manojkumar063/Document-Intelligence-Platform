import json

import httpx
import pytest

from app.db import vector_store


@pytest.mark.asyncio
async def test_vector_search_filters_shared_collection_and_status(monkeypatch: pytest.MonkeyPatch) -> None:
    request_body: dict = {}

    def respond(request: httpx.Request) -> httpx.Response:
        request_body.update(json.loads(request.content))
        return httpx.Response(200, json={"result": []})

    async with httpx.AsyncClient(
        base_url="http://qdrant.test",
        transport=httpx.MockTransport(respond),
    ) as client:
        monkeypatch.setattr(vector_store, "_client", client)
        monkeypatch.setattr(vector_store, "_collection_ready", True)
        await vector_store.search_vectors([0.1, 0.2], 5, is_admin=False, collection_id="hr")

    assert request_body["limit"] == 5
    assert request_body["filter"]["must"] == [
        {"key": "status", "match": {"value": "completed"}},
        {"key": "is_shared", "match": {"value": True}},
        {"key": "collection_id", "match": {"value": "hr"}},
    ]


@pytest.mark.asyncio
async def test_admin_vector_search_includes_private_documents(monkeypatch: pytest.MonkeyPatch) -> None:
    request_body: dict = {}

    def respond(request: httpx.Request) -> httpx.Response:
        request_body.update(json.loads(request.content))
        return httpx.Response(200, json={"result": []})

    async with httpx.AsyncClient(
        base_url="http://qdrant.test",
        transport=httpx.MockTransport(respond),
    ) as client:
        monkeypatch.setattr(vector_store, "_client", client)
        monkeypatch.setattr(vector_store, "_collection_ready", True)
        await vector_store.search_vectors([0.1, 0.2], 5, is_admin=True)

    assert request_body["filter"]["must"] == [
        {"key": "status", "match": {"value": "completed"}},
    ]
