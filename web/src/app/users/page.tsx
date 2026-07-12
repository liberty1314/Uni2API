"use client";

import { LoaderCircle, UserRoundCog } from "lucide-react";

import { UserKeysCard } from "@/app/settings/components/user-keys-card";
import { useAuthGuard } from "@/lib/use-auth-guard";

export default function UsersPage() {
  const { isCheckingAuth, session } = useAuthGuard(["admin"]);

  if (isCheckingAuth || !session || session.role !== "admin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" aria-label="正在验证管理员权限">
        <LoaderCircle className="size-5 animate-spin text-[var(--ui-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 p-3 sm:p-5">
      <header className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-[var(--ui-radius-control)] bg-[var(--ui-surface)] text-[var(--ui-primary)] shadow-[var(--ui-shadow-raised-sm)]">
          <UserRoundCog className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-medium text-[var(--ui-primary)]">访问与成员</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ui-text)]">用户管理</h1>
          <p className="mt-1 text-sm leading-6 text-[var(--ui-text-muted)]">创建普通用户访问密钥，并管理启用状态与备注名称。</p>
        </div>
      </header>
      <UserKeysCard />
    </div>
  );
}
