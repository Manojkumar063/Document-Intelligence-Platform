from datetime import date, datetime, timezone
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_user_id
from app.api.routes.workspace import (
    create_project,
    create_task,
    delete_project,
    list_projects,
    list_tasks,
    update_project,
    update_task,
)
from app.core.security import create_access_token
from app.db.database import get_db
from app.db.repositories.workspace_repo import WorkspaceRepository
from app.main import app
from app.schemas.workspace import ProjectCreate, ProjectUpdate, TaskCreate, TaskUpdate
from app.services.auth_service import AuthService
from app.utils.exceptions import ConflictError, ForbiddenError, NotFoundError


class AsyncCursor:
    def __init__(self, documents: list[dict[str, Any]]) -> None:
        self.documents = documents

    def sort(self, key: str, direction: int) -> "AsyncCursor":
        self.documents.sort(key=lambda item: item.get(key), reverse=direction < 0)
        return self

    def __aiter__(self) -> "AsyncCursor":
        self.index = 0
        return self

    async def __anext__(self) -> dict[str, Any]:
        if self.index >= len(self.documents):
            raise StopAsyncIteration
        item = self.documents[self.index]
        self.index += 1
        return item


class FakeCollection:
    def __init__(self) -> None:
        self.items: dict[str, dict[str, Any]] = {}

    async def find_one(self, query: dict[str, Any]) -> dict[str, Any] | None:
        return next((item for item in self.items.values() if self._matches(item, query)), None)

    def find(self, query: dict[str, Any]) -> AsyncCursor:
        return AsyncCursor([item for item in self.items.values() if self._matches(item, query)])

    async def count_documents(self, query: dict[str, Any]) -> int:
        return sum(self._matches(item, query) for item in self.items.values())

    async def insert_one(self, item: dict[str, Any]) -> None:
        self.items[item["_id"]] = item

    async def update_one(self, query: dict[str, Any], update: dict[str, Any]) -> None:
        item = await self.find_one(query)
        if item:
            item.update(update["$set"])
            for key in update.get("$unset", {}):
                item.pop(key, None)

    async def update_many(self, query: dict[str, Any], update: dict[str, Any]) -> None:
        for item in self.items.values():
            if self._matches(item, query):
                item.update(update.get("$set", {}))
                for key in update.get("$unset", {}):
                    item.pop(key, None)

    async def delete_one(self, query: dict[str, Any]) -> Any:
        item = await self.find_one(query)
        if item:
            del self.items[item["_id"]]
        return type("DeleteResult", (), {"deleted_count": int(item is not None)})()

    async def delete_many(self, query: dict[str, Any]) -> None:
        for item in list(self.items.values()):
            if self._matches(item, query):
                del self.items[item["_id"]]

    @staticmethod
    def _matches(item: dict[str, Any], query: dict[str, Any]) -> bool:
        for key, value in query.items():
            if isinstance(value, dict) and "$exists" in value:
                if (key in item) != value["$exists"]:
                    return False
            elif item.get(key) != value:
                return False
        return True


class FakeDatabase:
    def __init__(self) -> None:
        self.collections = {
            name: FakeCollection()
            for name in (
                "users",
                "workspace_projects",
                "workspace_tasks",
                "workspaces",
                "workspace_memberships",
                "workspace_invitations",
            )
        }
        self.collections["users"].items.update({
            "user-one": {"_id": "user-one", "email": "owner@example.com", "full_name": "Workspace Owner"},
            "user-two": {"_id": "user-two", "email": "member@example.com", "full_name": "Workspace Member"},
            "user-three": {"_id": "user-three", "email": "other@example.com", "full_name": "Other User"},
        })

    def __getitem__(self, name: str) -> FakeCollection:
        return self.collections[name]


def test_create_project_endpoint_accepts_empty_optional_description() -> None:
    db = FakeDatabase()

    async def current_user() -> str:
        return "user-one"

    async def database():
        yield db

    app.dependency_overrides[get_current_user_id] = current_user
    app.dependency_overrides[get_db] = database
    try:
        response = TestClient(app).post(
            "/api/v1/workspace/projects",
            json={"name": "Launch plan", "description": ""},
        )
        workspace_response = TestClient(app).get("/api/v1/workspace")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201, response.text
    assert response.json()["name"] == "Launch plan"
    assert response.json()["description"] == ""
    assert workspace_response.status_code == 200
    assert workspace_response.json()["role"] == "owner"
    assert workspace_response.json()["members"][0]["email"] == "owner@example.com"


def test_invitation_and_active_workspace_api_round_trip() -> None:
    db = FakeDatabase()
    active_user = ["user-one"]

    async def current_user() -> str:
        return active_user[0]

    async def database():
        yield db

    app.dependency_overrides[get_current_user_id] = current_user
    app.dependency_overrides[get_db] = database
    try:
        client = TestClient(app)
        project = client.post(
            "/api/v1/workspace/projects",
            json={"name": "Shared project", "description": ""},
        )
        invitation = client.post(
            "/api/v1/workspace/invitations",
            json={"email": "member@example.com"},
        )
        active_user[0] = "user-two"
        accepted = client.post(
            "/api/v1/workspace/invitations/accept",
            json={"token": invitation.json()["token"]},
        )
        projects = client.get("/api/v1/workspace/projects")
        switched = client.patch(
            f"/api/v1/workspace/active/{accepted.json()['id']}"
        )
        active_user[0] = "user-one"
        removed = client.delete("/api/v1/workspace/members/user-two")
    finally:
        app.dependency_overrides.clear()

    assert project.status_code == 201, project.text
    assert invitation.status_code == 201, invitation.text
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["role"] == "member"
    assert accepted.json()["members"][1]["email"] == "member@example.com"
    assert [item["name"] for item in projects.json()] == ["Shared project"]
    assert switched.status_code == 200
    assert removed.status_code == 204


