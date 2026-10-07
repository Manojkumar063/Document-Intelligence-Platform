"""Application-level exceptions with HTTP status codes and error codes."""
from dataclasses import dataclass


@dataclass
class AppError(Exception):
    """Base application error."""
    message: str
    code: str
    status_code: int = 400


class NotFoundError(AppError):
    def __init__(self, resource: str, resource_id: str = "") -> None:
        detail = f"{resource} '{resource_id}' not found" if resource_id else f"{resource} not found"
        super().__init__(
            message=detail,
            code=f"{resource.upper().replace(' ', '_')}_NOT_FOUND",
            status_code=404,
        )


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Authentication required") -> None:
        super().__init__(message=message, code="UNAUTHORIZED", status_code=401)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Access denied") -> None:
        super().__init__(message=message, code="FORBIDDEN", status_code=403)


class ConflictError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(message=message, code="CONFLICT", status_code=409)


class ValidationError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(message=message, code="VALIDATION_ERROR", status_code=422)


class DocumentProcessingError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(message=message, code="DOCUMENT_PROCESSING_FAILED", status_code=500)


class StorageError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(message=message, code="STORAGE_ERROR", status_code=500)
