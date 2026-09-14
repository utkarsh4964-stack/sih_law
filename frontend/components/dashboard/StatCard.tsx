import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "warning" | "critical";
}) {
  const toneColor =
    tone === "critical"
      ? "text-critical"
      : tone === "warning"
      ? "text-warning"
      : "text-primary";
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium tracking-wide text-muted">
          {label}
        </p>
        <Icon size={14} className={cn(toneColor)} />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-text">
        {value}
      </p>
    </div>
  );
}
