import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border bg-background text-foreground",
        success:
          "border-[color-mix(in_srgb,var(--ui-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--ui-success)_12%,transparent)] text-[var(--ui-success)]",
        warning:
          "border-[color-mix(in_srgb,var(--ui-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--ui-warning)_12%,transparent)] text-[var(--ui-warning)]",
        danger:
          "border-[color-mix(in_srgb,var(--ui-danger)_28%,transparent)] bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)] text-[var(--ui-danger)]",
        info: "border-[color-mix(in_srgb,var(--ui-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--ui-primary)_12%,transparent)] text-[var(--ui-primary)]",
        violet:
          "border-[color-mix(in_srgb,var(--ui-creative)_28%,transparent)] bg-[color-mix(in_srgb,var(--ui-creative)_12%,transparent)] text-[var(--ui-creative)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
