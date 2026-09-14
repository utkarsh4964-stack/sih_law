"use client";

import { useRouter } from "next/navigation";
import type { LawDocument } from "@/types";
import { StatusBadge, toneForIntegrity } from "@/components/ui/StatusBadge";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileText } from "lucide-react";

export function DocumentTable({ documents }: { documents: LawDocument[] }) {
  const router = useRouter();

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents found"
        description="Upload the first investigation document to begin building this case's evidence record."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-surface">
          <tr className="text-muted">
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">Classification</th>
            <th className="px-4 py-2.5 font-medium">Integrity</th>
            <th className="px-4 py-2.5 font-medium">Version</th>
            <th className="px-4 py-2.5 font-medium">Size</th>
            <th className="px-4 py-2.5 font-medium">Uploaded</th>
          </tr>
        </thead>
        <tbody className="bg-surface">
          {documents.map((d) => (
            <tr
              key={d.id}
              onClick={() => router.push(`/documents/${d.id}`)}
              className="cursor-pointer border-t border-border hover:bg-white/[0.03]"
            >
              <td className="px-4 py-3">
                <p className="text-text">{d.name}</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted">{d.id}</p>
              </td>
              <td className="px-4 py-3 text-muted">{d.type.replace(/_/g, " ")}</td>
              <td className="px-4 py-3 text-muted">{d.classification.replace(/_/g, " ")}</td>
              <td className="px-4 py-3">
                <StatusBadge tone={toneForIntegrity(d.integrity_status)}>
                  {d.integrity_status}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 text-text">v{d.current_version}</td>
              <td className="px-4 py-3 text-muted">{formatBytes(d.size)}</td>
              <td className="px-4 py-3 text-muted">{formatDateTime(d.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
