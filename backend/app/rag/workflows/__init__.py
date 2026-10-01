"""RAG workflow: retrieve relevant chunks → generate answer with LLM."""
from dataclasses import dataclass

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.rag.prompts import RAG_SYSTEM_PROMPT
from app.rag.reranking import rerank
from app.rag.retrieval import RetrievedChunk, retrieve

settings = get_settings()


@dataclass
class RAGResult:
    answer: str
    sources: list[RetrievedChunk]


def _build_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.llm_model,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
        openai_api_key=settings.llm_api_key,
    )


async def run_rag(
    question: str,
    db: AsyncIOMotorDatabase,
    user_id: str,
    collection_id: str | None = None,
) -> RAGResult:
    chunks = await retrieve(question, db, user_id, collection_id=collection_id)
    chunks = await rerank(question, chunks)

    if not chunks:
        return RAGResult(
            answer="I couldn't find any relevant information in your documents to answer that question.",
            sources=[],
        )

    context = "\n\n---\n\n".join(
        f"[{c.metadata.get('filename', 'document')}]\n{c.content}" for c in chunks
    )

    llm = _build_llm()
    messages = [
        SystemMessage(content=RAG_SYSTEM_PROMPT.format(context=context)),
        HumanMessage(content=question),
    ]
    response = await llm.ainvoke(messages)
    return RAGResult(answer=str(response.content), sources=chunks)
