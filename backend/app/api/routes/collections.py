from fastapi import APIRouter

from app.api.deps import CurrentAdminUserID, CurrentUserID, DBSession
from app.db.repositories.collection_repo import CollectionRepository
from app.db.repositories.document_repo import DocumentRepository
from app.db.repositories.user_repo import UserRepository
from app.db.vector_store import set_document_vector_payload
from app.schemas.collection import CollectionCreate, CollectionDetail, CollectionResponse
from app.schemas.document import DocumentCollectionUpdate, DocumentResponse
from app.utils.exceptions import ConflictError, NotFoundError

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("", response_model=list[CollectionResponse])
async def list_collections(user_id: CurrentUserID, db: DBSession) -> list[CollectionResponse]:
    user = await UserRepository(db).get_by_id(user_id)
    collections = await CollectionRepository(db).list_all(shared_only=not user or user.role != "admin")
    return [
        CollectionResponse(
            id=collection.id,
            name=collection.name,
            description=collection.description,
            created_at=collection.created_at,
            document_count=count,
        )
        for collection, count in collections
    ]


@router.post("", response_model=CollectionResponse, status_code=201)
async def create_collection(
    body: CollectionCreate, user_id: CurrentAdminUserID, db: DBSession
) -> CollectionResponse:
    repo = CollectionRepository(db)
    if await repo.get_by_name(body.name):
        raise ConflictError(f"Collection '{body.name}' already exists")
    collection = await repo.create(body.name, body.description, user_id)
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        created_at=collection.created_at,
        document_count=0,
    )


@router.get("/{collection_id}/documents", response_model=list[DocumentResponse])
async def list_collection_documents(
    collection_id: str, user_id: CurrentUserID, db: DBSession
) -> list[DocumentResponse]:
    collection = await CollectionRepository(db).get_by_id(collection_id)
    if not collection:
        raise NotFoundError("Collection", collection_id)
    user = await UserRepository(db).get_by_id(user_id)
    docs = await DocumentRepository(db).get_by_collection(
        collection_id, shared_only=not user or user.role != "admin"
    )
    return [DocumentResponse.model_validate(doc) for doc in docs]


@router.get("/{collection_id}", response_model=CollectionDetail)
async def get_collection(
    collection_id: str, user_id: CurrentUserID, db: DBSession
) -> CollectionDetail:
    collection = await CollectionRepository(db).get_by_id(collection_id)
    if not collection:
        raise NotFoundError("Collection", collection_id)
    user = await UserRepository(db).get_by_id(user_id)
    if not user or user.role != "admin":
        docs = await DocumentRepository(db).get_by_collection(collection_id, shared_only=True)
        if not docs:
            raise NotFoundError("Collection", collection_id)
    return CollectionDetail(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        created_at=collection.created_at,
    )


@router.patch("/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: str,
    body: CollectionCreate,
    user_id: CurrentAdminUserID,
    db: DBSession,
) -> CollectionResponse:
    repo = CollectionRepository(db)
    collection = await repo.get_by_id(collection_id)
    if not collection:
        raise NotFoundError("Collection", collection_id)
    matching = await repo.get_by_name(body.name)
    if matching and matching.id != collection_id:
        raise ConflictError(f"Collection '{body.name}' already exists")
    collection = await repo.rename(collection, body.name, body.description)
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        created_at=collection.created_at,
        document_count=await db["documents"].count_documents({"collection_id": collection_id}),
    )


@router.delete("/{collection_id}", status_code=204)
async def delete_collection(
    collection_id: str, user_id: CurrentAdminUserID, db: DBSession
) -> None:
    repo = CollectionRepository(db)
    collection = await repo.get_by_id(collection_id)
    if not collection:
        raise NotFoundError("Collection", collection_id)
    await repo.delete(collection)


@router.patch("/documents/{doc_id}/collection", response_model=DocumentResponse)
async def update_document_collection(
    doc_id: str,
    body: DocumentCollectionUpdate,
    user_id: CurrentAdminUserID,
    db: DBSession,
) -> DocumentResponse:
    doc_repo = DocumentRepository(db)
    doc = await doc_repo.get_by_id(doc_id)
    if not doc:
        raise NotFoundError("Document", doc_id)
    if body.collection_id and not await CollectionRepository(db).get_by_id(body.collection_id):
        raise NotFoundError("Collection", body.collection_id)
    await set_document_vector_payload(doc_id, {"collection_id": body.collection_id})
    await doc_repo.set_collection(doc, body.collection_id)
    return DocumentResponse.model_validate(doc)