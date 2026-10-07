from pydantic import BaseModel


class AdminStats(BaseModel):
    total_users: int
    active_users: int
    admin_users: int
    total_documents: int
    uploaded_documents: int
    processing_documents: int
    completed_documents: int
    failed_documents: int
    total_conversations: int
    total_usage_events: int
    usage_events_30d: int
    chat_queries_30d: int
    uploads_30d: int