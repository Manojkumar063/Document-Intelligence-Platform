from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ConversationCreate(BaseModel):
    title: str = "New Conversation"


class ConversationRename(BaseModel):
    title: str = Field(min_length=1, max_length=100)

    @field_validator("title", mode="before")
    @classmethod
    def trim_title(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class MessageResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    role: str
    content: str
    sources: list[dict] = []
    collection_id: str | None = None
    agent_mode: Literal["chat", "research"] = "chat"
    feedback: str | None = None
    created_at: datetime


class ConversationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponse] = []


class ChatRequest(BaseModel):
    message: str
    collection_id: str | None = None
    agent_mode: Literal["chat", "research"] = "chat"


class MessageFeedback(BaseModel):
    rating: Literal["up", "down"]


class SourceReference(BaseModel):
    chunk_id: str
    document_id: str
    filename: str
    page: int | None = None
    similarity: float
    snippet: str = ""


class ChatResponse(BaseModel):
    conversation_id: str
    message: MessageResponse
    sources: list[SourceReference] = []
