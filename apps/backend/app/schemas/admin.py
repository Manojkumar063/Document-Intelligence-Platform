from pydantic import BaseModel


class PipelineStage(BaseModel):
    stage: str
    success_rate: float
    avg_time_ms: int
    p95_time_ms: int


class AdminStats(BaseModel):
    # Users
    total_users: int
    active_users: int
    admin_users: int
    # Documents
    total_documents: int
    uploaded_documents: int
    processing_documents: int
    completed_documents: int
    failed_documents: int
    total_chunks: int
    # Conversations & usage
    total_conversations: int
    total_usage_events: int
    usage_events_30d: int
    chat_queries_30d: int
    uploads_30d: int
    # Dashboard extras
    successful_responses_30d: int
    collections_count: int
    pipeline_stages: list[PipelineStage]
