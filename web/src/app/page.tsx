"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, Images, RefreshCw, ServerCog, ShieldCheck, Sparkles, TriangleAlert, Users } from "lucide-react";

import { DashboardSignalGroup } from "@/components/console/dashboard-signal-group";
import { EmptyState } from "@/components/console/empty-state";
import { QuickCreatePanel } from "@/components/console/quick-create-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchDashboardSummary, type DashboardAlert, type DashboardSummary, type DashboardTask } from "@/lib/api";
import { useAuthGuard } from "@/lib/use-auth-guard";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function statusLabel(status: DashboardTask["status"]) {
  return status === "queued" ? "排队中" : status === "running" ? "处理中" : status === "success" ? "已完成" : "失败";
}

function statusVariant(status: DashboardTask["status"]): "success" | "warning" | "danger" | "secondary" {
  return status === "success" ? "success" : status === "error" ? "danger" : status === "running" ? "warning" : "secondary";
}

function AlertRow({ alert }: { alert: DashboardAlert }) {
  const critical = alert.severity === "critical";
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-[var(--ui-radius-control)] border border-[color-mix(in_srgb,var(--ui-danger)_24%,transparent)] bg-[color-mix(in_srgb,var(--ui-danger)_7%,transparent)] px-4 py-3">
      {critical ? <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--ui-danger)]" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--ui-warning)]" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[var(--ui-text)]">{alert.title}</p>
        <p className="mt-1 text-sm leading-5 text-[var(--ui-text-muted)]">{alert.detail}</p>
      </div>
      <Button asChild variant="outline" size="sm"><Link href={alert.href}>{alert.action}<ExternalLink className="size-3.5" aria-hidden="true" /></Link></Button>
    </div>
  );
}

function TaskList({ tasks }: { tasks: DashboardTask[] }) {
  if (!tasks.length) return <EmptyState title="还没有创作任务" description="从快速创作开始，生成的任务会出现在这里。" action="开始创作" onAction={() => { window.location.href = "/image"; }} />;
  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <Link key={task.id} href="/image" className="flex min-h-16 items-center gap-3 rounded-[var(--ui-radius-control)] px-3 py-2 transition-colors hover:bg-[var(--ui-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]">
          {task.image_url ? <img src={task.image_url} alt="任务结果缩略图" className="size-11 shrink-0 rounded-[10px] object-cover" /> : <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-[var(--ui-surface-muted)] text-[var(--ui-text-muted)]"><Clock3 className="size-4" aria-hidden="true" /></span>}
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-[var(--ui-text)]">{task.model || "图像任务"}</span><span className="mt-1 block text-xs text-[var(--ui-text-muted)]">{formatDate(task.updated_at)}</span></span>
          <Badge variant={statusVariant(task.status)}>{statusLabel(task.status)}</Badge>
        </Link>
      ))}
    </div>
  );
}

function WorkbenchSkeleton() {
  return <div className="space-y-5" aria-label="正在加载工作台" aria-busy="true"><div className="h-28 animate-pulse rounded-[var(--ui-radius-surface)] bg-[var(--ui-surface-muted)]" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-[var(--ui-radius-surface)] bg-[var(--ui-surface-muted)]" />)}</div><div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"><div className="h-80 animate-pulse rounded-[var(--ui-radius-surface)] bg-[var(--ui-surface-muted)]" /><div className="h-80 animate-pulse rounded-[var(--ui-radius-surface)] bg-[var(--ui-surface-muted)]" /></div></div>;
}

