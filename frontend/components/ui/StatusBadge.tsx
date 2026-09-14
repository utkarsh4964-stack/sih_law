import { cn } from "@/lib/utils";

export type StatusTone = "positive" | "warning" | "critical" | "neutral" | "info";

const TONE_STYLES: Record<StatusTone, string> = {
  positive: "bg-primary/10 text-primary border-primary/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  critical: "bg-critical/10 text-critical border-critical/30",
  info: "bg-info/10 text-info border-info/30",
  neutral: "bg-white/5 text-muted border-border-strong",
};

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        TONE_STYLES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function toneForIntegrity(status: string): StatusTone {
  if (status === "VERIFIED") return "positive";
  if (status === "VIOLATION") return "critical";
  return "neutral";
}

export function toneForSeverity(severity: string): StatusTone {
  if (severity === "CRITICAL") return "critical";
  if (severity === "SUSPICIOUS") return "warning";
  return "info";
}

export function toneForPriority(priority: string): StatusTone {
  if (priority === "CRITICAL") return "critical";
  if (priority === "HIGH") return "warning";
  if (priority === "MEDIUM") return "info";
  return "neutral";
}
