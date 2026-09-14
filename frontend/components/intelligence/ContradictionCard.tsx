import { AlertTriangle } from "lucide-react";
import type { Contradiction } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function ContradictionCard({ item }: { item: Contradiction }) {
  return (
    <div className="rounded-md border border-warning/30 bg-warning/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-warning">
          <AlertTriangle size={15} />
          <p className="text-sm font-semibold">Potential contradiction</p>
        </div>
        <StatusBadge tone="warning">{item.category}</StatusBadge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-[4px] border border-border-strong bg-bg p-2.5">
          <p className="mb-1 font-mono text-[10px] text-muted">{item.source_a || "Source A"}</p>
          <p className="text-text">{item.statement_a}</p>
        </div>
        <div className="rounded-[4px] border border-border-strong bg-bg p-2.5">
          <p className="mb-1 font-mono text-[10px] text-muted">{item.source_b || "Source B"}</p>
          <p className="text-text">{item.statement_b}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted">Confidence {item.confidence}%</span>
        <span className="font-medium text-warning">
          {item.status.replace(/_/g, " ")}
        </span>
      </div>
    </div>
  );
}
