"""User document schema for MongoDB."""
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class User:
    email: str
    hashed_password: str
    full_name: str
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    role: str = "user"  # "user" | "admin"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_doc(self) -> dict:
        return {
            "_id": self.id,
            "email": self.email,
            "hashed_password": self.hashed_password,
            "full_name": self.full_name,
            "is_active": self.is_active,
            "role": self.role,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @staticmethod
    def from_doc(doc: dict) -> "User":
        return User(
            id=str(doc["_id"]),
            email=doc["email"],
            hashed_password=doc["hashed_password"],
            full_name=doc["full_name"],
            is_active=doc.get("is_active", True),
            role=doc.get("role", "user"),
            created_at=doc.get("created_at", datetime.now(timezone.utc)),
            updated_at=doc.get("updated_at", datetime.now(timezone.utc)),
        )
