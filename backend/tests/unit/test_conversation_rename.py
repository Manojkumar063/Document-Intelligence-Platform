from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from pydantic import ValidationError

from app.api.routes.conversations import rename_conversation
from app.db.models.conversation import Conversation
from app.schemas.conversation import ConversationRename
from app.utils.exceptions import NotFoundError


def make_conversation(title: str) -> Conversation:
    now = datetime.now(timezone.utc)
    return Conversation(user_id="owner", title=title, created_at=now, updated_at=now)


def test_rename_title_is_trimmed_and_required() -> None:
    assert ConversationRename(title="  Research notes  ").title == "Research notes"
    with pytest.raises(ValidationError):
        ConversationRename(title="   ")


@pytest.mark.asyncio
async def test_rename_is_scoped_to_conversation_owner() -> None:
    repo = AsyncMock()
    repo.get_by_id.return_value = None

    with patch("app.api.routes.conversations.ConversationRepository", return_value=repo):
        with pytest.raises(NotFoundError):
            await rename_conversation("conversation-id", ConversationRename(title="Renamed"), "other-user", None)

    repo.update_title.assert_not_awaited()


@pytest.mark.asyncio
async def test_owner_can_rename_conversation() -> None:
    repo = AsyncMock()
    repo.get_by_id.side_effect = [make_conversation("Old title"), make_conversation("New title")]

    with patch("app.api.routes.conversations.ConversationRepository", return_value=repo):
        response = await rename_conversation("conversation-id", ConversationRename(title="New title"), "owner", None)

    assert response.title == "New title"
    repo.update_title.assert_awaited_once_with("conversation-id", "New title")