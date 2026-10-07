from unittest.mock import AsyncMock

import pytest

from app.api.deps import get_current_admin_user_id
from app.utils.exceptions import ForbiddenError


class FakeDatabase:
    def __init__(self, role: str) -> None:
        self.users = AsyncMock()
        self.users.find_one.return_value = {
            "_id": "test-user",
            "email": "test@example.com",
            "hashed_password": "hash",
            "full_name": "Test User",
            "role": role,
        }

    def __getitem__(self, collection: str) -> AsyncMock:
        assert collection == "users"
        return self.users


@pytest.mark.asyncio
async def test_admin_user_can_upload() -> None:
    user_id = await get_current_admin_user_id("test-user", FakeDatabase("admin"))

    assert user_id == "test-user"


@pytest.mark.asyncio
async def test_regular_user_cannot_upload() -> None:
    with pytest.raises(ForbiddenError):
        await get_current_admin_user_id("test-user", FakeDatabase("user"))