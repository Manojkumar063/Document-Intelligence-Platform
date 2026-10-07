from urllib.parse import quote

from fastapi import APIRouter, BackgroundTasks, UploadFile, File
from fastapi.responses import Response

from app.api.deps import CurrentAdminUserID, CurrentUserID, DBSession
from app.core.config import get_settings
from app.db.models.document import DocumentStatus
from app.db.repositories.document_repo import DocumentRepository
from app.db.repositories.user_repo import UserRepository
from app.db.repositories.usage_repo import UsageRepository
from app.db.vector_store import delete_document_vectors, set_document_vector_payload
from app.schemas.document import (
    DocumentAccessUpdate,
    DocumentResponse,
    DocumentUploadResponse,
    DocumentVersionResponse,
)
from app.services.document_service import DocumentService
from app.services.storage import storage
from app.utils.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError

router = APIRouter(prefix="/documents", tags=["documents"])
settings = get_settings()


@router.post("", response_model=DocumentUploadResponse, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    user_id: CurrentAdminUserID,
    db: DBSession,
    file: UploadFile = File(...),
) -> DocumentUploadResponse:
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in settings.allowed_extensions:
        raise ValidationError(f"File type '.{ext}' is not allowed. Allowed: {settings.allowed_extensions}")

    content = await file.read()
    if len(content) > settings.max_file_size_mb * 1024 * 1024:
        raise ValidationError(f"File exceeds maximum size of {settings.max_file_size_mb} MB")

    svc = DocumentService(db)
    doc = await svc.save_upload(
        user_id=user_id,
        original_name=file.filename or "upload",
        content=content,
        mime_type=file.content_type or "application/octet-stream",
    )
    await UsageRepository(db).record(user_id, "document_upload")

    background_tasks.add_task(svc.process_document, doc)
    return DocumentUploadResponse(document=DocumentResponse.model_validate(doc))


@router.get("", response_model=list[DocumentResponse])
async def list_documents(user_id: CurrentUserID, db: DBSession) -> list[DocumentResponse]:
    user = await UserRepository(db).get_by_id(user_id)
    repo = DocumentRepository(db)
    docs = await repo.get_all() if user and user.role == "admin" else await repo.get_shared()
    return [DocumentResponse.model_validate(d) for d in docs]


@router.post("/{doc_id}/retry", response_model=DocumentResponse, status_code=202)
async def retry_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    user_id: CurrentAdminUserID,
    db: DBSession,
) -> DocumentResponse:
    repo = DocumentRepository(db)
    doc = await repo.get_by_id(doc_id)
    if not doc:
        raise NotFoundError("Document", doc_id)
    if doc.status != DocumentStatus.FAILED or not await repo.prepare_retry(doc):
        raise ConflictError("Only failed documents can be retried")

    await UsageRepository(db).record(user_id, "document_retry")
    svc = DocumentService(db)
    background_tasks.add_task(svc.process_document, doc)
    return DocumentResponse.model_validate(doc)


@router.patch("/{doc_id}/access", response_model=DocumentResponse)
async def update_document_access(
    doc_id: str,
    body: DocumentAccessUpdate,
    user_id: CurrentAdminUserID,
    db: DBSession,
) -> DocumentResponse:
    repo = DocumentRepository(db)
    doc = await repo.get_by_id(doc_id)
    if not doc:
        raise NotFoundError("Document", doc_id)
    await set_document_vector_payload(doc_id, {"is_shared": body.is_shared})
    await repo.set_shared(doc, body.is_shared)
    return DocumentResponse.model_validate(doc)


@router.get("/{doc_id}/versions", response_model=list[DocumentVersionResponse])
async def list_document_versions(
    doc_id: str, user_id: CurrentAdminUserID, db: DBSession
) -> list[DocumentVersionResponse]:
    repo = DocumentRepository(db)
    doc = await repo.get_by_id(doc_id)
    if not doc:
        raise NotFoundError("Document", doc_id)
    versions = await repo.list_versions(doc)
    return [DocumentVersionResponse.model_validate(version) for version in versions]


