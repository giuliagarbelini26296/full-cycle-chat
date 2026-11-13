from pydantic import Field, PositiveFloat, PositiveInt
from pydantic_settings import BaseSettings, SettingsConfigDict


class ReportWorkerConfig(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")
    database_url: str
    business_database_url: str
    report_redis_url: str
    chat_api_url: str
    chat_worker_token: str = Field(min_length=1, repr=False)
    s3_endpoint: str
    s3_access_key_id: str = Field(min_length=1, repr=False)
    s3_secret_access_key: str = Field(min_length=1, repr=False)
    s3_reports_bucket: str = "reports"
    business_query_timeout_s: PositiveFloat = 3
    business_query_max_rows: PositiveInt = 100
    report_max_tries: PositiveInt = 3
    report_job_timeout_s: PositiveInt = 120
    report_retention_seconds: PositiveInt = 86400

    @property
    def audit_dsn(self) -> str:
        return self.database_url.replace("postgresql+asyncpg://", "postgresql://")
