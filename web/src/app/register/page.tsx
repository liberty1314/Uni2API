"use client";

import { useEffect, useRef } from "react";
import { LoaderCircle, UserPlus } from "lucide-react";

import webConfig from "@/constants/common-env";
import { useAuthGuard } from "@/lib/use-auth-guard";
import type { RegisterConfig } from "@/lib/api";
import { getStoredAuthKey } from "@/store/auth";

import { useSettingsStore } from "../settings/store";
import { RegisterCard } from "./components/register-card";

function RegisterDataController() {
  const didLoadRef = useRef(false);
  const loadRegister = useSettingsStore((state) => state.loadRegister);
  const setRegisterConfig = useSettingsStore((state) => state.setRegisterConfig);

  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    void loadRegister();
  }, [loadRegister]);

  useEffect(() => {
    let source: EventSource | null = null;
    let closed = false;
    void getStoredAuthKey().then((token) => {
      if (closed || !token) return;
      const baseUrl = webConfig.apiUrl.replace(/\/$/, "");
      source = new EventSource(`${baseUrl}/api/register/events?token=${encodeURIComponent(token)}`);
      source.onmessage = (event) => {
        setRegisterConfig(JSON.parse(event.data) as RegisterConfig);
      };
    });
    return () => {
      closed = true;
      source?.close();
    };
  }, [setRegisterConfig]);

  return null;
}

function RegisterPageContent() {
  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 p-3 sm:p-5">
      <RegisterDataController />
      <header className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-[var(--ui-radius-control)] bg-[var(--ui-surface)] text-[var(--ui-primary)] shadow-[var(--ui-shadow-raised-sm)]">
          <UserPlus className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-medium text-[var(--ui-primary)]">账号自动化</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ui-text)]">ChatGPT 注册机</h1>
          <p className="mt-1 text-sm leading-6 text-[var(--ui-text-muted)]">配置邮箱提供商、代理与并发策略，自动创建并加入账户池。</p>
        </div>
      </header>
      <section>
        <RegisterCard />
      </section>
    </div>
  );
}

export default function RegisterPage() {
  const { isCheckingAuth, session } = useAuthGuard(["admin"]);

  if (isCheckingAuth || !session || session.role !== "admin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoaderCircle className="size-5 animate-spin text-[var(--ui-text-muted)]" />
      </div>
    );
  }

  return <RegisterPageContent />;
}
