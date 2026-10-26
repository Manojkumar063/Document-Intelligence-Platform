from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from app.rag.retrieval import RetrievedChunk
from app.rag.workflows import QueryRewrite, rewrite_query, run_rag


@pytest.mark.asyncio
async def test_rewrite_query_returns_rewritten_query(monkeypatch: pytest.MonkeyPatch) -> None:
    rewriter = SimpleNamespace(
        ainvoke=AsyncMock(return_value=QueryRewrite(query="JWT authentication configuration"))
    )
    llm = Mock()
    llm.with_structured_output.return_value = rewriter
    monkeypatch.setattr("app.rag.workflows._build_llm", lambda: llm)

    result = await rewrite_query("How does it handle login?")

    assert result == "JWT authentication configuration"
    rewriter.ainvoke.assert_awaited_once()


@pytest.mark.asyncio
async def test_rewrite_query_falls_back_to_original_when_llm_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    llm = Mock()
    llm.with_structured_output.side_effect = RuntimeError("LLM unavailable")
    monkeypatch.setattr("app.rag.workflows._build_llm", lambda: llm)

    question = "How does it handle login?"
    assert await rewrite_query(question) == question


@pytest.mark.asyncio
async def test_run_rag_uses_rewritten_query_for_retrieval(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    chunk = RetrievedChunk(
        chunk_id="chunk-1",
        document_id="doc-1",
        content="The application uses JWT authentication.",
        similarity=0.9,
        page_number=1,
        metadata={"filename": "auth.pdf"},
    )
    retrieve_mock = AsyncMock(return_value=[chunk])
    llm = Mock()
    llm.ainvoke = AsyncMock(return_value=SimpleNamespace(content="It uses JWT authentication."))
    monkeypatch.setattr("app.rag.workflows.is_rate_limited", AsyncMock(return_value=False))
    monkeypatch.setattr("app.rag.workflows.cache_get", AsyncMock(return_value=None))
    monkeypatch.setattr("app.rag.workflows.cache_set", AsyncMock())
    monkeypatch.setattr("app.rag.workflows.rewrite_query", AsyncMock(return_value="JWT authentication"))
    monkeypatch.setattr("app.rag.workflows.retrieve", retrieve_mock)
    monkeypatch.setattr("app.rag.workflows.rerank", AsyncMock(return_value=[chunk]))
    monkeypatch.setattr("app.rag.workflows._build_llm", lambda: llm)

    result = await run_rag("How does it handle login?", AsyncMock(), "user-1", "collection-1")

    assert result.answer == "It uses JWT authentication."
    retrieve_mock.assert_awaited_once_with(
        "JWT authentication",
        retrieve_mock.await_args.args[1],
        "user-1",
        collection_id="collection-1",
    )
