"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Folders,
  FileText,
  AlertTriangle,
  ShieldAlert,
  GitCompareArrows,
  ArrowUpRight,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Case, CaseStats, SecurityAlert, SecurityStatus } from "@/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { StatusBadge, toneForPriority, toneForSeverity } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils";

export default function DashboardPage() {
  const [cases, setCases] = useState<Case[] | null>(null);
  const [statsByCase, setStatsByCase] = useState<Record<string, CaseStats>>({});
  const [alerts, setAlerts] = useState<SecurityAlert[] | null>(null);
  const [security, setSecurity] = useState<SecurityStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [caseList, alertList, sec] = await Promise.all([
          api.getCases(),
          api.getSecurityAlerts(false),
          api.getSecurityStatus(),
        ]);
        if (!mounted) return;
        setCases(caseList);
        setAlerts(alertList);
        setSecurity(sec);

        const statPairs = await Promise.all(
          caseList.map(async (c) => [c.id, await api.getCaseStats(c.id)] as const)
        );
        if (!mounted) return;
        setStatsByCase(Object.fromEntries(statPairs));
      } catch (e) {
        if (mounted) setError(e instanceof ApiError ? e.message : "Failed to load dashboard.");
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <ErrorState message={error} />
      </div>
    );
  }

  const totalDocuments = Object.values(statsByCase).reduce((s, c) => s + c.documents, 0);
  const totalContradictions = Object.values(statsByCase).reduce(
    (s, c) => s + c.contradictions,
    0
  );
  const activeCases = cases?.filter(
    (c) => c.status !== "CLOSED" && c.status !== "ARCHIVED"
  ).length;

  return (
    <div>
      <PageHeader
        title="Command Center"
        description="Cross-case investigation, evidence and security overview"
      />

      <div className="p-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {cases ? (
            <StatCard label="Active cases" value={activeCases ?? 0} icon={Folders} />
          ) : (
            <Skeleton className="h-[74px]" />
          )}
          {cases ? (
            <StatCard label="Documents" value={totalDocuments} icon={FileText} />
          ) : (
            <Skeleton className="h-[74px]" />
          )}
          {cases ? (
            <StatCard
              label="Potential contradictions"
              value={totalContradictions}
              icon={GitCompareArrows}
              tone={totalContradictions > 0 ? "warning" : "default"}
            />
          ) : (
            <Skeleton className="h-[74px]" />
          )}
          {security ? (
            <StatCard
              label="Open security alerts"
              value={security.open_alerts}
              icon={ShieldAlert}
              tone={security.open_alerts > 0 ? "critical" : "default"}
            />
          ) : (
            <Skeleton className="h-[74px]" />
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-border bg-surface lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">Active investigations</h3>
              <Link
                href="/cases"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View all <ArrowUpRight size={12} />
              </Link>
            </div>
            {!cases ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : cases.length === 0 ? (
              <p className="p-4 text-sm text-muted">No cases assigned yet.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-muted">
                    <th className="px-4 py-2 font-medium">Case</th>
                    <th className="px-4 py-2 font-medium">Priority</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Documents</th>
                    <th className="px-4 py-2 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr
                      key={c.id}
                      className="cursor-pointer border-t border-border hover:bg-white/[0.03]"
                      onClick={() => (window.location.href = `/cases/${c.id}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-mono text-[11px] text-primary">{c.id}</p>
                        <p className="mt-0.5 text-text">{c.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={toneForPriority(c.priority)}>
                          {c.priority}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {c.status.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-text">
                        {statsByCase[c.id]?.documents ?? "…"}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {formatDateTime(c.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-md border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">Security alerts</h3>
              <Link
                href="/security"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View all <ArrowUpRight size={12} />
              </Link>
            </div>
            {!alerts ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ) : alerts.length === 0 ? (
              <p className="p-4 text-sm text-muted">No open alerts.</p>
            ) : (
              <div className="divide-y divide-border">
                {alerts.slice(0, 6).map((a) => (
                  <div key={a.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={toneForSeverity(a.severity)}>
                        {a.severity}
                      </StatusBadge>
                    </div>
                    <p className="mt-1.5 text-xs text-text">{a.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {formatDateTime(a.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-3">
          <AlertTriangle
            size={14}
            className={security?.audit_chain_status === "VALID" ? "text-primary" : "text-critical"}
          />
          <span className="text-xs text-muted">Audit chain status:</span>
          <span
            className={
              security?.audit_chain_status === "VALID"
                ? "text-xs font-medium text-primary"
                : "text-xs font-medium text-critical"
            }
          >
            {security?.audit_chain_status ?? "checking…"}
          </span>
        </div>
      </div>
    </div>
  );
}