function AdminWorkbench({ summary, displayName }: { summary: Extract<DashboardSummary, { role: "admin" }>; displayName: string }) {
  const accountTone = summary.accounts.healthy ? "success" : "danger";
  const callRate = summary.calls.success_rate == null ? "—" : `${Math.round(summary.calls.success_rate * 100)}%`;
  const proxyText = summary.proxy.enabled ? (summary.proxy.has_proxy ? "代理已配置" : "代理待配置") : "直连模式";
  return (
    <div className="space-y-5">
      <section className="ui-surface flex flex-wrap items-center justify-between gap-5 p-5 sm:p-7">
        <div className="max-w-2xl"><p className="text-sm font-medium text-[var(--ui-primary)]">管理员工作台</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--ui-text)] sm:text-3xl">你好，{displayName}</h1><p className="mt-2 text-sm leading-6 text-[var(--ui-text-muted)]">在同一处确认运行信号、处理异常，并继续你的下一次创作。</p></div>
        <Button asChild size="lg" variant={summary.primary_action.id === "diagnose" ? "destructive" : "default"}><Link href={summary.primary_action.href}>{summary.primary_action.id === "diagnose" ? <TriangleAlert className="size-4" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}{summary.primary_action.label}</Link></Button>
      </section>
      <DashboardSignalGroup signals={[{ label: "账号健康", value: `${summary.accounts.active}/${summary.accounts.total}`, detail: summary.accounts.status, icon: Users, tone: accountTone }, { label: "进行中任务", value: String(summary.tasks.unfinished), detail: `${summary.tasks.queued} 个排队 · ${summary.tasks.running} 个处理中`, icon: Clock3, tone: summary.tasks.unfinished ? "warning" : "success" }, { label: "24 小时调用", value: String(summary.calls.total), detail: summary.calls.success_rate == null ? "暂无可统计调用" : `${summary.calls.success} 次成功 · 成功率 ${callRate}`, icon: ServerCog, tone: "primary" }, { label: "运行出口", value: summary.proxy.enabled ? "已启用" : "直连", detail: proxyText, icon: ShieldCheck, tone: summary.proxy.enabled && !summary.proxy.has_proxy ? "warning" : "success" }]} />
      {summary.alerts.length ? <section className="space-y-2"><div className="flex items-center gap-2"><h2 className="text-sm font-semibold text-[var(--ui-text)]">需要留意</h2><Badge variant={summary.severity === "critical" ? "danger" : "warning"}>{summary.alerts.length} 项</Badge></div>{summary.alerts.map((alert) => <AlertRow key={alert.code} alert={alert} />)}</section> : <div className="flex items-center gap-2 rounded-[var(--ui-radius-control)] bg-[color-mix(in_srgb,var(--ui-success)_9%,transparent)] px-4 py-3 text-sm text-[var(--ui-success)]"><CheckCircle2 className="size-4" aria-hidden="true" />运行信号正常，可以开始创作。</div>}
      <QuickCreatePanel models={summary.available_models} disabled={summary.primary_action.blocked} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="size-4 text-[var(--ui-primary)]" aria-hidden="true" />任务状态</CardTitle></CardHeader><CardContent><TaskList tasks={summary.tasks.recent} /></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Images className="size-4 text-[var(--ui-creative)]" aria-hidden="true" />最新作品</CardTitle></CardHeader><CardContent>{summary.recent_images.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{summary.recent_images.slice(0, 6).map((image) => <Link key={image.task_id} href="/image" className="group overflow-hidden rounded-[var(--ui-radius-control)] bg-[var(--ui-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]"><img src={image.url} alt="最近生成的作品" className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" /><span className="block truncate px-2 py-2 text-xs text-[var(--ui-text-muted)]">{formatDate(image.created_at)}</span></Link>)}</div> : <EmptyState title="还没有作品" description="完成第一次创作后，最近作品会显示在这里。" action="开始创作" onAction={() => { window.location.href = "/image"; }} />}</CardContent></Card></div>
    </div>
  );
}

function UserWorkbench({ summary, displayName }: { summary: Extract<DashboardSummary, { role: "user" }>; displayName: string }) {
  return <div className="space-y-5"><section className="ui-surface flex flex-wrap items-center justify-between gap-5 p-5 sm:p-7"><div><p className="text-sm font-medium text-[var(--ui-primary)]">个人工作台</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--ui-text)]">你好，{displayName}</h1><p className="mt-2 text-sm leading-6 text-[var(--ui-text-muted)]">继续你的创作，或查看最近任务进度。</p></div><Button asChild size="lg"><Link href="/image"><Sparkles className="size-4" aria-hidden="true" />开始创作</Link></Button></section><DashboardSignalGroup signals={[{ label: "未完成任务", value: String(summary.tasks.unfinished), detail: `${summary.tasks.queued} 个排队 · ${summary.tasks.running} 个处理中`, icon: Clock3, tone: summary.tasks.unfinished ? "warning" : "success" }, { label: "最近完成", value: String(summary.tasks.success), detail: "保留在个人任务记录中", icon: CheckCircle2, tone: "success" }, { label: "可用模型", value: String(summary.available_models.length), detail: "进入创作页可调整", icon: Sparkles, tone: "primary" }, { label: "失败任务", value: String(summary.tasks.error), detail: summary.tasks.error ? "可从任务记录重试" : "暂无失败", icon: TriangleAlert, tone: summary.tasks.error ? "danger" : "success" }]} /><QuickCreatePanel models={summary.available_models} disabled={summary.primary_action.blocked} /><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="size-4 text-[var(--ui-primary)]" aria-hidden="true" />我的最近任务</CardTitle></CardHeader><CardContent><TaskList tasks={summary.tasks.recent} /></CardContent></Card></div>;
}

export default function HomePage() {
  const { isCheckingAuth, session } = useAuthGuard();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setError(null);
    try { setSummary(await fetchDashboardSummary()); } catch (reason) { setError(reason instanceof Error ? reason.message : "工作台数据加载失败"); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => void loadSummary(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSummary, session]);

  useEffect(() => {
    if (!summary || summary.tasks.unfinished === 0) return;
    const timer = window.setInterval(() => void loadSummary(), 15000);
    return () => window.clearInterval(timer);
  }, [loadSummary, summary]);

  const displayName = useMemo(() => session?.name.trim() || (session?.role === "admin" ? "管理员" : "创作者"), [session]);
  if (isCheckingAuth || !session || isLoading) return <div className="mx-auto w-full max-w-[1500px] p-3 sm:p-5"><WorkbenchSkeleton /></div>;
  if (error && !summary) return <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-5 text-center"><span className="grid size-12 place-items-center rounded-[var(--ui-radius-control)] bg-[color-mix(in_srgb,var(--ui-danger)_10%,transparent)] text-[var(--ui-danger)]"><RefreshCw className="size-5" aria-hidden="true" /></span><div><h1 className="font-semibold text-[var(--ui-text)]">工作台暂时无法加载</h1><p className="mt-2 text-sm leading-6 text-[var(--ui-text-muted)]">{error}</p></div><Button type="button" onClick={() => { setIsLoading(true); void loadSummary(); }}><RefreshCw className="size-4" />重试</Button></div>;
  return <div className="mx-auto w-full max-w-[1500px] p-3 sm:p-5">{summary?.role === "admin" ? <AdminWorkbench summary={summary} displayName={displayName} /> : summary ? <UserWorkbench summary={summary} displayName={displayName} /> : null}</div>;
}
