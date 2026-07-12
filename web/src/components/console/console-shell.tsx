"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import webConfig from "@/constants/common-env";
import { fetchThirdPartyApps, type ThirdPartyAppsSettings } from "@/lib/api";
import { getValidatedAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/utils";
import { clearStoredAuthSession, type StoredAuthSession } from "@/store/auth";

import { visibleNavigation } from "./navigation";
import { CommandMenu } from "./command-menu";
import { ThemeControl } from "./theme-control";

function buildThirdPartyHref(appUrl: string, baseUrl: string, apiKey: string) {
  const url = appUrl.trim();
  try {
    const target = new URL(url);
    target.searchParams.set("apiKey", apiKey);
    target.searchParams.set("baseUrl", baseUrl);
    return target.toString();
  } catch {
    return `${url}${url.includes("?") ? "&" : "?"}apiKey=${encodeURIComponent(apiKey)}&baseUrl=${encodeURIComponent(baseUrl)}`;
  }
}

function isCurrentRoute(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function isLoginRoute(pathname: string) {
  return pathname === "/login" || pathname === "/login/";
}

type NavigationProps = {
  session: StoredAuthSession;
  pathname: string;
  canvasHref: string;
  onCanvas: () => void;
  collapsed?: boolean;
  onNavigate?: () => void;
};

function Navigation({ session, pathname, canvasHref, onCanvas, collapsed = false, onNavigate }: NavigationProps) {
  const items = visibleNavigation(session.role);
  const groups = ["workspace", "operations", "lab"] as const;
  const labels = { workspace: "工作区", operations: "运维", lab: "实验室" };

  return (
    <nav aria-label="主导航" className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2 py-4">
      {groups.map((group) => {
        const groupItems = items.filter((item) => item.group === group && (item.href !== "#canvas" || canvasHref));
        if (!groupItems.length) return null;
        return (
          <div key={group} className="space-y-1">
            {!collapsed ? <p className="px-3 pb-1 text-xs font-medium text-[var(--ui-text-subtle)]">{labels[group]}</p> : null}
            {groupItems.map((item) => {
              const active = item.href !== "#canvas" && isCurrentRoute(pathname, item.href);
              const content = <><item.icon className="size-[18px] shrink-0" aria-hidden="true" />{!collapsed ? <span className="truncate">{item.label}</span> : null}</>;
              const className = cn(
                "flex min-h-11 items-center gap-3 rounded-[var(--ui-radius-control)] px-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ease-[var(--ui-ease)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]",
                collapsed && "justify-center px-0",
                active ? "bg-[var(--ui-pressed)] text-[var(--ui-primary)] shadow-[var(--ui-shadow-pressed)]" : "text-[var(--ui-text-muted)] hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-text)]",
              );
              const link = <Link href={item.href} className={className} onClick={onNavigate} aria-current={active ? "page" : undefined}>{content}</Link>;
              const node = item.href === "#canvas" ? <button type="button" className={className} onClick={onCanvas} aria-label={item.label}>{content}</button> : onNavigate ? <SheetClose asChild>{link}</SheetClose> : link;
              return collapsed ? <Tooltip key={item.href}><TooltipTrigger asChild>{node}</TooltipTrigger><TooltipContent side="right">{item.label}</TooltipContent></Tooltip> : <div key={item.href}>{node}</div>;
            })}
          </div>
        );
      })}
    </nav>
  );
}

function SidebarContent({ session, pathname, canvasHref, onCanvas, collapsed, onLogout }: NavigationProps & { onLogout: () => void }) {
  const roleLabel = session.role === "admin" ? "管理员" : "普通用户";
  const name = session.name.trim() || roleLabel;
  return (
    <>
      <div className={cn("flex h-[76px] items-center gap-3 px-4", collapsed && "justify-center px-2")}>
        <Link href="/" className="flex min-h-11 min-w-11 items-center gap-3 rounded-[var(--ui-radius-control)] text-[var(--ui-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]" aria-label="Uni2API 工作台">
          <span className="grid size-11 place-items-center rounded-[14px] bg-[var(--ui-primary)] text-[var(--ui-primary-foreground)] shadow-[0_10px_22px_rgba(22,93,255,0.28)]"><Sparkles className="size-5" /></span>
          {!collapsed ? <span className="text-lg font-semibold">Uni2API</span> : null}
        </Link>
      </div>
      <Navigation session={session} pathname={pathname} canvasHref={canvasHref} onCanvas={onCanvas} collapsed={collapsed} />
      <div className={cn("border-t border-border p-3", collapsed && "px-2")}>
        {!collapsed ? <p className="mb-2 truncate px-2 text-xs text-[var(--ui-text-subtle)]">{roleLabel} · {name}</p> : null}
        <ThemeControl compact={collapsed} />
        <Button type="button" variant="ghost" className={cn("mt-2 w-full justify-start text-[var(--ui-text-muted)]", collapsed && "justify-center px-0")} onClick={onLogout} aria-label="退出登录"><LogOut className="size-4" />{!collapsed ? "退出登录" : null}</Button>
      </div>
    </>
  );
}

export function ConsoleShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<StoredAuthSession | null | undefined>(undefined);
  const [apps, setApps] = useState<ThirdPartyAppsSettings | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (isLoginRoute(pathname)) return () => { active = false; };
    void getValidatedAuthSession().then((next) => {
      if (!active) return;
      setSession(next);
      if (!next) router.replace("/login");
    });
    return () => { active = false; };
  }, [pathname, router]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    const load = async () => {
      try { const data = await fetchThirdPartyApps(); if (active) setApps(data.third_party_apps); }
      catch { if (active) setApps(null); }
    };
    void load();
    window.addEventListener("third-party-apps-updated", load);
    return () => { active = false; window.removeEventListener("third-party-apps-updated", load); };
  }, [session]);

  const canvasHref = useMemo(() => {
    if (!session || !apps?.infinite_canvas?.enabled || !apps.infinite_canvas.url.trim()) return "";
    return buildThirdPartyHref(apps.infinite_canvas.url, webConfig.apiUrl.replace(/\/$/, "") || window.location.origin, session.key);
  }, [apps, session]);
  const logout = async () => { await clearStoredAuthSession(); router.replace("/login"); };

  if (isLoginRoute(pathname)) return <>{children}</>;
  if (session === undefined || !session) return <div className="grid min-h-screen place-items-center text-sm text-[var(--ui-text-muted)]">正在验证登录状态</div>;

  const shellProps = { session, pathname, canvasHref, onCanvas: () => setCanvasOpen(true), onLogout: () => void logout() };
  const canvasDisplayHref = canvasHref ? decodeURIComponent(canvasHref) : "";
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[var(--ui-canvas)] p-3 sm:p-4">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">跳到主要内容</a>
        <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1720px] grid-cols-1 gap-3 md:grid-cols-[72px_minmax(0,1fr)] lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-5">
          <aside className="ui-surface hidden min-h-0 lg:flex lg:flex-col"><SidebarContent {...shellProps} collapsed={false} /></aside>
          <aside className="ui-surface hidden min-h-0 md:flex md:flex-col lg:hidden"><SidebarContent {...shellProps} collapsed /></aside>
          <main id="main-content" className="min-w-0">
            <div className="mb-3 flex min-h-12 items-center gap-3">
              <div className="flex items-center gap-3 md:hidden"><Sheet><SheetTrigger asChild><Button variant="outline" size="icon" aria-label="打开导航"><Menu className="size-5" /></Button></SheetTrigger><SheetContent side="left" className="w-[min(88vw,340px)] rounded-r-[var(--ui-radius-surface)] p-0"><SidebarContent {...shellProps} onNavigate={() => undefined} onLogout={() => void logout()} collapsed={false} /></SheetContent></Sheet><Link href="/" className="text-base font-semibold text-[var(--ui-text)]">Uni2API</Link></div>
              <div className="ml-auto flex items-center gap-2"><CommandMenu session={session} /><div className="md:hidden"><ThemeControl /></div></div>
            </div>
            {children}
          </main>
        </div>
      </div>
      <Dialog open={canvasOpen} onOpenChange={setCanvasOpen}><DialogContent showCloseButton={false}><DialogHeader><DialogTitle>跳转到三方应用</DialogTitle><DialogDescription>跳转地址会带上当前项目地址和密钥，用于自动填写连接信息。</DialogDescription></DialogHeader><div className="ui-control max-h-28 overflow-auto break-all px-3 py-2 font-mono text-xs leading-5 text-[var(--ui-text-muted)]">{canvasDisplayHref}</div><DialogFooter><DialogClose asChild><Button type="button" variant="outline">取消</Button></DialogClose><Button type="button" disabled={!canvasHref} onClick={() => { window.open(canvasHref, "_blank", "noopener,noreferrer"); setCanvasOpen(false); }}>继续跳转</Button></DialogFooter></DialogContent></Dialog>
    </TooltipProvider>
  );
}
