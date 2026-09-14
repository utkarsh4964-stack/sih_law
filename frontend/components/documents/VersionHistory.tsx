import type { DocumentVersionRecord } from "@/types";
import { formatDateTime, truncateHash } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { GitBranch } from "lucide-react";

export function VersionHistory({ versions }: { versions: DocumentVersionRecord[] }) {
  if (versions.length === 0) {
    return <EmptyState icon={GitBranch} title="No versions found" />;
  }

  return (
    <div className="space-y-2">
      {versions.map((v, i) => (
        <div
          key={v.version_number}
          className="flex items-center justify-between rounded-[4px] border border-border-strong bg-bg px-3 py-2.5"
        >
          <div>
            <p className="text-xs font-medium text-text">
              Version {v.version_number} {i === 0 && <span className="text-primary">· current</span>}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-muted">{truncateHash(v.sha256_hash, 10)}</p>
          </div>
          <div className="text-right text-[11px] text-muted">
            <p>{formatDateTime(v.created_at)}</p>
            {v.change_reason && <p className="mt-0.5">{v.change_reason}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
