import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "info";
  hint?: string;
}) {
  const accents: Record<string, string> = {
    primary: "bg-primary/12 text-primary-soft",
    success: "bg-success/12 text-success",
    warning: "bg-warning/12 text-warning",
    info: "bg-info/12 text-info",
  };
  return (
    <div className="card relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-fg-muted">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-fg">{value}</p>
          {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            accents[accent]
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
