"""A credencial do Worker só alcança elegibilidade, conclusão e expiração de Relatórios."""

import httpx


class ReportDelivery:
    def __init__(self, url: str, token: str):
        self.http = httpx.AsyncClient(
            base_url=url, headers={"Authorization": f"Bearer {token}"}, timeout=10
        )

    async def eligibility(self, request_id: str) -> str:
        response = await self.http.get(f"/v1/worker/reports/{request_id}")
        response.raise_for_status()
        return response.json()["status"]

    async def complete(self, request_id: str, status: str) -> str:
        response = await self.http.post(
            f"/v1/worker/reports/{request_id}/complete", json={"status": status}
        )
        response.raise_for_status()
        return response.json()["status"]

    async def expire(self) -> None:
        response = await self.http.post("/v1/worker/reports/expire")
        response.raise_for_status()

    async def close(self) -> None:
        await self.http.aclose()
