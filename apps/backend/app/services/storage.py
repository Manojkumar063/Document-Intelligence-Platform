"""File storage for local development and AWS S3 deployments."""
import asyncio
import logging
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

import boto3
from botocore.client import BaseClient
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import Settings, get_settings
from app.utils.exceptions import StorageError

logger = logging.getLogger(__name__)


class FileStorage:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._client: BaseClient | None = None

    async def save(self, user_id: str, filename: str, content: bytes, mime_type: str) -> str:
        if self.settings.storage_backend == "s3":
            bucket = self._get_bucket()
            key = f"{user_id}/{filename}"
            try:
                await asyncio.to_thread(
                    self._get_client().put_object,
                    Bucket=bucket,
                    Key=key,
                    Body=content,
                    ContentType=mime_type,
                )
            except (BotoCoreError, ClientError) as exc:
                logger.exception("Could not save upload to S3", extra={"bucket": bucket, "key": key})
                raise StorageError("Could not save file to S3") from exc
            return f"s3://{bucket}/{quote(key, safe='/')}"

        file_path = Path(self.settings.upload_dir) / user_id / filename
        try:
            await asyncio.to_thread(self._write_local, file_path, content)
        except OSError as exc:
            raise StorageError(f"Failed to write file: {exc}") from exc
        return str(file_path)

    async def read(self, location: str) -> bytes:
        parsed = self._parse_s3_location(location)
        if parsed:
            bucket, key = parsed
            try:
                return await asyncio.to_thread(
                    self._read_s3, self._get_client(), bucket, key
                )
            except (BotoCoreError, ClientError) as exc:
                logger.exception("Could not read file from S3", extra={"bucket": bucket, "key": key})
                raise StorageError("Could not read file from S3") from exc
        try:
            return await asyncio.to_thread(Path(location).read_bytes)
        except OSError as exc:
            raise StorageError(f"Could not read file: {exc}") from exc

    async def exists(self, location: str) -> bool:
        parsed = self._parse_s3_location(location)
        if parsed:
            bucket, key = parsed
            try:
                await asyncio.to_thread(
                    self._get_client().head_object, Bucket=bucket, Key=key
                )
                return True
            except ClientError as exc:
                code = exc.response.get("Error", {}).get("Code")
                if code in {"404", "NoSuchKey", "NotFound"}:
                    return False
                logger.exception("Could not check S3 object", extra={"bucket": bucket, "key": key})
                raise StorageError("Could not check file in S3") from exc
            except BotoCoreError as exc:
                logger.exception("Could not check S3 object", extra={"bucket": bucket, "key": key})
                raise StorageError("Could not check file in S3") from exc
        return await asyncio.to_thread(Path(location).is_file)

    async def delete(self, location: str) -> None:
        parsed = self._parse_s3_location(location)
        if parsed:
            bucket, key = parsed
            try:
                await asyncio.to_thread(
                    self._get_client().delete_object, Bucket=bucket, Key=key
                )
            except (BotoCoreError, ClientError) as exc:
                logger.exception("Could not delete S3 object", extra={"bucket": bucket, "key": key})
                raise StorageError("Could not delete file from S3") from exc
            return
        try:
            await asyncio.to_thread(Path(location).unlink, missing_ok=True)
        except OSError as exc:
            raise StorageError(f"Could not delete file: {exc}") from exc

    @staticmethod
    def _write_local(file_path: Path, content: bytes) -> None:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(content)

    def _get_bucket(self) -> str:
        bucket = self.settings.s3_bucket.strip()
        if not bucket:
            raise StorageError("S3_BUCKET must be set when STORAGE_BACKEND=s3")
        return bucket

    def _get_client(self) -> BaseClient:
        if self._client is None:
            client_options: dict[str, str] = {"region_name": self.settings.aws_region}
            access_key = self.settings.aws_access_key_id or None
            secret_key = self.settings.aws_secret_access_key or None
            session_token = self.settings.aws_session_token or None
            if access_key and secret_key:
                client_options["aws_access_key_id"] = access_key
                client_options["aws_secret_access_key"] = secret_key
                if session_token:
                    client_options["aws_session_token"] = session_token
            self._client = boto3.client("s3", **client_options)
        return self._client

    @staticmethod
    def _read_s3(client: BaseClient, bucket: str, key: str) -> bytes:
        response = client.get_object(Bucket=bucket, Key=key)
        return response["Body"].read()

    @staticmethod
    def _parse_s3_location(location: str) -> tuple[str, str] | None:
        if not location.startswith("s3://"):
            return None
        parsed = urlsplit(location)
        if not parsed.netloc or not parsed.path.lstrip("/"):
            raise StorageError("Invalid S3 object location")
        return parsed.netloc, unquote(parsed.path.lstrip("/"))


storage = FileStorage(get_settings())