@router.post("/{doc_id}/versions", response_model=DocumentResponse, status_code=202)
async def upload_document_version(
    doc_id: str,
    background_tasks: BackgroundTasks,
    user_id: CurrentAdminUserID,
    db: DBSession,
    file: UploadFile = File(...),
) -> DocumentResponse:
    repo = DocumentRepository(db)
    doc = await repo.get_by_id(doc_id)
    if not doc:
        raise NotFoundError("Document", doc_id)
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in settings.allowed_extensions:
        raise ValidationError(f"File type '.{ext}' is not allowed. Allowed: {settings.allowed_extensions}")
    content = await file.read()
    if len(content) > settings.max_file_size_mb * 1024 * 1024:
        raise ValidationError(f"File exceeds maximum size of {settings.max_file_size_mb} MB")

    svc = DocumentService(db)
    versioned_doc = await svc.save_new_version(
        doc,
        original_name=file.filename or "upload",
        content=content,
        mime_type=file.content_type or "application/octet-stream",
    )
    await UsageRepository(db).record(user_id, "document_version_upload")
    background_tasks.add_task(svc.process_document, versioned_doc)
    return DocumentResponse.model_validate(versioned_doc)


@router.post("/{doc_id}/versions/{version}/restore", response_model=DocumentResponse, status_code=202)
async def restore_document_version(
    doc_id: str,
    version: int,
    background_tasks: BackgroundTasks,
    user_id: CurrentAdminUserID,
    db: DBSession,
) -> DocumentResponse:
    repo = DocumentRepository(db)
    doc = await repo.get_by_id(doc_id)
    if not doc:
        raise NotFoundError("Document", doc_id)
    if version == doc.version:
        raise ConflictError("This version is already current")
    svc = DocumentService(db)
    restored_doc = await svc.restore_version(doc, version)
    if not restored_doc:
        raise NotFoundError("Document version", str(version))
    await UsageRepository(db).record(user_id, "document_version_restore")
    background_tasks.add_task(svc.process_document, restored_doc)
    return DocumentResponse.model_validate(restored_doc)


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, user_id: CurrentUserID, db: DBSession) -> DocumentResponse:
    doc = await DocumentRepository(db).get_by_id(doc_id)
    if not doc:
        raise NotFoundError("Document", doc_id)
    user = await UserRepository(db).get_by_id(user_id)
    if not doc.is_shared and doc.user_id != user_id and (not user or user.role != "admin"):
        raise ForbiddenError()
    return DocumentResponse.model_validate(doc)


@router.get("/{doc_id}/file")
async def open_document_file(doc_id: str, user_id: CurrentUserID, db: DBSession) -> Response:
    doc = await DocumentRepository(db).get_by_id(doc_id)
    if not doc:
        raise NotFoundError("Document", doc_id)
    user = await UserRepository(db).get_by_id(user_id)
    if not doc.is_shared and doc.user_id != user_id and (not user or user.role != "admin"):
        raise ForbiddenError()
    if not await storage.exists(doc.file_path):
        raise NotFoundError("Document file", doc_id)
    content = await storage.read(doc.file_path)
    return Response(
        content=content,
        media_type=doc.mime_type,
        headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(doc.original_name)}"},
    )


@router.delete("/{doc_id}", status_code=204)
async def delete_document(doc_id: str, user_id: CurrentAdminUserID, db: DBSession) -> None:
    repo = DocumentRepository(db)
    doc = await repo.get_by_id(doc_id)
    if not doc:
        raise NotFoundError("Document", doc_id)
    versions = [
        version async for version in db["document_versions"].find({"document_id": doc_id})
    ]
    file_locations = {doc.file_path, *(version["file_path"] for version in versions)}
    for location in file_locations:
        await storage.delete(location)
    await delete_document_vectors(doc_id)
    await db["documents"].delete_one({"_id": doc_id})
    await db["document_chunks"].delete_many({"document_id": doc_id})
    await db["document_versions"].delete_many({"document_id": doc_id})
