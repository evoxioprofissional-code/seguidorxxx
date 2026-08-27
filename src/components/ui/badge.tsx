import { cn } from "@/lib/utils";
import { STATUS_META } from "@/lib/orders/status";
import type { OrderStatus } from "@/types/database";

export function Badge({
  className,
  children,
  color = "default",
}: {
  className?: string;
  children: React.ReactNode;
  color?: "default" | "primary" | "success" | "warning" | "danger" | "info";
}) {
  const colors: Record<string, string> = {
    default: "bg-surface-3 text-fg-muted border-border",
    primary: "bg-primary/12 text-primary-soft border-primary/25",
    success: "bg-success/12 text-success border-success/25",
    warning: "bg-warning/12 text-warning border-warning/25",
    danger: "bg-danger/12 text-danger border-danger/25",
    info: "bg-info/12 text-info border-info/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        colors[color],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs font-medium">
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      <span className={meta.color}>{meta.label}</span>
    </span>
  );
}
