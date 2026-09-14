"use client";

import { useState } from "react";
import { Send, Sparkles, ShieldQuestion } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { AIResponse } from "@/types";
import { Button } from "@/components/ui/Button";
import { SourceCitation } from "./SourceCitation";

const SUGGESTION =
  "What evidence connects Rahul Sharma to the transaction on 14 March?";

const STAGES = [
  "Analyzing authorized case evidence…",
  "Retrieving relevant documents…",
  "Generating source-backed response…",
];

export function AIConsole({ caseId }: { caseId: string }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    setStage(0);
    const timer = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 350);
    try {
      const res = await api.queryAI(caseId, q);
      setResponse(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Query failed.");
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="rounded-md border border-border bg-surface p-4">
          <div className="mb-2 flex items-center gap-2 text-muted">
            <Sparkles size={13} className="text-primary" />
            <span className="text-[11px]">Investigation Copilot — source-grounded</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about this investigation…"
              className="flex-1 rounded-[4px] border border-border-strong bg-bg px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
            <Button type="submit" variant="primary" loading={loading}>
              <Send size={13} />
            </Button>
          </form>
          <button
            onClick={() => {
              setQuestion(SUGGESTION);
              ask(SUGGESTION);
            }}
            className="mt-2 text-left text-[11px] text-muted hover:text-primary"
          >
            Try: “{SUGGESTION}”
          </button>

          {loading && (
            <div className="mt-4 space-y-1 text-xs text-muted">
              {STAGES.slice(0, stage + 1).map((s) => (
                <p key={s} className="text-primary/80">{s}</p>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-[4px] border border-critical/30 bg-critical/5 px-3 py-2 text-xs text-critical">
              {error}
            </p>
          )}

          {response && (
            <div className="mt-4 rounded-[4px] border border-border-strong bg-bg p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium tracking-wide text-primary">
                  SOURCE-GROUNDED ANSWER
                </span>
                <span className="text-[11px] text-muted">
                  Confidence {response.confidence}%
                </span>
              </div>
              <p className="text-sm leading-relaxed text-text">{response.answer}</p>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
                <ShieldQuestion size={12} />
                Human verification required where applicable.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface p-4">
        <p className="mb-3 text-[11px] font-medium tracking-wide text-muted">SOURCES</p>
        {!response && (
          <p className="text-xs text-muted">
            Ask a question to see the authorized case documents it draws on.
          </p>
        )}
        {response && response.sources.length === 0 && (
          <p className="text-xs text-muted">
            Insufficient evidence found in the authorized case documents.
          </p>
        )}
        <div className="space-y-2">
          {response?.sources.map((s) => (
            <SourceCitation key={s.document_id} source={s} />
          ))}
        </div>
      </div>
    </div>
  );
}
