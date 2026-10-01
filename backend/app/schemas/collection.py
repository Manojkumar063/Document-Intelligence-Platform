from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class CollectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=300)

    @field_validator("name", "description")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip()


class CollectionResponse(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime
    document_count: int


class CollectionDetail(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime