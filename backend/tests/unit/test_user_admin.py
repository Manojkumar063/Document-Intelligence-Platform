from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.api.routes.users import update_user_role
from app.db.models.user import User
from app.schemas.user import UserRoleUpdate
from app.utils.exceptions import ConflictError


def make_user(user_id: str, role: str) -> User:
    now = datetime.now(timezone.utc)
    return User(
        id=user_id,
        email=f"{user_id}@example.com",
        hashed_password="hash",
        full_name=user_id,
        role=role,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
async def test_admin_can_promote_user() -> None:
    target = make_user("member", "user")
    repo = AsyncMock()
    repo.get_by_id.return_value = target

    with patch("app.api.routes.users.UserRepository", return_value=repo):
        response = await update_user_role("member", UserRoleUpdate(role="admin"), "admin", None)

    assert response.role == "admin"
    repo.set_role.assert_awaited_once_with("member", "admin")


@pytest.mark.asyncio
async def test_last_active_admin_cannot_be_demoted() -> None:
    target = make_user("admin", "admin")
    repo = AsyncMock()
    repo.get_by_id.return_value = target
    repo.list_all.return_value = [target]

    with patch("app.api.routes.users.UserRepository", return_value=repo):
        with pytest.raises(ConflictError, match="last active admin"):
            await update_user_role("admin", UserRoleUpdate(role="user"), "admin", None)

    repo.set_role.assert_not_awaited()