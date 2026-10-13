"""Generate vector embeddings for text chunks."""
from functools import lru_cache

from langchain_openai import OpenAIEmbeddings

from app.core.config import get_settings
from app.db.redis_client import cache_get, cache_set

settings = get_settings()


@lru_cache(maxsize=1)
def get_embeddings() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(
        model=settings.embedding_model,
        openai_api_key=settings.llm_api_key,
    )


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Return a list of embedding vectors, one per input text."""
    return await get_embeddings().aembed_documents(texts)


async def embed_query(text: str) -> list[float]:
    """Return a single embedding vector, served from Redis cache when available."""
    cached = await cache_get("emb", text)
    if cached is not None:
        return cached
    vector = await get_embeddings().aembed_query(text)
    await cache_set("emb", text, vector, ttl=86400)  # cache embeddings for 24h
    return vector
