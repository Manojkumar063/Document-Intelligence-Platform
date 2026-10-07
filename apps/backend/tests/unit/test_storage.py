from io import BytesIO
from unittest.mock import Mock

import pytest
from botocore.exceptions import ClientError
from pydantic import ValidationError

from app.core.config import Settings
from app.rag.loaders import load_text_from_bytes
from app.services.storage import FileStorage


@pytest.mark.asyncio
async def test_local_storage_round_trip(tmp_path) -> None:
    storage = FileStorage(
        Settings(jwt_secret="test-secret", upload_dir=str(tmp_path))
    )

    location = await storage.save("user-1", "report.txt", b"hello", "text/plain")

    assert await storage.exists(location)
    assert await storage.read(location) == b"hello"
    assert load_text_from_bytes(await storage.read(location), "report.txt") == "hello"
    await storage.delete(location)
    assert not await storage.exists(location)


@pytest.mark.asyncio
async def test_s3_storage_uses_configured_bucket_and_object_key() -> None:
    storage = FileStorage(
        Settings(
            jwt_secret="test-secret",
            storage_backend="s3",
            s3_bucket="private-documents",
            aws_region="ap-south-1",
        )
    )
    client = Mock()
    client.get_object.return_value = {"Body": BytesIO(b"hello")}
    storage._client = client

    location = await storage.save("user-1", "report one.txt", b"hello", "text/plain")

    assert location == "s3://private-documents/user-1/report%20one.txt"
    client.put_object.assert_called_once_with(
        Bucket="private-documents",
        Key="user-1/report one.txt",
        Body=b"hello",
        ContentType="text/plain",
    )
    assert await storage.read(location) == b"hello"
    assert await storage.exists(location)
    client.get_object.assert_called_once_with(
        Bucket="private-documents", Key="user-1/report one.txt"
    )
    client.head_object.assert_called_once_with(
        Bucket="private-documents", Key="user-1/report one.txt"
    )

    await storage.delete(location)
    client.delete_object.assert_called_once_with(
        Bucket="private-documents", Key="user-1/report one.txt"
    )


@pytest.mark.asyncio
async def test_s3_storage_reports_missing_objects() -> None:
    storage = FileStorage(
        Settings(jwt_secret="test-secret", storage_backend="s3", s3_bucket="private-documents")
    )
    client = Mock()
    client.head_object.side_effect = ClientError(
        {"Error": {"Code": "404", "Message": "Not found"}},
        "HeadObject",
    )
    storage._client = client

    assert not await storage.exists("s3://private-documents/missing.txt")


def test_s3_backend_requires_a_bucket() -> None:
    with pytest.raises(ValidationError, match="S3_BUCKET is required"):
        Settings(jwt_secret="test-secret", storage_backend="s3")
