"""Copy existing MongoDB chunk embeddings into Qdrant."""
import asyncio
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.db.vector_store import close_vector_store, ensure_vector_collection, upsert_legacy_points

settings = get_settings()


async def main() -> None:
    mongo = AsyncIOMotorClient(settings.mongodb_url)
    db = mongo[settings.mongodb_db]
    await ensure_vector_collection()
    indexed = 0
    cursor = db["documents"].find({"status": "completed"})

    async for document in cursor:
        document_id = str(document["_id"])
        chunks = db["document_chunks"].find(
            {"document_id": document_id, "embedding": {"$exists": True, "$ne": []}}
        )
        points: list[dict[str, Any]] = []
        async for chunk in chunks:
            points.append(
                {
                    "id": str(chunk["_id"]),
                    "vector": chunk["embedding"],
                    "payload": {
                        "document_id": document_id,
                        "chunk_index": chunk["chunk_index"],
                        "content": chunk["content"],
                        "page_number": chunk.get("page_number"),
                        "token_count": chunk.get("token_count", 0),
                        "metadata": chunk.get("metadata", {}),
                        "status": "completed",
                        "is_shared": document.get("is_shared", True),
                        "collection_id": document.get("collection_id"),
                    },
                }
            )
            if len(points) == 128:
                await upsert_legacy_points(points)
                indexed += len(points)
                points.clear()
        if points:
            await upsert_legacy_points(points)
            indexed += len(points)

    mongo.close()
    await close_vector_store()
    print(f"Indexed {indexed} document chunks into Qdrant")


if __name__ == "__main__":
    asyncio.run(main())
