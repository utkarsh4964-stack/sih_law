"use client";

import { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, XCircle } from "lucide-react";
import { getToken } from "@/lib/api";
import type { LawDocument } from "@/types";
import { Button } from "@/components/ui/Button";
import { StatusBadge, toneForIntegrity } from "@/components/ui/StatusBadge";
import { truncateHash } from "@/lib/utils";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STAGES = [
  "Validating file",
  "Generating SHA-256",
  "Extracting content",
  "Classifying document",
  "Indexing",
  "Securing document",
];

const DOC_TYPES = [
  "FIR",
  "POLICE_REPORT",
  "WITNESS_STATEMENT",
  "CHARGE_SHEET",
  "COURT_FILING",
  "EVIDENCE_RECORD",
  "FORENSIC_REPORT",
  "LEGAL_NOTICE",
  "JUDGMENT",
  "OTHER",
];
const CLASSIFICATIONS = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "HIGHLY_CONFIDENTIAL"];

type Phase = "idle" | "uploading" | "processing" | "done" | "error";

export function DocumentUpload({
  caseId,
  onUploaded,
}: {
  caseId: string;
  onUploaded: (doc: LawDocument) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("OTHER");
  const [classification, setClassification] = useState("INTERNAL");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState<LawDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function pickFile(f: File) {
    setFile(f);
    setPhase("idle");
    setResult(null);
    setError(null);
  }

  function upload() {
    if (!file) return;
    setPhase("uploading");
    setProgress(0);
    setStageIndex(0);
    setError(null);

    const form = new FormData();
    form.append("file", file);
    const params = new URLSearchParams({ doc_type: docType, classification });
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `${BASE_URL}/cases/${caseId}/documents?${params.toString()}`
    );
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.upload.onload = () => {
      setPhase("processing");
      // Backend processes synchronously; step through labeled stages for
      // legibility while awaiting the real response.
      let i = 0;
      const interval = setInterval(() => {
        i += 1;
        setStageIndex(i);
        if (i >= STAGES.length - 1) clearInterval(interval);
      }, 220);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const doc: LawDocument = JSON.parse(xhr.responseText);
          setResult(doc);
          setPhase("done");
          onUploaded(doc);
        } catch {
          setError("Unexpected response from server.");
          setPhase("error");
        }
      } else {
        let detail = `Upload failed (${xhr.status})`;
        try {
          detail = JSON.parse(xhr.responseText).detail || detail;
        } catch {
          // ignore
        }
        setError(detail);
        setPhase("error");
      }
    };
    xhr.onerror = () => {
      setError("Unable to connect to the LAW1 backend.");
      setPhase("error");
    };
    xhr.send(form);
  }

  function reset() {
    setFile(null);
    setPhase("idle");
    setResult(null);
    setError(null);
    setProgress(0);
  }

  if (phase === "done" && result) {
    return (
      <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-primary">
          <CheckCircle2 size={16} />
          <p className="text-sm font-semibold">Document secured</p>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-muted">SHA-256</dt>
            <dd className="mt-0.5 font-mono text-text">{truncateHash(result.sha256_hash, 10)}</dd>
          </div>
          <div>
            <dt className="text-muted">Classification</dt>
            <dd className="mt-0.5 text-text">{result.type.replace(/_/g, " ")}</dd>
          </div>
          <div>
            <dt className="text-muted">Version</dt>
            <dd className="mt-0.5 text-text">{result.current_version}</dd>
          </div>
          <div>
            <dt className="text-muted">Integrity</dt>
            <dd className="mt-0.5">
              <StatusBadge tone={toneForIntegrity(result.integrity_status)}>
                {result.integrity_status}
              </StatusBadge>
            </dd>
          </div>
        </dl>
        <Button variant="ghost" className="mt-3" onClick={reset}>
          Upload another
        </Button>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="rounded-md border border-critical/30 bg-critical/5 p-4">
        <div className="flex items-center gap-2 text-critical">
          <XCircle size={16} />
          <p className="text-sm font-semibold">Upload failed</p>
        </div>
        <p className="mt-2 text-xs text-text">{error}</p>
        <Button variant="ghost" className="mt-3" onClick={reset}>
          Try again
        </Button>
      </div>
    );
  }

  if (phase === "uploading" || phase === "processing") {
    return (
      <div className="rounded-md border border-border bg-surface p-4">
        <p className="text-sm text-text">{file?.name}</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${phase === "uploading" ? progress : 100}%` }}
          />
        </div>
        <ul className="mt-3 space-y-1 text-xs">
          {STAGES.map((s, i) => (
            <li
              key={s}
              className={
                phase === "processing" && i <= stageIndex
                  ? "text-primary"
                  : "text-muted"
              }
            >
              {phase === "processing" && i <= stageIndex ? "✓ " : "· "}
              {s}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) pickFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border-strong"
        }`}
      >
        <UploadCloud size={22} className="text-muted" />
        <p className="text-sm text-text">
          {file ? file.name : "Drop investigation document here"}
        </p>
        <p className="text-xs text-muted">PDF, DOCX, TXT, PNG, JPG — up to 25 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickFile(f);
          }}
        />
      </div>

      {file && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="rounded-[4px] border border-border-strong bg-bg px-2.5 py-2 text-xs text-text"
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            className="rounded-[4px] border border-border-strong bg-bg px-2.5 py-2 text-xs text-text"
          >
            {CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <Button variant="primary" onClick={upload}>
            Upload document
          </Button>
        </div>
      )}
    </div>
  );
}
