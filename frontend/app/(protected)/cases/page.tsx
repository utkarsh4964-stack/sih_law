"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Case, CasePriority, CaseStatus } from "@/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge, toneForPriority } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import { Folders } from "lucide-react";
import { NewCaseDialog } from "@/components/cases/NewCaseDialog";

const STATUSES: (CaseStatus | "ALL")[] = [
  "ALL",
  "OPEN",
  "UNDER_INVESTIGATION",
  "UNDER_REVIEW",
  "CHARGESHEETED",
  "CLOSED",
  "ARCHIVED",
];
const PRIORITIES: (CasePriority | "ALL")[] = ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CaseStatus | "ALL">("ALL");
  const [priority, setPriority] = useState<CasePriority | "ALL">("ALL");
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    api
      .getCases()
      .then(setCases)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load cases."));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!cases) return [];
    return cases.filter((c) => {
      if (status !== "ALL" && c.status !== status) return false;
      if (priority !== "ALL" && c.priority !== priority) return false;
      if (
        query &&
        !`${c.id} ${c.title} ${c.fir_number}`.toLowerCase().includes(query.toLowerCase())
      )
        return false;
      return true;
    });
  }, [cases, status, priority, query]);

  return (
    <div>
      <PageHeader
        title="Cases"
        description="Investigations you are authorized to access"
        action={
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New case
          </Button>
        }
      />

      <div className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[4px] border border-border-strong bg-surface px-3 py-2">
            <Search size={13} className="text-muted" />
            <input
              placeholder="Search by case ID, title, FIR number"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted/60"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CaseStatus | "ALL")}
            className="rounded-[4px] border border-border-strong bg-surface px-2.5 py-2 text-xs text-text"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All statuses" : s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as CasePriority | "ALL")}
            className="rounded-[4px] border border-border-strong bg-surface px-2.5 py-2 text-xs text-text"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p === "ALL" ? "All priorities" : p}
              </option>
            ))}
          </select>
        </div>

        {error && <ErrorState message={error} />}

        {!error && !cases && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {!error && cases && filtered.length === 0 && (
          <EmptyState
            icon={Folders}
            title="No cases found"
            description="Create a case to begin building its evidence record, or adjust your filters."
          />
        )}

        {!error && filtered.length > 0 && (
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface">
                <tr className="text-muted">
                  <th className="px-4 py-2.5 font-medium">Case</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Priority</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="bg-surface">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/cases/${c.id}`)}
                    className="cursor-pointer border-t border-border hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-mono text-[11px] text-primary">{c.id}</p>
                      <p className="mt-0.5 text-sm text-text">{c.title}</p>
                      {c.fir_number && (
                        <p className="mt-0.5 text-[11px] text-muted">FIR {c.fir_number}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{c.case_type || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={toneForPriority(c.priority)}>
                        {c.priority}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-muted">{c.status.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(c.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <NewCaseDialog
          onClose={() => setShowCreate(false)}
          onCreated={(c) => {
            setShowCreate(false);
            router.push(`/cases/${c.id}`);
          }}
        />
      )}
    </div>
  );
}
