import json

from arq.connections import RedisSettings, create_pool

QUEUE_NAME = "chat:reports"


def serialize(value) -> bytes:
    return json.dumps(value, ensure_ascii=False).encode()


def deserialize(value: bytes):
    return json.loads(value)


async def enqueue_report(
    redis_url: str, request_id: str, *, expires_s: int = 1800
) -> None:
    pool = await create_pool(
        RedisSettings.from_dsn(redis_url),
        job_serializer=serialize,
        job_deserializer=deserialize,
        default_queue_name=QUEUE_NAME,
    )
    try:
        await pool.enqueue_job(
            "generate_report",
            request_id,
            _job_id=f"report:{request_id}",
            _expires=expires_s,
        )
    finally:
        await pool.aclose()
