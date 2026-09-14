"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { SecurityAlert, SecurityStatus } from "@/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, toneForSeverity } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils";

export default function SecurityPage() {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  function load() {
    api.getSecurityStatus().then(setStatus).catch((e) => setError(msg(e)));
    api.getSecurityAlerts().then(setAlerts).catch((e) => setError(msg(e)));
  }

  useEffect(load, []);

  async function resolve(id: string) {
    setResolving(true);
    try {
      await api.resolveAlert(id);
      setConfirmId(null);
      load();
    } catch (e) {
      setError(msg(e));
    } finally {
      setResolving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Security Center"
        description="System integrity, audit-chain status, and open alerts"
      />

      <div className="p-6">
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="text-[11px] text-muted">System status</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary">
              <CheckCircle2 size={14} /> Operational
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="text-[11px] text-muted">Audit chain</p>
            {status ? (
              <p
                className={`mt-1 flex items-center gap-1.5 text-sm font-medium ${
                  status.audit_chain_status === "VALID" ? "text-primary" : "text-critical"
                }`}
              >
                {status.audit_chain_status === "VALID" ? (
                  <ShieldCheck size={14} />
                ) : (
                  <ShieldAlert size={14} />
                )}
                {status.audit_chain_status}
              </p>
            ) : (
              <Skeleton className="mt-2 h-4 w-20" />
            )}
          </div>
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="text-[11px] text-muted">Open alerts</p>
            {status ? (
              <p className="mt-1 text-sm font-medium text-text">
                {status.open_alerts} total · {status.critical_alerts} critical
              </p>
            ) : (
              <Skeleton className="mt-2 h-4 w-20" />
            )}
          </div>
        </div>

        {error && <ErrorState message={error} />}
        {!error && !alerts && (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        {!error && alerts && alerts.length === 0 && (
          <EmptyState icon={ShieldCheck} title="No security alerts" description="Everything is currently clear." />
        )}
        {!error && alerts && alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map((a) => (
              <div
                key={a.id}
                className={`rounded-md border p-4 ${
                  a.severity === "CRITICAL"
                    ? "border-critical/30 bg-critical/5"
                    : a.severity === "SUSPICIOUS"
                    ? "border-warning/30 bg-warning/5"
                    : "border-info/30 bg-info/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1.5 flex items-center gap-2">
                      <StatusBadge tone={toneForSeverity(a.severity)}>{a.severity}</StatusBadge>
                      {a.resolved && <StatusBadge tone="positive">RESOLVED</StatusBadge>}
                    </div>
                    <p className="text-sm font-medium text-text">{a.title}</p>
                    <p className="mt-1 text-xs text-muted">{a.description}</p>
                    <p className="mt-1 text-[11px] text-muted">{formatDateTime(a.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {a.document_id && (
                      <a
                        href={`/documents/${a.document_id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View document
                      </a>
                    )}
                    {!a.resolved && (
                      <Button
                        variant="secondary"
                        onClick={() => setConfirmId(a.id)}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-md border border-border bg-surface p-5">
            <div className="mb-2 flex items-center gap-2 text-warning">
              <AlertTriangle size={16} />
              <p className="text-sm font-semibold">Resolve this alert?</p>
            </div>
            <p className="text-xs text-muted">
              This marks the alert as resolved. This action is itself recorded in the audit trail.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmId(null)}>
                Cancel
              </Button>
              <Button variant="primary" loading={resolving} onClick={() => resolve(confirmId)}>
                Confirm resolve
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function msg(e: unknown): string {
  return e instanceof ApiError ? e.message : "Something went wrong.";
}
