"""Conversation and Message schemas for MongoDB."""
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class Message:
    conversation_id: str
    role: str
    content: str
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    sources: list[dict] = field(default_factory=list)
    collection_id: str | None = None
    agent_mode: str = "chat"
    feedback: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_doc(self) -> dict:
        return {
            "_id": self.id,
            "conversation_id": self.conversation_id,
            "role": self.role,
            "content": self.content,
            "sources": self.sources,
            "collection_id": self.collection_id,
            "agent_mode": self.agent_mode,
            "feedback": self.feedback,
            "created_at": self.created_at,
        }

    @staticmethod
    def from_doc(doc: dict) -> "Message":
        return Message(
            id=str(doc["_id"]),
            conversation_id=str(doc["conversation_id"]),
            role=doc["role"],
            content=doc["content"],
            sources=doc.get("sources", []),
            collection_id=doc.get("collection_id"),
            agent_mode=doc.get("agent_mode", "chat"),
            feedback=doc.get("feedback"),
            created_at=doc.get("created_at", datetime.now(timezone.utc)),
        )


@dataclass
class Conversation:
    user_id: str
    title: str = "New Conversation"
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    messages: list[Message] = field(default_factory=list)

    def to_doc(self) -> dict:
        return {
            "_id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @staticmethod
    def from_doc(doc: dict, messages: list[Message] | None = None) -> "Conversation":
        return Conversation(
            id=str(doc["_id"]),
            user_id=str(doc["user_id"]),
            title=doc.get("title", "New Conversation"),
            created_at=doc.get("created_at", datetime.now(timezone.utc)),
            updated_at=doc.get("updated_at", datetime.now(timezone.utc)),
            messages=messages or [],
        )
