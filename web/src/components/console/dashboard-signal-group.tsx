import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DashboardSignalGroup({
  signals,
}: {
  signals: Array<{
    label: string;
    value: string;
    detail: string;
    icon: LucideIcon;
    tone?: "primary" | "success" | "warning" | "danger";
  }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {signals.map(({ label, value, detail, icon: Icon, tone = "primary" }) => (
        <Card key={label} className="min-h-[142px]">
          <CardContent className="flex h-full flex-col justify-between gap-5 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--ui-text-muted)]">{label}</span>
              <span className={cn(
                "grid size-9 place-items-center rounded-[var(--ui-radius-control)] shadow-[var(--ui-shadow-pressed)]",
                tone === "success" && "bg-[color-mix(in_srgb,var(--ui-success)_12%,transparent)] text-[var(--ui-success)]",
                tone === "warning" && "bg-[color-mix(in_srgb,var(--ui-warning)_12%,transparent)] text-[var(--ui-warning)]",
                tone === "danger" && "bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)] text-[var(--ui-danger)]",
                tone === "primary" && "bg-[color-mix(in_srgb,var(--ui-primary)_12%,transparent)] text-[var(--ui-primary)]",
              )}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight text-[var(--ui-text)]">{value}</p>
              <p className="mt-1 text-xs text-[var(--ui-text-muted)]">{detail}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
