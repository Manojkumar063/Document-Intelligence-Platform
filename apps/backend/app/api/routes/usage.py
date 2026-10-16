from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.deps import CurrentAdminUserID, CurrentUserID, DBSession
from app.core.config import get_settings

router = APIRouter(prefix="/usage", tags=["usage"])


class BudgetSettingsUpdate(BaseModel):
    monthly_budget_usd: float = Field(gt=0, le=1000000)
    monthly_token_quota: int = Field(gt=0, le=1000000000)
    requests_per_minute: int = Field(gt=0, le=10000)


@router.get("/me")
async def get_my_usage(user_id: CurrentUserID, db: DBSession) -> dict:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    pipeline = [
        {"$match": {"user_id": user_id, "created_at": {"$gte": month_start}, "action": {"$in": ["chat_query", "chat_query_failed", "embedding_usage"]}}},
        {"$group": {
            "_id": None,
            "requests": {"$sum": 1},
            "prompt_tokens": {"$sum": "$prompt_tokens"},
            "completion_tokens": {"$sum": "$completion_tokens"},
            "embedding_tokens": {"$sum": "$embedding_tokens"},
            "estimated_cost_usd": {"$sum": "$estimated_cost_usd"},
        }},
    ]
    rows = [row async for row in db["usage_events"].aggregate(pipeline)]
    totals = rows[0] if rows else {}
    budget = await db["usage_budgets"].find_one({"user_id": user_id}) or {}
    token_quota = budget.get("monthly_token_quota", settings.default_user_monthly_token_quota)
    monthly_budget = budget.get("monthly_budget_usd", settings.default_monthly_budget_usd)
    total_tokens = sum(int(totals.get(key, 0) or 0) for key in ("prompt_tokens", "completion_tokens", "embedding_tokens"))
    return {
        "period_start": month_start,
        "requests": totals.get("requests", 0),
        "prompt_tokens": totals.get("prompt_tokens", 0),
        "completion_tokens": totals.get("completion_tokens", 0),
        "embedding_tokens": totals.get("embedding_tokens", 0),
        "total_tokens": total_tokens,
        "estimated_cost_usd": round(float(totals.get("estimated_cost_usd", 0) or 0), 6),
        "monthly_budget_usd": monthly_budget,
        "budget_used_percent": round(float(totals.get("estimated_cost_usd", 0) or 0) / monthly_budget * 100, 2),
        "monthly_token_quota": token_quota,
        "token_quota_used_percent": round(total_tokens / token_quota * 100, 2),
        "requests_per_minute_limit": budget.get("requests_per_minute", settings.default_user_requests_per_minute),
        "pricing_note": "Cost is an estimate using configured per-million-token rates; unrecorded provider usage is not included.",
    }


@router.get("/admin")
async def get_usage_admin(
    admin_user_id: CurrentAdminUserID,
    db: DBSession,
    days: int = Query(default=30, ge=1, le=90),
) -> dict:
    from datetime import timedelta
    since = datetime.now(timezone.utc) - timedelta(days=days)
    pipeline = [
        {"$match": {"created_at": {"$gte": since}, "action": {"$in": ["chat_query", "chat_query_failed", "embedding_usage"]}}},
        {"$group": {
            "_id": "$user_id",
            "requests": {"$sum": 1},
            "prompt_tokens": {"$sum": "$prompt_tokens"},
            "completion_tokens": {"$sum": "$completion_tokens"},
            "embedding_tokens": {"$sum": "$embedding_tokens"},
            "estimated_cost_usd": {"$sum": "$estimated_cost_usd"},
        }},
        {"$sort": {"estimated_cost_usd": -1}},
        {"$limit": 100},
    ]
    usage_by_user = []
    async for row in db["usage_events"].aggregate(pipeline):
        usage_by_user.append({
            "user_id": row["_id"],
            "requests": row.get("requests", 0),
            "prompt_tokens": row.get("prompt_tokens", 0),
            "completion_tokens": row.get("completion_tokens", 0),
            "embedding_tokens": row.get("embedding_tokens", 0),
            "total_tokens": sum(int(row.get(key, 0) or 0) for key in ("prompt_tokens", "completion_tokens", "embedding_tokens")),
            "estimated_cost_usd": round(float(row.get("estimated_cost_usd", 0) or 0), 6),
        })
    return {"days": days, "users": usage_by_user}


@router.put("/admin/budgets/{target_user_id}")
async def update_user_budget(
    target_user_id: str,
    body: BudgetSettingsUpdate,
    admin_user_id: CurrentAdminUserID,
    db: DBSession,
) -> dict:
    await db["usage_budgets"].update_one(
        {"user_id": target_user_id},
        {"$set": {
            "user_id": target_user_id,
            "monthly_budget_usd": body.monthly_budget_usd,
            "monthly_token_quota": body.monthly_token_quota,
            "requests_per_minute": body.requests_per_minute,
            "updated_by": admin_user_id,
            "updated_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {"user_id": target_user_id, "monthly_budget_usd": body.monthly_budget_usd, "monthly_token_quota": body.monthly_token_quota, "requests_per_minute": body.requests_per_minute}
