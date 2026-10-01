from unittest.mock import AsyncMock

import pytest

from app.api.routes.admin import get_admin_stats


class FakeDatabase:
    def __init__(self) -> None:
        self.collections = {
            "users": AsyncMock(),
            "documents": AsyncMock(),
            "conversations": AsyncMock(),
            "usage_events": AsyncMock(),
        }
        self.collections["users"].count_documents.side_effect = [12, 10, 2]
        self.collections["documents"].count_documents.side_effect = [8, 1, 2, 4, 1]
        self.collections["conversations"].count_documents.return_value = 20
        self.collections["usage_events"].count_documents.side_effect = [60, 15, 10, 3]

    def __getitem__(self, name: str) -> AsyncMock:
        return self.collections[name]


@pytest.mark.asyncio
async def test_admin_stats_aggregate_system_counts() -> None:
    stats = await get_admin_stats("admin-id", FakeDatabase())

    assert stats.total_users == 12
    assert stats.active_users == 10
    assert stats.admin_users == 2
    assert stats.total_documents == 8
    assert stats.processing_documents == 2
    assert stats.failed_documents == 1
    assert stats.total_conversations == 20
    assert stats.total_usage_events == 60
    assert stats.usage_events_30d == 15
    assert stats.chat_queries_30d == 10
    assert stats.uploads_30d == 3