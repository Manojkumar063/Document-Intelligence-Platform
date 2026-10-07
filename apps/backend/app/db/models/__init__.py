"""
Import all models here so Alembic's env.py can discover them
via `Base.metadata` in a single import.
"""
from app.db.models.chunk import DocumentChunk
from app.db.models.conversation import Conversation, Message
from app.db.models.document import Document, DocumentStatus
from app.db.models.user import User

__all__ = [
    "User",
    "Document",
    "DocumentStatus",
    "DocumentChunk",
    "Conversation",
    "Message",
]
