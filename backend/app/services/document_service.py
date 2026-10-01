"""Document ingestion service: save → load → chunk → embed → store."""
import logging
import uuid
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.db.models.document import Document, DocumentStatus
from app.db.models.chunk import DocumentChunk
from app.db.repositories.document_repo import DocumentRepository
from app.db.repositories.notification_repo import NotificationRepository
from app.db.vector_store import (
    delete_document_vectors,
    set_document_vector_status,
    upsert_document_chunks,
)
from app.rag.loaders import load_text
from app.rag.chunking import split_text
from app.rag.embeddings import embed_texts
from app.utils.exceptions import StorageError, DocumentProcessingError

settings = get_settings()
logger = logging.getLogger(__name__)


class DocumentService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db
        self.repo = DocumentRepository(db)

    async def _notify_status(self, doc: Document, status: DocumentStatus) -> None:
        try:
            await NotificationRepository(self.db).notify_document_status(doc, status)
        except Exception:
            logger.exception("Could not create document status notification", extra={"document_id": doc.id})

    async def save_upload(
        self,
        user_id: str,
        original_name: str,
        content: bytes,
        mime_type: str,
    ) -> Document:
        upload_dir = Path(settings.upload_dir) / user_id
        upload_dir.mkdir(parents=True, exist_ok=True)

        unique_name = f"{uuid.uuid4()}_{original_name}"
        file_path = upload_dir / unique_name

        try:
            file_path.write_bytes(content)
        except OSError as exc:
            raise StorageError(f"Failed to write file: {exc}") from exc

        return await self.repo.create(
            user_id=user_id,
            filename=unique_name,
            original_name=original_name,
            file_path=str(file_path),
            file_size=len(content),
            mime_type=mime_type,
        )

    async def save_new_version(
        self,
        doc: Document,
        original_name: str,
        content: bytes,
        mime_type: str,
    ) -> Document:
        upload_dir = Path(settings.upload_dir) / doc.user_id
        upload_dir.mkdir(parents=True, exist_ok=True)
        unique_name = f"{uuid.uuid4()}_{original_name}"
        file_path = upload_dir / unique_name
        try:
            file_path.write_bytes(content)
        except OSError as exc:
            raise StorageError(f"Failed to write file: {exc}") from exc
        return await self.repo.replace_current_file(
            doc,
            filename=unique_name,
            original_name=original_name,
            file_path=str(file_path),
            file_size=len(content),
            mime_type=mime_type,
        )

    async def restore_version(self, doc: Document, version: int) -> Document | None:
        snapshot = await self.db["document_versions"].find_one(
            {"document_id": doc.id, "version": version}
        )
        if not snapshot or not Path(snapshot["file_path"]).is_file():
            return None
        return await self.repo.restore_version(doc, snapshot)

    async def process_document(self, doc: Document) -> Document:
        await self.repo.update_status(doc, DocumentStatus.PROCESSING)

        try:
            await set_document_vector_status(doc.id, DocumentStatus.PROCESSING)
            await delete_document_vectors(doc.id)
            await self.db["document_chunks"].delete_many({"document_id": doc.id})
            text = load_text(doc.file_path)
            chunks = split_text(text)

            if not chunks:
                failed_doc = await self.repo.update_status(
                    doc, DocumentStatus.FAILED, error_message="No text extracted from document"
                )
                await self._notify_status(doc, DocumentStatus.FAILED)
                return failed_doc

            texts = [c.content for c in chunks]
            vectors = await embed_texts(texts)

            chunk_models = [
                DocumentChunk(
                    document_id=doc.id,
                    chunk_index=c.chunk_index,
                    content=c.content,
                    embedding=vectors[i],
                    token_count=c.token_count,
                    metadata_={"filename": doc.original_name},
                )
                for i, c in enumerate(chunks)
            ]
            chunk_docs = [chunk.to_doc() for chunk in chunk_models]
            await self.db["document_chunks"].insert_many(chunk_docs)
            await upsert_document_chunks(
                doc_id=doc.id,
                chunks=chunk_models,
                vectors=vectors,
                is_shared=doc.is_shared,
                collection_id=doc.collection_id,
            )

            completed_doc = await self.repo.update_status(
                doc, DocumentStatus.COMPLETED, chunk_count=len(chunks)
            )
            await set_document_vector_status(doc.id, DocumentStatus.COMPLETED)
            await self._notify_status(doc, DocumentStatus.COMPLETED)
            return completed_doc

        except Exception as exc:
            try:
                await set_document_vector_status(doc.id, DocumentStatus.FAILED)
            except Exception:
                logger.exception("Could not mark document vectors failed", extra={"document_id": doc.id})
            await self.repo.update_status(doc, DocumentStatus.FAILED, error_message=str(exc))
            await self._notify_status(doc, DocumentStatus.FAILED)
            raise DocumentProcessingError(str(exc)) from exc
