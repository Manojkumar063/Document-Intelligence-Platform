from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

ProjectStatus = Literal["Planning", "In Progress", "Completed", "On Hold"]


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=300)
    status: ProjectStatus = "Planning"
    due_date: date | None = None

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("name cannot be blank")
        return trimmed

    @field_validator("description")
    @classmethod
    def trim_description(cls, value: str) -> str:
        return value.strip()


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=300)
    status: ProjectStatus | None = None
    due_date: date | None = None

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("name cannot be blank")
        return trimmed

    @field_validator("description")
    @classmethod
    def trim_description(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    color: str
    due_date: date | None
    status: ProjectStatus
    created_at: datetime


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    project_id: str = Field(min_length=1)
    due_date: date | None = None
    assignee_id: str | None = None

    @field_validator("title")
    @classmethod
    def trim_title(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("title cannot be blank")
        return trimmed


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    project_id: str | None = Field(default=None, min_length=1)
    due_date: date | None = None
    assignee_id: str | None = None
    done: bool | None = None

    @field_validator("title")
    @classmethod
    def trim_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("title cannot be blank")
        return trimmed


class TaskResponse(BaseModel):
    id: str
    title: str
    project_id: str
    due_date: date | None
    done: bool
    assignee_id: str | None = None
    created_at: datetime


class WorkspaceInvitationCreate(BaseModel):
    email: EmailStr


class WorkspaceInvitationResponse(BaseModel):
    id: str
    email: EmailStr
    token: str
    expires_at: datetime


class WorkspaceMemberResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: Literal["owner", "member"]
    joined_at: datetime


class WorkspaceOption(BaseModel):
    id: str
    name: str
    role: Literal["owner", "member"]


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    role: Literal["owner", "member"]
    members: list[WorkspaceMemberResponse]
    workspaces: list[WorkspaceOption]


class WorkspaceInvitationAccept(BaseModel):
    token: str = Field(min_length=32, max_length=128)
