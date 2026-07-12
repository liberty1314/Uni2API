"use client";

import { Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { StoredAuthSession } from "@/store/auth";

import { visibleNavigation } from "./navigation";

export function CommandMenu({ session }: { session: StoredAuthSession }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const items = useMemo(() => visibleNavigation(session.role).filter((item) => item.href !== "#canvas" && item.label.includes(query.trim())), [query, session.role]);

  const navigate = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" aria-label="快速跳转" className="mt-2 w-full justify-start text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]">
          <span className="flex items-center gap-2"><Search className="size-4" aria-hidden="true" /><span className="hidden sm:inline">快速跳转</span></span>
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-3 p-3 sm:p-4">
        <DialogHeader className="sr-only"><DialogTitle>快速跳转</DialogTitle><DialogDescription>搜索可访问页面和常用操作</DialogDescription></DialogHeader>
        <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--ui-text-subtle)]" aria-hidden="true" /><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索页面或操作..." className="pl-9" /></div>
        <div className="max-h-[min(56vh,420px)] overflow-y-auto">
          <div className="space-y-1">
            <button type="button" className="flex min-h-11 w-full items-center gap-3 rounded-[var(--ui-radius-control)] px-3 text-left text-sm text-[var(--ui-text)] transition-colors hover:bg-[var(--ui-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]" onClick={() => navigate("/image")}><Sparkles className="size-4 text-[var(--ui-creative)]" aria-hidden="true" /><span className="flex-1">开始创作</span><span className="text-xs text-[var(--ui-text-subtle)]">草稿</span></button>
            {items.map((item) => <button key={item.href} type="button" className="flex min-h-11 w-full items-center gap-3 rounded-[var(--ui-radius-control)] px-3 text-left text-sm text-[var(--ui-text)] transition-colors hover:bg-[var(--ui-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]" onClick={() => navigate(item.href)}><item.icon className="size-4 text-[var(--ui-primary)]" aria-hidden="true" /><span>{item.label}</span></button>)}
            {!items.length && query.trim() ? <p className="px-3 py-8 text-center text-sm text-[var(--ui-text-muted)]">没有匹配的页面</p> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
