import type { CustodyEvent } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { History } from "lucide-react";

const DOT_TONE: Record<string, string> = {
  INTEGRITY_VIOLATION: "bg-critical",
  VERIFIED: "bg-primary",
  UPLOADED: "bg-primary",
  VIEWED: "bg-info",
  DOWNLOADED: "bg-info",
};

export function CustodyTimeline({ events }: { events: CustodyEvent[] }) {
  if (events.length === 0) {
    return <EmptyState icon={History} title="No custody events yet" />;
  }

  return (
    <ol className="relative space-y-5 border-l border-border pl-6">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span
            className={`absolute -left-[29px] top-1 h-2.5 w-2.5 rounded-full border-2 border-bg ${
              DOT_TONE[e.action] || "bg-muted"
            }`}
          />
          <p className="text-xs font-semibold tracking-wide text-text">
            {e.action.replace(/_/g, " ")}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">{formatDateTime(e.timestamp)}</p>
          {e.description && <p className="mt-0.5 text-xs text-muted">{e.description}</p>}
        </li>
      ))}
    </ol>
  );
}
