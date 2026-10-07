import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.utils.exceptions import ConflictError, ForbiddenError, NotFoundError

class WorkspaceRepository:
    PROJECT_COLORS = ("lilac", "mint", "peach")

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db
        self.projects = db["workspace_projects"]
        self.tasks = db["workspace_tasks"]
        self.workspaces = db["workspaces"]
        self.memberships = db["workspace_memberships"]
        self.invitations = db["workspace_invitations"]

    async def _active_workspace(self, user_id: str) -> tuple[dict[str, Any], str]:
        user = await self.db["users"].find_one({"_id": user_id})
        membership = None
        active_id = user.get("active_workspace_id") if user else None
        if active_id:
            membership = await self.memberships.find_one(
                {"workspace_id": active_id, "user_id": user_id}
            )
        if membership is None:
            cursor = self.memberships.find({"user_id": user_id}).sort("joined_at", 1)
            memberships = [item async for item in cursor]
            membership = memberships[0] if memberships else None
        if membership:
            workspace = await self.workspaces.find_one({"_id": membership["workspace_id"]})
            if workspace:
                if user and active_id != workspace["_id"]:
                    await self.db["users"].update_one(
                        {"_id": user_id}, {"$set": {"active_workspace_id": workspace["_id"]}}
                    )
                return workspace, membership["role"]

        if not user:
            raise NotFoundError("User", user_id)
        workspace_id = str(uuid.uuid4())
        workspace_name = f"{user['full_name'].strip() or user['email']}'s workspace"
        workspace = {
            "_id": workspace_id,
            "name": workspace_name,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc),
        }
        await self.workspaces.insert_one(workspace)
        await self.memberships.insert_one(
            {
                "_id": str(uuid.uuid4()),
                "workspace_id": workspace_id,
                "user_id": user_id,
                "role": "owner",
                "joined_at": datetime.now(timezone.utc),
            }
        )
        await self.db["users"].update_one(
            {"_id": user_id}, {"$set": {"active_workspace_id": workspace_id}}
        )
        await self._migrate_legacy_data(user_id, workspace_id)
        return workspace, "owner"

    async def _migrate_legacy_data(self, user_id: str, workspace_id: str) -> None:
        await self.projects.update_many(
            {"user_id": user_id, "workspace_id": {"$exists": False}},
            {"$set": {"workspace_id": workspace_id}},
        )
        await self.tasks.update_many(
            {"user_id": user_id, "workspace_id": {"$exists": False}},
            {"$set": {"workspace_id": workspace_id}},
        )

    async def get_workspace_info(self, user_id: str) -> dict[str, Any]:
        workspace, role = await self._active_workspace(user_id)
        memberships = [
            item async for item in self.memberships.find({"workspace_id": workspace["_id"]})
        ]
        members: list[dict[str, Any]] = []
        for membership in memberships:
            user = await self.db["users"].find_one({"_id": membership["user_id"]})
            if user:
                members.append(
                    {
                        "id": str(user["_id"]),
                        "email": user["email"],
                        "full_name": user["full_name"],
                        "role": membership["role"],
                        "joined_at": membership["joined_at"],
                    }
                )
        options: list[dict[str, Any]] = []
        own_memberships = [
            item async for item in self.memberships.find({"user_id": user_id})
        ]
        for own_membership in own_memberships:
            joined_workspace = await self.workspaces.find_one(
                {"_id": own_membership["workspace_id"]}
            )
            if joined_workspace:
                options.append(
                    {
                        "id": joined_workspace["_id"],
                        "name": joined_workspace["name"],
                        "role": own_membership["role"],
                    }
                )
        return {
            "id": workspace["_id"],
            "name": workspace["name"],
            "role": role,
            "members": members,
            "workspaces": options,
        }

    async def switch_workspace(self, user_id: str, workspace_id: str) -> dict[str, Any]:
        membership = await self.memberships.find_one(
            {"workspace_id": workspace_id, "user_id": user_id}
        )
        if not membership:
            raise NotFoundError("Workspace", workspace_id)
        await self.db["users"].update_one(
            {"_id": user_id}, {"$set": {"active_workspace_id": workspace_id}}
        )
        return await self.get_workspace_info(user_id)

    async def remove_member(self, owner_id: str, member_id: str) -> None:
        workspace, role = await self._active_workspace(owner_id)
        if role != "owner":
            raise ForbiddenError("Only workspace owners can remove members")
        if owner_id == member_id:
            raise ConflictError("The workspace owner cannot remove themselves")
        result = await self.memberships.delete_one(
            {"workspace_id": workspace["_id"], "user_id": member_id}
        )
        if not result.deleted_count:
            raise NotFoundError("Workspace member", member_id)
        member = await self.db["users"].find_one({"_id": member_id})
        if member and member.get("active_workspace_id") == workspace["_id"]:
            other_membership = await self.memberships.find_one({"user_id": member_id})
            if other_membership:
                await self.db["users"].update_one(
                    {"_id": member_id},
                    {"$set": {"active_workspace_id": other_membership["workspace_id"]}},
                )
            else:
                await self.db["users"].update_one(
                    {"_id": member_id}, {"$unset": {"active_workspace_id": ""}}
                )

    async def create_invitation(self, user_id: str, email: str) -> dict[str, Any]:
        workspace, role = await self._active_workspace(user_id)
        if role != "owner":
            raise ForbiddenError("Only workspace owners can invite members")
        normalized_email = email.strip().casefold()
        existing_user = await self.db["users"].find_one({"email": normalized_email})
        if existing_user and await self.memberships.find_one(
            {"workspace_id": workspace["_id"], "user_id": str(existing_user["_id"])}
        ):
            raise ConflictError("This user is already a workspace member")
        pending = await self.invitations.find_one(
            {"workspace_id": workspace["_id"], "email": normalized_email, "status": "pending"}
        )
        if pending:
            raise ConflictError("An invitation for this email is already pending")

        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        invitation = {
            "_id": str(uuid.uuid4()),
            "workspace_id": workspace["_id"],
            "invited_by": user_id,
            "email": normalized_email,
            "token_hash": hashlib.sha256(token.encode()).hexdigest(),
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "expires_at": expires_at,
        }
        await self.invitations.insert_one(invitation)
        return {**invitation, "token": token}

    async def accept_invitation(self, user_id: str, token: str) -> dict[str, Any]:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        invitation = await self.invitations.find_one(
            {"token_hash": token_hash, "status": "pending"}
        )
        if not invitation:
            raise NotFoundError("Invitation")
        now = datetime.now(timezone.utc)
        expires_at = invitation["expires_at"]
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= now:
            await self.invitations.update_one(
                {"_id": invitation["_id"]}, {"$set": {"status": "expired"}}
            )
            raise ConflictError("This invitation has expired")
        user = await self.db["users"].find_one({"_id": user_id})
        if not user:
            raise NotFoundError("User", user_id)
        if user["email"].strip().casefold() != invitation["email"]:
            raise ForbiddenError("Sign in with the email address this invitation was sent to")
        if not await self.memberships.find_one({"user_id": user_id}):
            await self._active_workspace(user_id)
        membership = await self.memberships.find_one(
            {"workspace_id": invitation["workspace_id"], "user_id": user_id}
        )
        if not membership:
            await self.memberships.insert_one(
                {
                    "_id": str(uuid.uuid4()),
                    "workspace_id": invitation["workspace_id"],
                    "user_id": user_id,
                    "role": "member",
                    "joined_at": now,
                }
            )
        await self.invitations.update_one(
            {"_id": invitation["_id"]},
            {"$set": {"status": "accepted", "accepted_by": user_id, "accepted_at": now}},
        )
        await self.db["users"].update_one(
            {"_id": user_id},
            {"$set": {"active_workspace_id": invitation["workspace_id"]}},
        )
        return await self.get_workspace_info(user_id)

    async def list_projects(self, user_id: str) -> list[dict[str, Any]]:
        workspace, _ = await self._active_workspace(user_id)
        cursor = self.projects.find({"workspace_id": workspace["_id"]}).sort("created_at", -1)
        return [project async for project in cursor]

    async def get_project(self, project_id: str, user_id: str) -> dict[str, Any] | None:
        workspace, _ = await self._active_workspace(user_id)
        return await self.projects.find_one({"_id": project_id, "workspace_id": workspace["_id"]})

    async def create_project(self, user_id: str, values: dict[str, Any]) -> dict[str, Any]:
        workspace, _ = await self._active_workspace(user_id)
        project = {
            "_id": str(uuid.uuid4()),
            "workspace_id": workspace["_id"],
            "created_by": user_id,
            "name": values["name"],
            "description": values.get("description", ""),
            "status": values.get("status", "Planning"),
            "due_date": values.get("due_date"),
            "color": self.PROJECT_COLORS[
                await self.projects.count_documents({"workspace_id": workspace["_id"]}) % len(self.PROJECT_COLORS)
            ],
            "created_at": datetime.now(timezone.utc),
        }
        await self.projects.insert_one(project)
        return project

    async def update_project(
        self, project_id: str, user_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        workspace, _ = await self._active_workspace(user_id)
        if not values:
            return await self.get_project(project_id, user_id)
        await self.projects.update_one(
            {"_id": project_id, "workspace_id": workspace["_id"]}, {"$set": values}
        )
        return await self.get_project(project_id, user_id)

    async def delete_project(self, project_id: str, user_id: str) -> bool:
        workspace, _ = await self._active_workspace(user_id)
        result = await self.projects.delete_one(
            {"_id": project_id, "workspace_id": workspace["_id"]}
        )
        if result.deleted_count:
            await self.tasks.delete_many(
                {"project_id": project_id, "workspace_id": workspace["_id"]}
            )
            return True
        return False

    async def list_tasks(self, user_id: str) -> list[dict[str, Any]]:
        workspace, _ = await self._active_workspace(user_id)
        cursor = self.tasks.find({"workspace_id": workspace["_id"]}).sort("created_at", -1)
        return [task async for task in cursor]

    async def get_task(self, task_id: str, user_id: str) -> dict[str, Any] | None:
        workspace, _ = await self._active_workspace(user_id)
        return await self.tasks.find_one({"_id": task_id, "workspace_id": workspace["_id"]})

    async def create_task(self, user_id: str, values: dict[str, Any]) -> dict[str, Any]:
        workspace, _ = await self._active_workspace(user_id)
        if not await self.projects.find_one(
            {"_id": values["project_id"], "workspace_id": workspace["_id"]}
        ):
            raise NotFoundError("Project", values["project_id"])
        assignee_id = values.get("assignee_id")
        if assignee_id and not await self.memberships.find_one(
            {"workspace_id": workspace["_id"], "user_id": assignee_id}
        ):
            raise NotFoundError("Workspace member", assignee_id)
        task = {
            "_id": str(uuid.uuid4()),
            "workspace_id": workspace["_id"],
            "created_by": user_id,
            "title": values["title"],
            "project_id": values["project_id"],
            "due_date": values.get("due_date"),
            "done": False,
            "assignee_id": values.get("assignee_id"),
            "created_at": datetime.now(timezone.utc),
        }
        await self.tasks.insert_one(task)
        return task

    async def update_task(
        self, task_id: str, user_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        workspace, _ = await self._active_workspace(user_id)
        if not values:
            return await self.get_task(task_id, user_id)
        if "project_id" in values and not await self.projects.find_one(
            {"_id": values["project_id"], "workspace_id": workspace["_id"]}
        ):
            raise NotFoundError("Project", values["project_id"])
        if values.get("assignee_id") and not await self.memberships.find_one(
            {"workspace_id": workspace["_id"], "user_id": values["assignee_id"]}
        ):
            raise NotFoundError("Workspace member", values["assignee_id"])
        await self.tasks.update_one(
            {"_id": task_id, "workspace_id": workspace["_id"]}, {"$set": values}
        )
        return await self.get_task(task_id, user_id)

    async def delete_task(self, task_id: str, user_id: str) -> bool:
        workspace, _ = await self._active_workspace(user_id)
        result = await self.tasks.delete_one(
            {"_id": task_id, "workspace_id": workspace["_id"]}
        )
        return bool(result.deleted_count)