def test_login_issues_http_only_cookie_shared_by_local_frontends(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = FakeDatabase()

    async def database():
        yield db

    async def fake_login(self: AuthService, email: str, password: str) -> str:
        return create_access_token(subject="user-one")

    monkeypatch.setattr(AuthService, "login", fake_login)
    app.dependency_overrides[get_db] = database
    try:
        client = TestClient(app)
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "user@example.com", "password": "test-password"},
        )
        workspace_response = client.get("/api/v1/workspace/projects")
        logout_response = client.post("/api/v1/auth/logout")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    cookie = response.cookies.get("rag_access_token")
    assert cookie == response.json()["access_token"]
    set_cookie = response.headers["set-cookie"].lower()
    assert "httponly" in set_cookie
    assert "path=/" in set_cookie
    assert "samesite=lax" in set_cookie
    assert workspace_response.status_code == 200
    assert logout_response.status_code == 204
    assert "max-age=0" in logout_response.headers["set-cookie"].lower()


@pytest.mark.asyncio
async def test_workspace_crud_and_project_task_cascade() -> None:
    db = FakeDatabase()
    project = await create_project(
        ProjectCreate(name="  Launch  ", description="  First release  ", due_date=date(2026, 10, 18)),
        "user-one",
        db,  # type: ignore[arg-type]
    )
    assert project.name == "Launch"
    assert project.description == "First release"
    stored_project = await db["workspace_projects"].find_one({"_id": project.id})
    assert stored_project is not None
    assert stored_project["due_date"] == datetime(2026, 10, 18, tzinfo=timezone.utc)

    empty_description_project = await create_project(
        ProjectCreate(name="Minimal project", description=""), "user-one", db  # type: ignore[arg-type]
    )
    assert empty_description_project.description == ""

    task = await create_task(
        TaskCreate(title="Write release notes", project_id=project.id, due_date=date(2026, 10, 12)),
        "user-one",
        db,  # type: ignore[arg-type]
    )
    assert task.done is False
    assert task.due_date == date(2026, 10, 12)
    stored_task = await db["workspace_tasks"].find_one({"_id": task.id})
    assert stored_task is not None
    assert stored_task["due_date"] == datetime(2026, 10, 12, tzinfo=timezone.utc)

    updated_task = await update_task(
        task.id, TaskUpdate(done=True, due_date=date(2026, 10, 13)), "user-one", db  # type: ignore[arg-type]
    )
    updated_project = await update_project(
        project.id,
        ProjectUpdate(status="In Progress", due_date=date(2026, 10, 19)),
        "user-one",
        db,  # type: ignore[arg-type]
    )
    assert updated_task.done is True
    assert updated_task.due_date == date(2026, 10, 13)
    assert updated_project.status == "In Progress"
    stored_task = await db["workspace_tasks"].find_one({"_id": task.id})
    assert stored_task is not None
    assert stored_task["due_date"] == datetime(2026, 10, 13, tzinfo=timezone.utc)
    stored_project = await db["workspace_projects"].find_one({"_id": project.id})
    assert stored_project is not None
    assert stored_project["due_date"] == datetime(2026, 10, 19, tzinfo=timezone.utc)

    await delete_project(project.id, "user-one", db)  # type: ignore[arg-type]
    await delete_project(empty_description_project.id, "user-one", db)  # type: ignore[arg-type]
    assert await list_projects("user-one", db) == []
    assert await list_tasks("user-one", db) == []


@pytest.mark.asyncio
async def test_workspace_records_are_scoped_to_the_authenticated_user() -> None:
    db = FakeDatabase()
    project = await create_project(ProjectCreate(name="Private project"), "user-one", db)  # type: ignore[arg-type]

    assert await list_projects("user-two", db) == []
    with pytest.raises(NotFoundError):
        await update_project(project.id, ProjectUpdate(name="Changed"), "user-two", db)  # type: ignore[arg-type]
    with pytest.raises(NotFoundError):
        await create_task(TaskCreate(title="Invalid task", project_id=project.id), "user-two", db)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_invitation_is_email_bound_and_shares_workspace_data() -> None:
    db = FakeDatabase()
    repo = WorkspaceRepository(db)  # type: ignore[arg-type]
    project = await repo.create_project(
        "user-one", ProjectCreate(name="Shared launch").model_dump()
    )
    invitation = await repo.create_invitation("user-one", "MEMBER@example.com")

    stored_invite = await db["workspace_invitations"].find_one({"_id": invitation["_id"]})
    assert stored_invite is not None
    assert "token" not in stored_invite
    assert stored_invite["token_hash"] != invitation["token"]

    with pytest.raises(ForbiddenError):
        await repo.accept_invitation("user-three", invitation["token"])
    with pytest.raises(ConflictError):
        await repo.create_invitation("user-one", "member@example.com")

    joined_workspace = await repo.accept_invitation("user-two", invitation["token"])
    assert joined_workspace["role"] == "member"
    assert joined_workspace["id"] == project["workspace_id"]
    assert [item["name"] for item in await repo.list_projects("user-two")] == ["Shared launch"]
    with pytest.raises(ForbiddenError):
        await repo.create_invitation("user-two", "other@example.com")

    with pytest.raises(NotFoundError):
        await repo.accept_invitation("user-two", invitation["token"])
    await repo.remove_member("user-one", "user-two")
    assert await db["workspace_memberships"].find_one(
        {"workspace_id": project["workspace_id"], "user_id": "user-two"}
    ) is None
