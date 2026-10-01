from fastapi import APIRouter

from app.api.deps import CurrentAdminUserID, CurrentUserID, DBSession
from app.db.repositories.user_repo import UserRepository
from app.schemas.user import UserResponse, UserRoleUpdate, UserUpdate
from app.utils.exceptions import ConflictError, NotFoundError

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
async def list_users(user_id: CurrentAdminUserID, db: DBSession) -> list[UserResponse]:
    users = await UserRepository(db).list_all()
    return [UserResponse.model_validate(user) for user in users]


@router.patch("/{target_user_id}/role", response_model=UserResponse)
async def update_user_role(
    target_user_id: str,
    body: UserRoleUpdate,
    user_id: CurrentAdminUserID,
    db: DBSession,
) -> UserResponse:
    repo = UserRepository(db)
    target = await repo.get_by_id(target_user_id)
    if not target:
        raise NotFoundError("User", target_user_id)

    if target.is_active and target.role == "admin" and body.role == "user":
        active_admins = [user for user in await repo.list_all() if user.is_active and user.role == "admin"]
        if len(active_admins) <= 1:
            raise ConflictError("The last active admin cannot be demoted")

    if target.role != body.role:
        await repo.set_role(target_user_id, body.role)
        target.role = body.role
    return UserResponse.model_validate(target)


@router.get("/me", response_model=UserResponse)
async def get_me(user_id: CurrentUserID, db: DBSession) -> UserResponse:
    user = await UserRepository(db).get_by_id(user_id)
    if not user:
        raise NotFoundError("User", user_id)
    return UserResponse.model_validate(user)


@router.patch("/me", response_model=UserResponse)
async def update_me(body: UserUpdate, user_id: CurrentUserID, db: DBSession) -> UserResponse:
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise NotFoundError("User", user_id)
    if body.full_name is not None:
        await repo.col.update_one({"_id": user_id}, {"$set": {"full_name": body.full_name}})
        user.full_name = body.full_name
    return UserResponse.model_validate(user)
