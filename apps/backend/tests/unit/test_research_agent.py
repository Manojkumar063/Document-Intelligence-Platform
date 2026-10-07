from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.api.routes.conversations import _generate_answer
from app.db.models.conversation import Message
from app.rag.retrieval import RetrievedChunk
from app.rag.workflows import ResearchPlan, run_research
from app.schemas.conversation import ChatRequest, MessageResponse


def make_chunk(chunk_id: str, filename: str, content: str) -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id=chunk_id,
        document_id=f"doc-{chunk_id}",
        content=content,
        similarity=0.8,
        page_number=1,
        metadata={"filename": filename},
    )


@pytest.mark.asyncio
async def test_research_plans_searches_deduplicates_sources_and_cites_context(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    question = "Compare the support and warranty policies"
    first = make_chunk("1", "support.pdf", "Support is available by email.")
    second = make_chunk("2", "warranty.pdf", "The warranty lasts two years.")
    planner = SimpleNamespace(ainvoke=AsyncMock(return_value=ResearchPlan(queries=[
        "support policy contact",
        "warranty policy duration",
    ])))
    llm = Mock()
    llm.with_structured_output.return_value = planner
    llm.ainvoke = AsyncMock(return_value=SimpleNamespace(content="Support is by email [1]. Warranty lasts two years [2]."))
    retrieve_mock = AsyncMock(side_effect=[
        [first],
        [first, second],
        [second],
    ])
    rerank_mock = AsyncMock(side_effect=lambda _question, chunks: chunks)
    monkeypatch.setattr("app.rag.workflows._build_llm", lambda: llm)
    monkeypatch.setattr("app.rag.workflows.retrieve", retrieve_mock)
    monkeypatch.setattr("app.rag.workflows.rerank", rerank_mock)
    result = await run_research(question, AsyncMock(), "user-1", "collection-1")

    assert result.answer.endswith("[2].")
    assert [chunk.chunk_id for chunk in result.sources] == ["1", "2"]
    assert retrieve_mock.await_count == 3
    assert all(call.kwargs["collection_id"] == "collection-1" for call in retrieve_mock.await_args_list)
    synthesis = llm.ainvoke.await_args.args[0]
    assert "[1] Source: support.pdf, page 1" in synthesis[0].content
    assert "[2] Source: warranty.pdf, page 1" in synthesis[0].content


@pytest.mark.asyncio
async def test_research_returns_without_synthesis_when_no_evidence(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    planner = SimpleNamespace(ainvoke=AsyncMock(return_value=ResearchPlan(queries=[])))
    llm = Mock()
    llm.with_structured_output.return_value = planner
    llm.ainvoke = AsyncMock()
    monkeypatch.setattr("app.rag.workflows._build_llm", lambda: llm)
    monkeypatch.setattr("app.rag.workflows.retrieve", AsyncMock(return_value=[]))

    result = await run_research("A question without evidence", AsyncMock(), "user-1")

    assert not result.sources
    assert "couldn't find" in result.answer
    llm.ainvoke.assert_not_awaited()


def test_chat_request_defaults_to_quick_answer_and_validates_agent_mode() -> None:
    assert ChatRequest(message="Summarize this").agent_mode == "chat"
    assert ChatRequest(message="Compare these", agent_mode="research").agent_mode == "research"


def test_old_messages_default_to_quick_answer_mode() -> None:
    message = MessageResponse(
        id="message-1",
        role="assistant",
        content="Answer",
        created_at="2026-01-01T00:00:00Z",
    )

    assert message.agent_mode == "chat"


def test_agent_mode_survives_message_storage_round_trip() -> None:
    original = Message(
        conversation_id="conversation-1",
        role="assistant",
        content="A cited answer",
        agent_mode="research",
    )

    restored = Message.from_doc(original.to_doc())

    assert restored.agent_mode == "research"


@pytest.mark.asyncio
async def test_research_chat_mode_calls_research_workflow_and_returns_sources() -> None:
    chunk = make_chunk("1", "guide.pdf", "The guide says to contact support.")
    result = SimpleNamespace(answer="Contact support [1].", sources=[chunk])
    workflow = AsyncMock(return_value=result)
    usage = AsyncMock()

    with (
        patch("app.rag.workflows.run_research", workflow),
        patch("app.api.routes.conversations.UsageRepository", return_value=usage),
    ):
        answer, sources = await _generate_answer(
            "How do I get support?", "collection-1", "user-1", AsyncMock(), "research"
        )

    assert answer == "Contact support [1]."
    assert sources[0].filename == "guide.pdf"
    assert sources[0].snippet == "The guide says to contact support."
    workflow.assert_awaited_once()
    usage.record.assert_awaited_once_with("user-1", "chat_query")
