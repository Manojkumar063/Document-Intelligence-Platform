"""Document chunk text and metadata stored in MongoDB."""
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class DocumentChunk:
    document_id: str
    chunk_index: int
    content: str
    embedding: list[float]
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    page_number: int | None = None
    token_count: int = 0
    metadata_: dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_doc(self) -> dict:
        return {
            "_id": self.id,
            "document_id": self.document_id,
            "chunk_index": self.chunk_index,
            "content": self.content,
            "page_number": self.page_number,
            "token_count": self.token_count,
            "metadata": self.metadata_,
            "created_at": self.created_at,
        }

    @staticmethod
    def from_doc(doc: dict) -> "DocumentChunk":
        return DocumentChunk(
            id=str(doc["_id"]),
            document_id=str(doc["document_id"]),
            chunk_index=doc["chunk_index"],
            content=doc["content"],
            embedding=doc.get("embedding", []),
            page_number=doc.get("page_number"),
            token_count=doc.get("token_count", 0),
            metadata_=doc.get("metadata", {}),
            created_at=doc.get("created_at", datetime.now(timezone.utc)),
        )
