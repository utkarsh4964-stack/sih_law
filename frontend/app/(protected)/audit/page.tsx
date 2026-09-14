"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { AuditEvent, AuditChainResult } from "@/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/utils";
import { ListChecks } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function AuditPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [caseFilter, setCaseFilter] = useState("");
  const [chainResult, setChainResult] = useState<AuditChainResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  function load() {
    api
      .getAudit({
        action: actionFilter || undefined,
        case_id: caseFilter || undefined,
      })
      .then(setEvents)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load audit trail."));
  }

  useEffect(load, [actionFilter, caseFilter]);

  async function verifyChain() {
    setVerifying(true);
    try {
      setChainResult(await api.verifyAuditChain());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Audit Trail"
        description="Append-only, hash-chained record of every sensitive action"
        action={
          user?.role === "ADMIN" && (
            <Button variant="primary" onClick={verifyChain} loading={verifying}>
              Verify audit chain
            </Button>
          )
        }
      />

      <div className="p-6">
        {chainResult && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-md border p-4 ${
              chainResult.status === "VALID"
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-critical/30 bg-critical/5 text-critical"
            }`}
          >
            {chainResult.status === "VALID" ? (
              <ShieldCheck size={16} />
            ) : (
              <ShieldAlert size={16} />
            )}
            <div>
              <p className="text-sm font-semibold">
                {chainResult.status === "VALID"
                  ? "Audit chain valid"
                  : "Audit chain integrity failure"}
              </p>
              <p className="text-xs opacity-80">{chainResult.detail}</p>
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          <input
            placeholder="Filter by action (e.g. DOCUMENT_UPLOADED)"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-[4px] border border-border-strong bg-surface px-3 py-2 text-xs outline-none placeholder:text-muted/60"
          />
          <input
            placeholder="Filter by case ID"
            value={caseFilter}
            onChange={(e) => setCaseFilter(e.target.value)}
            className="rounded-[4px] border border-border-strong bg-surface px-3 py-2 text-xs outline-none placeholder:text-muted/60"
          />
        </div>

        {error && <ErrorState message={error} />}
        {!error && !events && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {!error && events && events.length === 0 && (
          <EmptyState icon={ListChecks} title="No audit events match these filters" />
        )}
        {!error && events && events.length > 0 && (
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface">
                <tr className="text-muted">
                  <th className="px-4 py-2.5 font-medium">Time</th>
                  <th className="px-4 py-2.5 font-medium">Actor</th>
                  <th className="px-4 py-2.5 font-medium">Action</th>
                  <th className="px-4 py-2.5 font-medium">Resource</th>
                  <th className="px-4 py-2.5 font-medium">Case</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="bg-surface">
                {events.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-4 py-2.5 text-muted">{formatDateTime(e.timestamp)}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-text">
                      {e.actor_id || "system"}
                    </td>
                    <td className="px-4 py-2.5 text-text">{e.action.replace(/_/g, " ")}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-muted">
                      {e.resource_type} {e.resource_id}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-muted">{e.case_id || "—"}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge tone={e.status === "SUCCESS" ? "positive" : "critical"}>
                        {e.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
