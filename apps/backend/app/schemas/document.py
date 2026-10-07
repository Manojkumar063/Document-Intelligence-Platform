from datetime import datetime

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    filename: str
    original_name: str
    file_size: int
    mime_type: str
    status: str
    chunk_count: int
    is_shared: bool = True
    version: int = 1
    collection_id: str | None = None
    collection_id: str | None = None
    created_at: datetime
    processed_at: datetime | None = None
    error_message: str | None = None


class DocumentUploadResponse(BaseModel):
    document: DocumentResponse
    message: str = "Document uploaded successfully. Processing will begin shortly."


class DocumentAccessUpdate(BaseModel):
    is_shared: bool


class DocumentCollectionUpdate(BaseModel):
    collection_id: str | None = None


class DocumentVersionResponse(BaseModel):
    version: int
    original_name: str
    file_size: int
    mime_type: str
    status: str
    created_at: datetime
    is_current: bool
