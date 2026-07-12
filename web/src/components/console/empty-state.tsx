import { ArrowRight, Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-[var(--ui-radius-surface)] border border-dashed border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/55 px-6 py-8 text-center">
      <span className="grid size-11 place-items-center rounded-[var(--ui-radius-control)] bg-[var(--ui-surface)] text-[var(--ui-text-muted)] shadow-[var(--ui-shadow-raised-sm)]">
        <Inbox className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="font-medium text-[var(--ui-text)]">{title}</p>
        <p className="max-w-sm text-sm leading-6 text-[var(--ui-text-muted)]">{description}</p>
      </div>
      {action && onAction ? (
        <Button type="button" variant="outline" size="sm" onClick={onAction}>
          {action}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
