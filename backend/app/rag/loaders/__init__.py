"""Document loaders — extract plain text from PDF, DOCX, and TXT files."""
from io import BytesIO
from pathlib import Path


def load_text(file_path: str) -> str:
    """Dispatch to the correct loader based on file extension."""
    path = Path(file_path)
    ext = path.suffix.lower()
    if ext == ".pdf":
        return _load_pdf(path)
    if ext == ".docx":
        return _load_docx(path)
    return path.read_text(encoding="utf-8", errors="replace")


def load_text_from_bytes(content: bytes, file_name: str) -> str:
    """Dispatch to the correct loader for content retrieved from remote storage."""
    path = Path(file_name)
    ext = path.suffix.lower()
    if ext == ".pdf":
        return _load_pdf(BytesIO(content))
    if ext == ".docx":
        return _load_docx(BytesIO(content))
    return content.decode("utf-8", errors="replace")


def _load_pdf(path: Path | BytesIO) -> str:
    from pypdf import PdfReader
    reader = PdfReader(str(path) if isinstance(path, Path) else path)
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _load_docx(path: Path | BytesIO) -> str:
    from docx import Document
    doc = Document(str(path) if isinstance(path, Path) else path)
    return "\n".join(p.text for p in doc.paragraphs)
