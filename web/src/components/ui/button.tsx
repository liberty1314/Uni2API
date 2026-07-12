import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--ui-radius-control)] text-sm font-medium transition-[transform,background-color,color,box-shadow] duration-150 ease-[var(--ui-ease)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_10px_22px_rgba(22,93,255,0.26)] hover:bg-[var(--ui-primary-hover)] hover:shadow-[0_14px_26px_rgba(22,93,255,0.32)] active:translate-y-px active:shadow-[var(--ui-shadow-pressed)]",
        destructive:
          "bg-destructive text-white shadow-[0_10px_22px_rgba(181,53,74,0.22)] hover:bg-destructive/90 active:translate-y-px",
        outline:
          "border border-border bg-card text-foreground shadow-[var(--ui-shadow-raised-sm)] hover:bg-secondary hover:text-accent-foreground active:translate-y-px active:shadow-[var(--ui-shadow-pressed)]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[var(--ui-shadow-raised-sm)] hover:bg-accent active:translate-y-px active:shadow-[var(--ui-shadow-pressed)]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2 has-[>svg]:px-3",
        sm: "min-h-9 h-9 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 px-6 has-[>svg]:px-4",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
