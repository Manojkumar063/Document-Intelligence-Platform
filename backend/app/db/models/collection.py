"""Collection metadata for organizing shared documents."""
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class Collection:
    name: str
    created_by: str
    description: str = ""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_doc(self) -> dict:
        return {
            "_id": self.id,
            "name": self.name,
            "name_key": self.name.casefold(),
            "description": self.description,
            "created_by": self.created_by,
            "created_at": self.created_at,
        }

    @staticmethod
    def from_doc(doc: dict) -> "Collection":
        return Collection(
            id=str(doc["_id"]),
            name=doc["name"],
            description=doc.get("description", ""),
            created_by=str(doc["created_by"]),
            created_at=doc.get("created_at", datetime.now(timezone.utc)),
        )