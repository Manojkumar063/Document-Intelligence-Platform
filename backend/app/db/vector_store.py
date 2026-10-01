"""Qdrant HTTP client for scalable vector search and payload filtering."""
import asyncio
from typing import Any

import httpx

from app.core.config import get_settings
from app.db.models.chunk import DocumentChunk

settings = get_settings()
_client: httpx.AsyncClient | None = None
_collection_ready = False
_collection_lock = asyncio.Lock()


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(base_url=settings.qdrant_url.rstrip("/"), timeout=30.0)
    return _client


def _collection_path(suffix: str = "") -> str:
    return f"/collections/{settings.qdrant_collection}{suffix}"


async def ensure_vector_collection() -> None:
    global _collection_ready
    if _collection_ready:
        return
    async with _collection_lock:
        if _collection_ready:
            return
        client = _get_client()
        response: httpx.Response | None = None
        for attempt in range(30):
            try:
                response = await client.get(_collection_path())
                break
            except httpx.RequestError:
                if attempt == 29:
                    raise
                await asyncio.sleep(1)

        if response is None:
            raise RuntimeError("Qdrant did not respond")
        if response.status_code == 404:
            response = await client.put(
                _collection_path(),
                json={
                    "vectors": {
                        "size": settings.vector_dimension,
                        "distance": "Cosine",
                    }
                },
            )
            if response.is_error:
                existing = await client.get(_collection_path())
                if existing.is_error:
                    response.raise_for_status()
                response = existing
        response.raise_for_status()

        for field_name, field_schema in (
            ("document_id", "keyword"),
            ("collection_id", "keyword"),
            ("status", "keyword"),
            ("is_shared", "bool"),
        ):
            index_response = await client.put(
                f"{_collection_path()}/index",
                params={"field_name": field_name},
                json={"field_schema": field_schema},
            )
            index_response.raise_for_status()
        _collection_ready = True


async def close_vector_store() -> None:
    global _client, _collection_ready
    if _client is not None:
        await _client.aclose()
        _client = None
    _collection_ready = False


def _document_filter(
    document_id: str | None = None,
    status: str | None = None,
    is_shared: bool | None = None,
    collection_id: str | None = None,
) -> dict[str, Any]:
    must: list[dict[str, Any]] = []
    if document_id is not None:
        must.append({"key": "document_id", "match": {"value": document_id}})
    if status is not None:
        must.append({"key": "status", "match": {"value": status}})
    if is_shared is not None:
        must.append({"key": "is_shared", "match": {"value": is_shared}})
    if collection_id is not None:
        must.append({"key": "collection_id", "match": {"value": collection_id}})
    return {"must": must}


async def upsert_document_chunks(
    doc_id: str,
    chunks: list[DocumentChunk],
    vectors: list[list[float]],
    is_shared: bool,
    collection_id: str | None,
) -> None:
    await ensure_vector_collection()
    points = [
        {
            "id": chunk.id,
            "vector": vectors[index],
            "payload": {
                "document_id": doc_id,
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
                "page_number": chunk.page_number,
                "token_count": chunk.token_count,
                "metadata": chunk.metadata_,
                "status": "processing",
                "is_shared": is_shared,
                "collection_id": collection_id,
            },
        }
        for index, chunk in enumerate(chunks)
    ]
    client = _get_client()
    for start in range(0, len(points), 128):
        response = await client.put(
            f"{_collection_path()}/points",
            params={"wait": "true"},
            json={"points": points[start : start + 128]},
        )
        response.raise_for_status()


async def delete_document_vectors(doc_id: str) -> None:
    await ensure_vector_collection()
    response = await _get_client().post(
        f"{_collection_path()}/points/delete",
        params={"wait": "true"},
        json={"filter": _document_filter(document_id=doc_id)},
    )
    response.raise_for_status()


async def set_document_vector_payload(doc_id: str, payload: dict[str, Any]) -> None:
    await ensure_vector_collection()
    response = await _get_client().post(
        f"{_collection_path()}/points/payload",
        params={"wait": "true"},
        json={"payload": payload, "filter": _document_filter(document_id=doc_id)},
    )
    response.raise_for_status()


async def set_document_vector_status(doc_id: str, status: str) -> None:
    await set_document_vector_payload(doc_id, {"status": status})


async def search_vectors(
    query_vector: list[float],
    limit: int,
    is_admin: bool,
    collection_id: str | None = None,
) -> list[dict[str, Any]]:
    await ensure_vector_collection()
    must: list[dict[str, Any]] = [
        {"key": "status", "match": {"value": "completed"}},
    ]
    if not is_admin:
        must.append({"key": "is_shared", "match": {"value": True}})
    if collection_id is not None:
        must.append({"key": "collection_id", "match": {"value": collection_id}})

    response = await _get_client().post(
        f"{_collection_path()}/points/search",
        json={
            "vector": query_vector,
            "filter": {"must": must},
            "limit": limit,
            "with_payload": True,
            "with_vector": False,
        },
    )
    response.raise_for_status()
    return response.json().get("result", [])


async def upsert_legacy_points(points: list[dict[str, Any]]) -> None:
    await ensure_vector_collection()
    client = _get_client()
    for start in range(0, len(points), 128):
        response = await client.put(
            f"{_collection_path()}/points",
            params={"wait": "true"},
            json={"points": points[start : start + 128]},
        )
        response.raise_for_status()
