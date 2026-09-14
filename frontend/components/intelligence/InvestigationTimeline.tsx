import Link from "next/link";
import type { TimelineEvent } from "@/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { History } from "lucide-react";

export function InvestigationTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No timeline events yet"
        description="Timeline events are derived from uploaded case documents."
      />
    );
  }

  return (
    <ol className="relative space-y-6 border-l border-border pl-6">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[29px] top-1 h-2.5 w-2.5 rounded-full border-2 border-bg bg-primary" />
          <p className="text-[11px] font-medium tracking-wide text-primary">{e.date}</p>
          <p className="mt-0.5 text-sm text-text">{e.description}</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
            {e.source_document_id && (
              <Link
                href={`/documents/${e.source_document_id}`}
                className="font-mono hover:text-primary"
              >
                {e.source_document_id}
              </Link>
            )}
            {e.ai_extracted && (
              <span className="rounded-[3px] border border-border-strong px-1.5 py-0.5">
                AI extracted — verify
              </span>
            )}
            <span>{e.confidence}% confidence</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
