"""Generate vector embeddings for text chunks."""
from functools import lru_cache

from langchain_openai import OpenAIEmbeddings

from app.core.config import get_settings

settings = get_settings()


@lru_cache(maxsize=1)
def get_embeddings() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(
        model=settings.embedding_model,
        openai_api_key=settings.llm_api_key,
    )


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Return a list of embedding vectors, one per input text."""
    embeddings = get_embeddings()
    return await embeddings.aembed_documents(texts)


async def embed_query(text: str) -> list[float]:
    """Return a single embedding vector for a query string."""
    embeddings = get_embeddings()
    return await embeddings.aembed_query(text)
