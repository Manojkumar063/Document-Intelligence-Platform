from datetime import datetime, timezone
import uuid

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.models.document import Document, DocumentStatus


class DocumentRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db
        self.col = db["documents"]

    async def get_by_id(self, doc_id: str) -> Document | None:
        doc = await self.col.find_one({"_id": doc_id})
        return Document.from_doc(doc) if doc else None

    async def get_by_user(self, user_id: str) -> list[Document]:
        cursor = self.col.find({"user_id": user_id}).sort("created_at", -1)
        return [Document.from_doc(d) async for d in cursor]

    async def get_all(self) -> list[Document]:
        cursor = self.col.find({}).sort("created_at", -1)
        return [Document.from_doc(d) async for d in cursor]

    async def get_shared(self) -> list[Document]:
        cursor = self.col.find({"$or": [{"is_shared": True}, {"is_shared": {"$exists": False}}]}).sort("created_at", -1)
        return [Document.from_doc(d) async for d in cursor]

    async def get_by_collection(self, collection_id: str, shared_only: bool = False) -> list[Document]:
        query: dict[str, object] = {"collection_id": collection_id}
        if shared_only:
            query["$or"] = [{"is_shared": True}, {"is_shared": {"$exists": False}}]
        cursor = self.col.find(query).sort("created_at", -1)
        return [Document.from_doc(d) async for d in cursor]

    async def set_collection(self, doc: Document, collection_id: str | None) -> None:
        await self.col.update_one({"_id": doc.id}, {"$set": {"collection_id": collection_id}})
        doc.collection_id = collection_id

    async def set_shared(self, doc: Document, is_shared: bool) -> None:
        await self.col.update_one({"_id": doc.id}, {"$set": {"is_shared": is_shared}})
        doc.is_shared = is_shared

    async def _archive_version(self, doc: Document) -> None:
        await self.db["document_versions"].insert_one(
            {
                "_id": str(uuid.uuid4()),
                "document_id": doc.id,
                "version": doc.version,
                "filename": doc.filename,
                "original_name": doc.original_name,
                "file_path": doc.file_path,
                "file_size": doc.file_size,
                "mime_type": doc.mime_type,
                "status": doc.status,
                "chunk_count": doc.chunk_count,
                "created_at": datetime.now(timezone.utc),
            }
        )

    async def list_versions(self, doc: Document) -> list[dict]:
        cursor = self.db["document_versions"].find({"document_id": doc.id}).sort("version", -1)
        versions = [version async for version in cursor]
        versions.insert(
            0,
            {
                "_id": f"{doc.id}:{doc.version}",
                "document_id": doc.id,
                "version": doc.version,
                "original_name": doc.original_name,
                "file_size": doc.file_size,
                "mime_type": doc.mime_type,
                "status": doc.status,
                "created_at": doc.created_at,
                "is_current": True,
            },
        )
        for version in versions[1:]:
            version["is_current"] = False
        return versions

    async def get_version(self, doc_id: str, version: int) -> dict | None:
        return await self.db["document_versions"].find_one({"document_id": doc_id, "version": version})

    async def replace_current_file(
        self,
        doc: Document,
        filename: str,
        original_name: str,
        file_path: str,
        file_size: int,
        mime_type: str,
    ) -> Document:
        await self._archive_version(doc)
        doc.version += 1
        doc.filename = filename
        doc.original_name = original_name
        doc.file_path = file_path
        doc.file_size = file_size
        doc.mime_type = mime_type
        doc.status = DocumentStatus.UPLOADED
        doc.error_message = None
        doc.chunk_count = 0
        doc.processed_at = None
        await self.col.update_one(
            {"_id": doc.id},
            {"$set": {
                "version": doc.version,
                "filename": filename,
                "original_name": original_name,
                "file_path": file_path,
                "file_size": file_size,
                "mime_type": mime_type,
                "status": DocumentStatus.UPLOADED,
                "error_message": None,
                "chunk_count": 0,
                "processed_at": None,
            }},
        )
        return doc

    async def restore_version(self, doc: Document, snapshot: dict) -> Document:
        await self._archive_version(doc)
        doc.version += 1
        doc.filename = snapshot["filename"]
        doc.original_name = snapshot["original_name"]
        doc.file_path = snapshot["file_path"]
        doc.file_size = snapshot["file_size"]
        doc.mime_type = snapshot["mime_type"]
        doc.status = DocumentStatus.UPLOADED
        doc.error_message = None
        doc.chunk_count = 0
        doc.processed_at = None
        await self.col.update_one(
            {"_id": doc.id},
            {"$set": {
                "version": doc.version,
                "filename": doc.filename,
                "original_name": doc.original_name,
                "file_path": doc.file_path,
                "file_size": doc.file_size,
                "mime_type": doc.mime_type,
                "status": DocumentStatus.UPLOADED,
                "error_message": None,
                "chunk_count": 0,
                "processed_at": None,
            }},
        )
        return doc

    async def create(
        self,
        user_id: str,
        filename: str,
        original_name: str,
        file_path: str,
        file_size: int,
        mime_type: str,
    ) -> Document:
        doc = Document(
            user_id=user_id,
            filename=filename,
            original_name=original_name,
            file_path=file_path,
            file_size=file_size,
            mime_type=mime_type,
        )
        await self.col.insert_one(doc.to_doc())
        return doc

    async def update_status(
        self,
        doc: Document,
        status: DocumentStatus,
        chunk_count: int = 0,
        error_message: str | None = None,
    ) -> Document:
        update: dict = {"status": status}
        if status == DocumentStatus.COMPLETED:
            update["chunk_count"] = chunk_count
            update["processed_at"] = datetime.now(timezone.utc)
        if error_message:
            update["error_message"] = error_message
        await self.col.update_one({"_id": doc.id}, {"$set": update})
        doc.status = status
        doc.chunk_count = chunk_count
        if error_message:
            doc.error_message = error_message
        return doc

    async def prepare_retry(self, doc: Document) -> bool:
        result = await self.col.update_one(
            {"_id": doc.id, "status": DocumentStatus.FAILED},
            {
                "$set": {
                    "status": DocumentStatus.UPLOADED,
                    "error_message": None,
                    "chunk_count": 0,
                    "processed_at": None,
                }
            },
        )
        if result.matched_count != 1:
            return False
        doc.status = DocumentStatus.UPLOADED
        doc.error_message = None
        doc.chunk_count = 0
        doc.processed_at = None
        return True
