from __future__ import annotations

from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Header
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from api.support import require_identity
from services.account_service import account_service
from services.image_task_service import image_task_service
from services.log_service import log_service
from services.proxy_service import proxy_settings


Severity = Literal["ok", "warning", "critical"]


class DashboardAction(BaseModel):
    id: Literal["create", "diagnose"]
    label: str
    href: str
    blocked: bool = False


class DashboardAlert(BaseModel):
    severity: Literal["warning", "critical"]
    code: str
    title: str
    detail: str
    action: str
    href: str


class TaskSummary(BaseModel):
    queued: int = 0
    running: int = 0
    success: int = 0
    error: int = 0
    unfinished: int = 0
    recent: list[dict[str, object]] = Field(default_factory=list)


class DashboardSummary(BaseModel):
    role: Literal["admin", "user"]
    severity: Severity
    primary_action: DashboardAction
    tasks: TaskSummary
    available_models: list[str] = Field(default_factory=list)
    alerts: list[DashboardAlert] = Field(default_factory=list)
    accounts: dict[str, object] | None = None
    calls: dict[str, object] | None = None
    proxy: dict[str, object] | None = None
    recent_images: list[dict[str, object]] | None = None


def _action_for(severity: Severity) -> DashboardAction:
    if severity == "critical":
        return DashboardAction(id="diagnose", label="处理异常", href="/accounts", blocked=True)
    return DashboardAction(id="create", label="开始创作", href="/image")


def _admin_alerts(accounts: dict[str, object], tasks: dict[str, object]) -> list[DashboardAlert]:
    alerts: list[DashboardAlert] = []
    if not bool(accounts.get("healthy")):
        alerts.append(
            DashboardAlert(
                severity="critical",
                code="no-active-accounts",
                title="没有可用账号",
                detail="账号池当前没有可用于图像创作的正常账号。",
                action="检查账号池",
                href="/accounts",
            )
        )
    if int(accounts.get("limited") or 0) > 0:
        alerts.append(
            DashboardAlert(
                severity="warning",
                code="rate-limited-accounts",
                title="部分账号处于限流状态",
                detail=f"{int(accounts.get('limited') or 0)} 个账号需要关注。",
                action="查看账号",
                href="/accounts",
            )
        )
    if int(tasks.get("error") or 0) > 0:
        alerts.append(
            DashboardAlert(
                severity="warning",
                code="failed-image-tasks",
                title="近期图像任务存在失败",
                detail=f"{int(tasks.get('error') or 0)} 个任务需要检查。",
                action="查看创作",
                href="/image",
            )
        )
    return alerts


def _severity(alerts: list[DashboardAlert]) -> Severity:
    if any(alert.severity == "critical" for alert in alerts):
        return "critical"
    if alerts:
        return "warning"
    return "ok"


def create_router() -> APIRouter:
    router = APIRouter()

    @router.get("/api/dashboard/summary", response_model=DashboardSummary, response_model_exclude_none=True)
    async def get_dashboard_summary(authorization: str | None = Header(default=None)):
        identity = require_identity(authorization)
        role = "admin" if identity.get("role") == "admin" else "user"
        task_data = await run_in_threadpool(image_task_service.dashboard_summary, identity, include_all=role == "admin")
        tasks = TaskSummary(
            queued=int(task_data.get("queued") or 0),
            running=int(task_data.get("running") or 0),
            success=int(task_data.get("success") or 0),
            error=int(task_data.get("error") or 0),
            unfinished=int(task_data.get("unfinished") or 0),
            recent=list(task_data.get("recent") or []),
        )
        if role != "admin":
            return DashboardSummary(
                role="user",
                severity="ok",
                primary_action=_action_for("ok"),
                tasks=tasks,
                available_models=list(task_data.get("models") or []),
            )

        accounts = await run_in_threadpool(account_service.account_health)
        calls = await run_in_threadpool(
            log_service.call_stats_since,
            datetime.now() - timedelta(hours=24),
        )
        alerts = _admin_alerts(accounts, task_data)
        severity = _severity(alerts)
        return DashboardSummary(
            role="admin",
            severity=severity,
            primary_action=_action_for(severity),
            tasks=tasks,
            available_models=list(task_data.get("models") or []),
            alerts=alerts,
            accounts=accounts,
            calls=calls,
            proxy=await run_in_threadpool(proxy_settings.get_runtime_status),
            recent_images=list(task_data.get("recent_images") or []),
        )

    return router
