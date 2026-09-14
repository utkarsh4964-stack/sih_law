"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FileText,
  GitCompareArrows,
  ShieldAlert,
  History,
  Workflow,
  Sparkles,
  ListChecks,
  LayoutGrid,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type {
  Case,
  CaseStats,
  LawDocument,
  TimelineEvent,
  CaseGraph,
  Contradiction,
  AuditEvent,
} from "@/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { StatusBadge, toneForPriority } from "@/components/ui/StatusBadge";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { InvestigationTimeline } from "@/components/intelligence/InvestigationTimeline";
import { EvidenceGraph } from "@/components/intelligence/EvidenceGraph";
import { AIConsole } from "@/components/intelligence/AIConsole";
import { ContradictionCard } from "@/components/intelligence/ContradictionCard";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "timeline", label: "Timeline", icon: History },
  { key: "connections", label: "Connections", icon: Workflow },
  { key: "ai", label: "AI Investigation", icon: Sparkles },
  { key: "audit", label: "Audit", icon: ListChecks },
] as const;

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = usePromise(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getCase(caseId).then(setCaseData).catch((e) => setError(msg(e)));
    api.getCaseStats(caseId).then(setStats).catch(() => {});
  }, [caseId]);

  function setTab(tab: string) {
    router.push(`/cases/${caseId}?tab=${tab}`);
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState message={error} />
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-border px-6 py-5">
        {!caseData ? (
          <Skeleton className="h-16 w-2/3" />
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-primary">{caseData.id}</p>
              <h1 className="mt-1 text-lg font-semibold text-text">{caseData.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge tone={toneForPriority(caseData.priority)}>
                  {caseData.priority} PRIORITY
                </StatusBadge>
                <StatusBadge tone="info">{caseData.status.replace(/_/g, " ")}</StatusBadge>
              </div>
            </div>
            <div className="text-right text-xs text-muted">
              {caseData.fir_number && <p>FIR: {caseData.fir_number}</p>}
              {caseData.police_station && <p className="mt-0.5">{caseData.police_station}</p>}
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats ? (
            <>
              <StatCard label="Documents" value={stats.documents} icon={FileText} />
              <StatCard
                label="Contradictions"
                value={stats.contradictions}
                icon={GitCompareArrows}
                tone={stats.contradictions > 0 ? "warning" : "default"}
              />
              <StatCard label="Timeline events" value={stats.timeline_events} icon={History} />
              <StatCard
                label="Open alerts"
                value={stats.open_alerts}
                icon={ShieldAlert}
                tone={stats.open_alerts > 0 ? "critical" : "default"}
              />
            </>
          ) : (
            <>
              <Skeleton className="h-[74px]" />
              <Skeleton className="h-[74px]" />
              <Skeleton className="h-[74px]" />
              <Skeleton className="h-[74px]" />
            </>
          )}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border px-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
              activeTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-text"
            }`}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === "overview" && <OverviewTab caseId={caseId} caseData={caseData} />}
        {activeTab === "documents" && <DocumentsTab caseId={caseId} />}
        {activeTab === "timeline" && <TimelineTab caseId={caseId} />}
        {activeTab === "connections" && <ConnectionsTab caseId={caseId} />}
        {activeTab === "ai" && <AITab caseId={caseId} />}
        {activeTab === "audit" && <AuditTab caseId={caseId} />}
      </div>
    </div>
  );
}

function msg(e: unknown): string {
  return e instanceof ApiError ? e.message : "Something went wrong.";
}

function OverviewTab({ caseId, caseData }: { caseId: string; caseData: Case | null }) {
  const [documents, setDocuments] = useState<LawDocument[] | null>(null);

  useEffect(() => {
    api.getDocuments(caseId).then(setDocuments).catch(() => setDocuments([]));
  }, [caseId]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-md border border-border bg-surface p-4 lg:col-span-2">
        <h3 className="mb-2 text-sm font-semibold">Investigation summary</h3>
        <p className="text-sm leading-relaxed text-muted">
          {caseData?.description || "No description provided for this case."}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-muted">Case type</dt>
            <dd className="mt-0.5 text-text">{caseData?.case_type || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Police station</dt>
            <dd className="mt-0.5 text-text">{caseData?.police_station || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Created</dt>
            <dd className="mt-0.5 text-text">
              {caseData ? formatDateTime(caseData.created_at) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Last updated</dt>
            <dd className="mt-0.5 text-text">
              {caseData ? formatDateTime(caseData.updated_at) : "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-md border border-border bg-surface p-4">
        <h3 className="mb-2 text-sm font-semibold">Recent documents</h3>
        {!documents ? (
          <Skeleton className="h-24 w-full" />
        ) : documents.length === 0 ? (
          <p className="text-xs text-muted">No documents uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {documents.slice(0, 5).map((d) => (
              <li key={d.id} className="text-xs">
                <a href={`/documents/${d.id}`} className="text-text hover:text-primary">
                  {d.name}
                </a>
                <p className="text-[10px] text-muted">{formatDateTime(d.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DocumentsTab({ caseId }: { caseId: string }) {
  const [documents, setDocuments] = useState<LawDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  function load() {
    api.getDocuments(caseId).then(setDocuments).catch((e) => setError(msg(e)));
  }

  useEffect(load, [caseId]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Document vault</h3>
        <Button variant="primary" onClick={() => setShowUpload((s) => !s)}>
          {showUpload ? "Close" : "Upload document"}
        </Button>
      </div>

      {showUpload && (
        <div className="mb-5">
          <DocumentUpload
            caseId={caseId}
            onUploaded={() => {
              load();
            }}
          />
        </div>
      )}

      {error && <ErrorState message={error} />}
      {!error && !documents && (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}
      {!error && documents && <DocumentTable documents={documents} />}
    </div>
  );
}

function TimelineTab({ caseId }: { caseId: string }) {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getTimeline(caseId).then(setEvents).catch((e) => setError(msg(e)));
  }, [caseId]);

  if (error) return <ErrorState message={error} />;
  if (!events) return <Skeleton className="h-64 w-full" />;
  return <InvestigationTimeline events={events} />;
}

function ConnectionsTab({ caseId }: { caseId: string }) {
  const [graph, setGraph] = useState<CaseGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getGraph(caseId).then(setGraph).catch((e) => setError(msg(e)));
  }, [caseId]);

  if (error) return <ErrorState message={error} />;
  if (!graph) return <Skeleton className="h-[520px] w-full" />;
  return <EvidenceGraph graph={graph} />;
}

function AITab({ caseId }: { caseId: string }) {
  const [contradictions, setContradictions] = useState<Contradiction[] | null>(null);
  const [loadingContra, setLoadingContra] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    setLoadingContra(true);
    setError(null);
    try {
      setContradictions(await api.detectContradictions(caseId));
    } catch (e) {
      setError(msg(e));
    } finally {
      setLoadingContra(false);
    }
  }

  return (
    <div className="space-y-6">
      <AIConsole caseId={caseId} />

      <div className="rounded-md border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Contradiction detection</h3>
          <Button variant="secondary" onClick={analyze} loading={loadingContra}>
            Analyze contradictions
          </Button>
        </div>
        {error && <ErrorState message={error} />}
        {contradictions && contradictions.length === 0 && (
          <p className="text-xs text-muted">No potential contradictions detected.</p>
        )}
        <div className="space-y-3">
          {contradictions?.map((c) => (
            <ContradictionCard key={c.id} item={c} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AuditTab({ caseId }: { caseId: string }) {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getCaseAudit(caseId).then(setEvents).catch((e) => setError(msg(e)));
  }, [caseId]);

  if (error) return <ErrorState message={error} />;
  if (!events) return <Skeleton className="h-64 w-full" />;
  if (events.length === 0) return <p className="text-xs text-muted">No audit events for this case yet.</p>;

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-surface">
          <tr className="text-muted">
            <th className="px-4 py-2.5 font-medium">Time</th>
            <th className="px-4 py-2.5 font-medium">Actor</th>
            <th className="px-4 py-2.5 font-medium">Action</th>
            <th className="px-4 py-2.5 font-medium">Resource</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="bg-surface">
          {events.map((e) => (
            <tr key={e.id} className="border-t border-border">
              <td className="px-4 py-2.5 text-muted">{formatDateTime(e.timestamp)}</td>
              <td className="px-4 py-2.5 font-mono text-[10px] text-text">{e.actor_id || "system"}</td>
              <td className="px-4 py-2.5 text-text">{e.action.replace(/_/g, " ")}</td>
              <td className="px-4 py-2.5 font-mono text-[10px] text-muted">
                {e.resource_type} {e.resource_id}
              </td>
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
  );
}
