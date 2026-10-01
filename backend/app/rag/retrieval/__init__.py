"""Retrieve top-k similar chunks from Qdrant."""
from dataclasses import dataclass

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.db.vector_store import search_vectors
from app.rag.embeddings import embed_query

settings = get_settings()


@dataclass
class RetrievedChunk:
    chunk_id: str
    document_id: str
    content: str
    similarity: float
    page_number: int | None
    metadata: dict


async def retrieve(
    query: str,
    db: AsyncIOMotorDatabase,
    user_id: str,
    top_k: int | None = None,
    collection_id: str | None = None,
) -> list[RetrievedChunk]:
    k = top_k or settings.top_k
    query_vector = await embed_query(query)

    user = await db["users"].find_one({"_id": user_id}, {"role": 1})
    points = await search_vectors(
        query_vector=query_vector,
        limit=k,
        is_admin=bool(user and user.get("role") == "admin"),
        collection_id=collection_id,
    )
    return [
        RetrievedChunk(
            chunk_id=str(point["id"]),
            document_id=str(point["payload"]["document_id"]),
            content=point["payload"]["content"],
            similarity=float(point.get("score", 0.0)),
            page_number=point["payload"].get("page_number"),
            metadata=point["payload"].get("metadata", {}),
        )
        for point in points
    ]
