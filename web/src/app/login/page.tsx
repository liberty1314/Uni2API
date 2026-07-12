"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClipboardPaste, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

import { ThemeControl } from "@/components/console/theme-control";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/api";
import { useRedirectIfAuthenticated } from "@/lib/use-auth-guard";
import { getDefaultRouteForRole, setStoredAuthSession } from "@/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const [authKey, setAuthKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const { isCheckingAuth } = useRedirectIfAuthenticated();

  const handleLogin = async () => {
    const normalizedAuthKey = authKey.trim();
    if (!normalizedAuthKey) {
      setFieldError("请输入访问密钥");
      return;
    }

    setFieldError("");
    setIsSubmitting(true);
    try {
      const data = await login(normalizedAuthKey);
      await setStoredAuthSession({
        key: normalizedAuthKey,
        role: data.role,
        subjectId: data.subject_id,
        name: data.name,
      });
      router.replace(getDefaultRouteForRole(data.role));
    } catch (error) {
      const message = error instanceof Error ? error.message : "登录失败";
      setFieldError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="grid min-h-[calc(100vh-1rem)] w-full place-items-center px-4 py-6">
        <LoaderCircle className="size-5 animate-spin text-[var(--ui-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="grid min-h-[calc(100vh-1rem)] w-full place-items-center px-4 py-6">
      <div className="fixed top-4 right-4 z-10"><ThemeControl compact={false} /></div>
      <Card className="w-full max-w-[505px]">
        <CardContent className="space-y-7 p-6 sm:p-8">
          <div className="space-y-4 text-center">
            <div className="mx-auto inline-flex size-14 items-center justify-center rounded-[18px] bg-[var(--ui-primary)] text-[var(--ui-primary-foreground)] shadow-[var(--ui-shadow-raised-sm)]">
              <LockKeyhole className="size-5" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ui-primary)]">Uni2API</p>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--ui-text)]">进入工作台</h1>
              <p className="text-sm leading-6 text-[var(--ui-text-muted)]">输入访问密钥，继续管理运行状态与图像创作。</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="auth-key" className="block text-sm font-medium text-[var(--ui-text)]">
              密钥
              </label>
              <button type="button" className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--ui-radius-control)] px-2 text-xs text-[var(--ui-text-muted)] hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-text)] focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]" onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setAuthKey(text);
                  toast.success("已粘贴密钥");
                } catch {
                  toast.error("无法读取剪贴板");
                }
              }}>
                <ClipboardPaste className="size-4" /> 粘贴
              </button>
            </div>
            <div className="relative">
              <Input
                id="auth-key"
                type={showKey ? "text" : "password"}
                value={authKey}
                onChange={(event) => { setAuthKey(event.target.value); if (fieldError) setFieldError(""); }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleLogin();
                }}
                placeholder="请输入访问密钥"
                className="h-13 pr-12"
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? "auth-key-error" : undefined}
              />
              <button type="button" className="ui-icon-button absolute top-1/2 right-1 -translate-y-1/2" aria-label={showKey ? "隐藏密钥" : "显示密钥"} onClick={() => setShowKey((value) => !value)}>
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {fieldError ? <p id="auth-key-error" role="alert" className="flex items-center gap-2 text-sm text-[var(--ui-danger)]"><span aria-hidden="true">!</span>{fieldError}</p> : null}
          </div>

          <Button
            className="h-13 w-full"
            onClick={() => void handleLogin()}
            disabled={isSubmitting}
          >
            {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
            登录
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
