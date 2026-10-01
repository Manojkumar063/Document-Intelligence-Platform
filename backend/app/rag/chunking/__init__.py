"""Split documents into overlapping text chunks."""
from dataclasses import dataclass

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import get_settings

settings = get_settings()


@dataclass
class TextChunk:
    content: str
    chunk_index: int
    token_count: int


def split_text(text: str) -> list[TextChunk]:
    """Split text into chunks using recursive character splitting."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        length_function=len,
    )
    pieces = splitter.split_text(text)
    return [
        TextChunk(
            content=piece,
            chunk_index=i,
            token_count=len(piece.split()),  # rough word-count approximation
        )
        for i, piece in enumerate(pieces)
    ]
