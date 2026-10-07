import asyncio
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter

from app.api.deps import CurrentAdminUserID, DBSession
from app.db.models.document import DocumentStatus
from app.schemas.admin import AdminStats

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(admin_user_id: CurrentAdminUserID, db: DBSession) -> AdminStats:
    month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    counts = await asyncio.gather(
        db["users"].count_documents({}),
        db["users"].count_documents({"is_active": True}),
        db["users"].count_documents({"role": "admin"}),
        db["documents"].count_documents({}),
        db["documents"].count_documents({"status": DocumentStatus.UPLOADED}),
        db["documents"].count_documents({"status": DocumentStatus.PROCESSING}),
        db["documents"].count_documents({"status": DocumentStatus.COMPLETED}),
        db["documents"].count_documents({"status": DocumentStatus.FAILED}),
        db["conversations"].count_documents({}),
        db["usage_events"].count_documents({}),
        db["usage_events"].count_documents({"created_at": {"$gte": month_ago}}),
        db["usage_events"].count_documents({"action": "chat_query", "created_at": {"$gte": month_ago}}),
        db["usage_events"].count_documents({"action": "document_upload", "created_at": {"$gte": month_ago}}),
    )
    return AdminStats(
        total_users=counts[0],
        active_users=counts[1],
        admin_users=counts[2],
        total_documents=counts[3],
        uploaded_documents=counts[4],
        processing_documents=counts[5],
        completed_documents=counts[6],
        failed_documents=counts[7],
        total_conversations=counts[8],
        total_usage_events=counts[9],
        usage_events_30d=counts[10],
        chat_queries_30d=counts[11],
        uploads_30d=counts[12],
    )