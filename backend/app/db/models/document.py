"""Document document schema for MongoDB."""
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Document:
    user_id: str
    filename: str
    original_name: str
    file_path: str
    file_size: int
    mime_type: str
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    status: str = DocumentStatus.UPLOADED
    error_message: str | None = None
    chunk_count: int = 0
    is_shared: bool = True
    version: int = 1
    collection_id: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: datetime | None = None

    def to_doc(self) -> dict:
        return {
            "_id": self.id,
            "user_id": self.user_id,
            "filename": self.filename,
            "original_name": self.original_name,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "status": self.status,
            "error_message": self.error_message,
            "chunk_count": self.chunk_count,
            "is_shared": self.is_shared,
            "version": self.version,
            "collection_id": self.collection_id,
            "created_at": self.created_at,
            "processed_at": self.processed_at,
        }

    @staticmethod
    def from_doc(doc: dict) -> "Document":
        return Document(
            id=str(doc["_id"]),
            user_id=str(doc["user_id"]),
            filename=doc["filename"],
            original_name=doc["original_name"],
            file_path=doc["file_path"],
            file_size=doc["file_size"],
            mime_type=doc["mime_type"],
            status=doc.get("status", DocumentStatus.UPLOADED),
            error_message=doc.get("error_message"),
            chunk_count=doc.get("chunk_count", 0),
            is_shared=doc.get("is_shared", True),
            version=doc.get("version", 1),
            collection_id=doc.get("collection_id"),
            created_at=doc.get("created_at", datetime.now(timezone.utc)),
            processed_at=doc.get("processed_at"),
        )
