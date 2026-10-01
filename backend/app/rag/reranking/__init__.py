"""Optional reranking: re-scores retrieved chunks with a cross-encoder LLM call."""
from app.core.config import get_settings
from app.rag.retrieval import RetrievedChunk

settings = get_settings()


async def rerank(query: str, chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
    """Return chunks reranked by relevance. Falls back to original order if disabled."""
    if not settings.reranking_enabled or not chunks:
        return chunks

    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import HumanMessage

        llm = ChatOpenAI(
            model=settings.llm_model,
            temperature=0.0,
            openai_api_key=settings.llm_api_key,
        )

        scored: list[tuple[float, RetrievedChunk]] = []
        for chunk in chunks:
            prompt = (
                f"Rate how relevant this passage is to the query on a scale of 0.0 to 1.0.\n"
                f"Query: {query}\nPassage: {chunk.content[:500]}\n"
                f"Reply with only a number between 0.0 and 1.0."
            )
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            try:
                score = float(str(response.content).strip())
            except ValueError:
                score = chunk.similarity
            scored.append((score, chunk))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored]

    except Exception:
        return chunks
