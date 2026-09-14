"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Case } from "@/types";
import { Button } from "@/components/ui/Button";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function NewCaseDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: Case) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [firNumber, setFirNumber] = useState("");
  const [caseType, setCaseType] = useState("");
  const [policeStation, setPoliceStation] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createCase({
        title,
        description,
        fir_number: firNumber,
        case_type: caseType,
        police_station: policeStation,
        priority,
      });
      onCreated(created);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create case.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-md border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">New case</h3>
          <button onClick={onClose} className="text-muted hover:text-text">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3 p-4">
          <Field label="Title">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="FIR number">
              <input
                value={firNumber}
                onChange={(e) => setFirNumber(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Case type">
              <input
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                className="input"
              />
            </Field>
          </div>
          <Field label="Police station">
            <input
              value={policeStation}
              onChange={(e) => setPoliceStation(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Priority">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="input"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          {error && <p className="text-xs text-critical">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Create case
            </Button>
          </div>
        </form>
      </div>
      <style jsx global>{`
        .input {
          width: 100%;
          background: var(--color-bg);
          border: 1px solid var(--color-border-strong);
          border-radius: 4px;
          padding: 8px 10px;
          font-size: 13px;
          color: var(--color-text);
        }
        .input:focus {
          outline: none;
          border-color: var(--color-primary);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
