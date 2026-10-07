from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest

from app.db.repositories.collection_repo import CollectionRepository


class AsyncCursor:
    def __init__(self, documents: list[dict]) -> None:
        self.documents = documents
        self.index = 0

    def sort(self, *_args: object) -> "AsyncCursor":
        return self

    def __aiter__(self) -> "AsyncCursor":
        self.index = 0
        return self

    async def __anext__(self) -> dict:
        if self.index >= len(self.documents):
            raise StopAsyncIteration
        document = self.documents[self.index]
        self.index += 1
        return document


class FakeDatabase:
    def __init__(self) -> None:
        now = datetime.now(timezone.utc)
        self.collections = [
            {"_id": "shared", "name": "Shared", "created_by": "admin", "created_at": now},
            {"_id": "private", "name": "Private", "created_by": "admin", "created_at": now},
        ]
        self.collection_store = AsyncMock()
        self.document_store = AsyncMock()
        self.document_store.count_documents.side_effect = [3, 0]

    def __getitem__(self, name: str) -> AsyncMock:
        if name == "collections":
            self.collection_store.find.return_value = AsyncCursor(self.collections)
            return self.collection_store
        return self.document_store


@pytest.mark.asyncio
async def test_regular_users_only_see_collections_with_shared_documents() -> None:
    results = await CollectionRepository(FakeDatabase()).list_all(shared_only=True)

    assert [(collection.id, count) for collection, count in results] == [("shared", 3)]
    database = FakeDatabase()
    await CollectionRepository(database).list_all(shared_only=True)
    shared_query = database.document_store.count_documents.call_args_list[0].args[0]
    assert shared_query["$or"] == [
        {"is_shared": True},
        {"is_shared": {"$exists": False}},
    ]