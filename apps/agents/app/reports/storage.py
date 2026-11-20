from datetime import UTC, datetime
from uuid import UUID

import boto3
from botocore.config import Config

from app.reports.config import ReportWorkerConfig


def object_key(request_id: str) -> str:
    return f"reports/{UUID(request_id)}.pdf"


class ReportStorage:
    def __init__(self, settings: ReportWorkerConfig):
        self.bucket = settings.s3_reports_bucket
        self.retention = settings.report_retention_seconds
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            region_name="us-east-1",
            aws_access_key_id=settings.s3_access_key_id,
            aws_secret_access_key=settings.s3_secret_access_key,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "path"},
                connect_timeout=2,
                read_timeout=10,
                retries={"max_attempts": 2},
            ),
        )

    def upload(self, request_id: str, content: bytes) -> None:
        self.client.put_object(
            Bucket=self.bucket,
            Key=object_key(request_id),
            Body=content,
            ContentType="application/pdf",
            CacheControl="private, no-store",
            ACL="private",
        )

    def cleanup(self) -> int:
        removed = 0
        paginator = self.client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.bucket, Prefix="reports/"):
            for item in page.get("Contents", []):
                key = item["Key"]
                # Nunca apaga chaves fora do padrão próprio, nem objetos ainda válidos.
                try:
                    request_id = key.removeprefix("reports/").removesuffix(".pdf")
                    if key != object_key(request_id):
                        continue
                except ValueError:
                    continue
                if (
                    datetime.now(UTC) - item["LastModified"]
                ).total_seconds() >= self.retention:
                    self.client.delete_object(Bucket=self.bucket, Key=key)
                    removed += 1
        return removed

    def close(self):
        self.client.close()
