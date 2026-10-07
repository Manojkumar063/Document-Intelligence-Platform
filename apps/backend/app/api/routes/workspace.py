from typing import Any

from fastapi import APIRouter

from app.api.deps import CurrentUserID, DBSession
from app.db.repositories.workspace_repo import WorkspaceRepository
from app.schemas.workspace import (
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
    WorkspaceInvitationAccept,
    WorkspaceInvitationCreate,
    WorkspaceInvitationResponse,
    WorkspaceResponse,
)
from app.utils.exceptions import NotFoundError, ValidationError

router = APIRouter(prefix="/workspace", tags=["workspace"])


@router.get("", response_model=WorkspaceResponse)
async def get_workspace(user_id: CurrentUserID, db: DBSession) -> WorkspaceResponse:
    return WorkspaceResponse.model_validate(await WorkspaceRepository(db).get_workspace_info(user_id))


@router.patch("/active/{workspace_id}", response_model=WorkspaceResponse)
async def switch_workspace(
    workspace_id: str, user_id: CurrentUserID, db: DBSession
) -> WorkspaceResponse:
    workspace = await WorkspaceRepository(db).switch_workspace(user_id, workspace_id)
    return WorkspaceResponse.model_validate(workspace)


@router.post("/invitations", response_model=WorkspaceInvitationResponse, status_code=201)
async def create_workspace_invitation(
    body: WorkspaceInvitationCreate, user_id: CurrentUserID, db: DBSession
) -> WorkspaceInvitationResponse:
    invitation = await WorkspaceRepository(db).create_invitation(user_id, str(body.email))
    return WorkspaceInvitationResponse(
        id=invitation["_id"],
        email=invitation["email"],
        token=invitation["token"],
        expires_at=invitation["expires_at"],
    )


@router.delete("/members/{member_id}", status_code=204)
async def remove_workspace_member(
    member_id: str, user_id: CurrentUserID, db: DBSession
) -> None:
    await WorkspaceRepository(db).remove_member(user_id, member_id)


@router.post("/invitations/accept", response_model=WorkspaceResponse)
async def accept_workspace_invitation(
    body: WorkspaceInvitationAccept, user_id: CurrentUserID, db: DBSession
) -> WorkspaceResponse:
    workspace = await WorkspaceRepository(db).accept_invitation(user_id, body.token)
    return WorkspaceResponse.model_validate(workspace)


def project_response(item: dict[str, Any]) -> ProjectResponse:
    return ProjectResponse(
        id=str(item["_id"]),
        name=item["name"],
        description=item["description"],
        color=item["color"],
        due_date=item.get("due_date"),
        status=item["status"],
        created_at=item["created_at"],
    )


def task_response(item: dict[str, Any]) -> TaskResponse:
    return TaskResponse(
        id=str(item["_id"]),
        title=item["title"],
        project_id=item["project_id"],
        due_date=item.get("due_date"),
        done=item.get("done", False),
        assignee_id=item.get("assignee_id"),
        created_at=item["created_at"],
    )


@router.get("/projects", response_model=list[ProjectResponse])
async def list_projects(user_id: CurrentUserID, db: DBSession) -> list[ProjectResponse]:
    items = await WorkspaceRepository(db).list_projects(user_id)
    return [project_response(item) for item in items]


@router.post("/projects", response_model=ProjectResponse, status_code=201)
async def create_project(
    body: ProjectCreate, user_id: CurrentUserID, db: DBSession
) -> ProjectResponse:
    item = await WorkspaceRepository(db).create_project(user_id, body.model_dump())
    return project_response(item)


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str, body: ProjectUpdate, user_id: CurrentUserID, db: DBSession
) -> ProjectResponse:
    repo = WorkspaceRepository(db)
    values = body.model_dump(exclude_unset=True)
    for field in ("name", "description", "status"):
        if field in values and values[field] is None:
            raise ValidationError(f"{field} cannot be null")
    item = await repo.update_project(project_id, user_id, values)
    if not item:
        raise NotFoundError("Project", project_id)
    return project_response(item)


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(project_id: str, user_id: CurrentUserID, db: DBSession) -> None:
    if not await WorkspaceRepository(db).delete_project(project_id, user_id):
        raise NotFoundError("Project", project_id)


@router.get("/tasks", response_model=list[TaskResponse])
async def list_tasks(user_id: CurrentUserID, db: DBSession) -> list[TaskResponse]:
    items = await WorkspaceRepository(db).list_tasks(user_id)
    return [task_response(item) for item in items]


@router.post("/tasks", response_model=TaskResponse, status_code=201)
async def create_task(body: TaskCreate, user_id: CurrentUserID, db: DBSession) -> TaskResponse:
    repo = WorkspaceRepository(db)
    if not await repo.get_project(body.project_id, user_id):
        raise NotFoundError("Project", body.project_id)
    item = await repo.create_task(user_id, body.model_dump())
    return task_response(item)


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str, body: TaskUpdate, user_id: CurrentUserID, db: DBSession
) -> TaskResponse:
    repo = WorkspaceRepository(db)
    values = body.model_dump(exclude_unset=True)
    for field in ("title", "project_id", "done"):
        if field in values and values[field] is None:
            raise ValidationError(f"{field} cannot be null")
    if "project_id" in values and not await repo.get_project(values["project_id"], user_id):
        raise NotFoundError("Project", values["project_id"])
    item = await repo.update_task(task_id, user_id, values)
    if not item:
        raise NotFoundError("Task", task_id)
    return task_response(item)


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: str, user_id: CurrentUserID, db: DBSession) -> None:
    if not await WorkspaceRepository(db).delete_task(task_id, user_id):
        raise NotFoundError("Task", task_id)
