"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export type ThemePreference = "light" | "dark" | "system";

const THEME_KEY = "uni2api-theme";
const LEGACY_THEME_KEY = "chatgpt2api-theme";

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(preference: ThemePreference) {
  const resolved = preference === "system" ? getSystemTheme() : preference;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

function readPreference(): ThemePreference {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  const legacy = localStorage.getItem(LEGACY_THEME_KEY);
  if (legacy === "light" || legacy === "dark") {
    localStorage.setItem(THEME_KEY, legacy);
    return legacy;
  }
  return "system";
}

export function ThemeControl({ compact = false }: { compact?: boolean }) {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const next = readPreference();
    applyTheme(next);
    const syncTimer = window.setTimeout(() => setPreference(next), 0);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readPreference() === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => {
      window.clearTimeout(syncTimer);
      media.removeEventListener("change", onChange);
    };
  }, []);

  const setTheme = (next: ThemePreference) => {
    localStorage.setItem(THEME_KEY, next);
    setPreference(next);
    applyTheme(next);
  };

  const options = [
    { value: "light" as const, label: "浅色", icon: Sun },
    { value: "dark" as const, label: "深色", icon: Moon },
    { value: "system" as const, label: "跟随系统", icon: Monitor },
  ];

  return (
    <div aria-label="主题" className={compact ? "grid grid-cols-3 gap-1" : "flex items-center gap-1 rounded-[var(--ui-radius-control)] bg-[var(--ui-control)] p-1 shadow-[var(--ui-shadow-pressed)]"}>
      {options.map(({ value, label, icon: Icon }) => (
        <Button key={value} type="button" variant={preference === value ? "secondary" : "ghost"} size="icon" className="size-9 min-h-9 rounded-xl" aria-label={label} aria-pressed={preference === value} title={label} onClick={() => setTheme(value)}>
          <Icon className="size-4" />
        </Button>
      ))}
    </div>
  );
}
