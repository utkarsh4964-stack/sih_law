"use client";

import { useEffect, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Case, AISource } from "@/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { SourceCitation } from "@/components/intelligence/SourceCitation";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SearchPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [caseId, setCaseId] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AISource[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getCases().then((cs) => {
      setCases(cs);
      if (cs.length > 0) setCaseId(cs[0].id);
    });
  }, []);

  async function search() {
    if (!caseId || !query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.queryAI(caseId, query);
      setResults(res.sources);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Case Evidence Search"
        description="Search across authorized case documents by keyword overlap"
      />

      <div className="p-6">
        <p className="mb-4 rounded-[4px] border border-border-strong bg-surface px-3 py-2 text-xs text-muted">
          This searches document content within a single authorized case using
          keyword-overlap retrieval — the same retrieval the AI Investigation
          Copilot uses. It is not vector-based semantic search.
        </p>

        <div className="mb-5 flex flex-wrap gap-2">
          <select
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            className="rounded-[4px] border border-border-strong bg-surface px-2.5 py-2 text-xs text-text"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.title}
              </option>
            ))}
          </select>
          <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-[4px] border border-border-strong bg-surface px-3 py-2">
            <SearchIcon size={13} className="text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="e.g. financial transactions involving Rahul in March"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted/60"
            />
          </div>
          <Button variant="primary" onClick={search} loading={loading}>
            Search
          </Button>
        </div>

        {error && <ErrorState message={error} />}

        {!error && results && results.length === 0 && (
          <EmptyState icon={SearchIcon} title="No matching documents" description="Try different keywords." />
        )}

        {!error && results && results.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <SourceCitation key={r.document_id} source={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
