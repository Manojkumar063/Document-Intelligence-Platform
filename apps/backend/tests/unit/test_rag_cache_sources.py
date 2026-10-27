from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from app.rag.retrieval import RetrievedChunk
from app.rag.workflows import run_rag


def make_chunk() -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id="chunk-1",
        document_id="doc-1",
        content="The application uses JWT authentication.",
        similarity=0.9,
        page_number=3,
        metadata={"filename": "auth.pdf"},
    )


@pytest.mark.asyncio
async def test_rag_cache_hit_preserves_source_references(monkeypatch: pytest.MonkeyPatch) -> None:
    chunk = make_chunk()
    monkeypatch.setattr("app.rag.workflows.is_rate_limited", AsyncMock(return_value=False))
    monkeypatch.setattr(
        "app.rag.workflows.cache_get",
        AsyncMock(return_value={
            "answer": "The application uses JWT authentication.",
            "sources": [{
                "chunk_id": chunk.chunk_id,
                "document_id": chunk.document_id,
                "content": chunk.content,
                "similarity": chunk.similarity,
                "page_number": chunk.page_number,
                "metadata": chunk.metadata,
            }],
        }),
    )
    retrieve_mock = AsyncMock()
    monkeypatch.setattr("app.rag.workflows.retrieve", retrieve_mock)

    result = await run_rag("How does authentication work?", AsyncMock(), "user-1", "collection-1")

    assert result.answer == "The application uses JWT authentication."
    assert result.sources == [chunk]
    retrieve_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_legacy_answer_only_cache_is_not_returned_as_grounded(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    chunk = make_chunk()
    monkeypatch.setattr("app.rag.workflows.is_rate_limited", AsyncMock(return_value=False))
    monkeypatch.setattr(
        "app.rag.workflows.cache_get",
        AsyncMock(return_value={"answer": "A cached answer without source metadata."}),
    )
    retrieve_mock = AsyncMock(return_value=[chunk])
    monkeypatch.setattr("app.rag.workflows.retrieve", retrieve_mock)
    monkeypatch.setattr("app.rag.workflows.rerank", AsyncMock(return_value=[chunk]))
    cache_set_mock = AsyncMock()
    monkeypatch.setattr("app.rag.workflows.cache_set", cache_set_mock)

    llm = Mock()
    llm.ainvoke = AsyncMock(return_value=SimpleNamespace(content="The application uses JWT authentication."))
    monkeypatch.setattr("app.rag.workflows._build_llm", lambda: llm)

    result = await run_rag("How does authentication work?", AsyncMock(), "user-1", "collection-1")

    assert result.answer == "The application uses JWT authentication."
    assert result.sources == [chunk]
    retrieve_mock.assert_awaited_once()
    cached_payload = cache_set_mock.await_args.args[2]
    assert cached_payload["answer"] == result.answer
    assert cached_payload["sources"][0]["chunk_id"] == chunk.chunk_id
    assert cached_payload["sources"][0]["page_number"] == 3


@pytest.mark.asyncio
async def test_rag_does_not_call_llm_when_retrieval_finds_no_evidence(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.rag.workflows.is_rate_limited", AsyncMock(return_value=False))
    monkeypatch.setattr("app.rag.workflows.cache_get", AsyncMock(return_value=None))
    monkeypatch.setattr("app.rag.workflows.retrieve", AsyncMock(return_value=[]))
    llm = Mock()
    llm.ainvoke = AsyncMock()
    monkeypatch.setattr("app.rag.workflows._build_llm", lambda: llm)

    result = await run_rag("What is the leave policy?", AsyncMock(), "user-1", "collection-1")

    assert not result.sources
    assert "couldn't find supporting information" in result.answer
    llm.ainvoke.assert_not_awaited()
