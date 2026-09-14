"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Download,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type {
  LawDocument,
  DocumentVersionRecord,
  CustodyEvent,
  VerifyResult,
} from "@/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { StatusBadge, toneForIntegrity } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { VersionHistory } from "@/components/documents/VersionHistory";
import { CustodyTimeline } from "@/components/documents/CustodyTimeline";
import { formatBytes, formatDateTime, truncateHash } from "@/lib/utils";

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = usePromise(params);
  const [doc, setDoc] = useState<LawDocument | null>(null);
  const [versions, setVersions] = useState<DocumentVersionRecord[] | null>(null);
  const [custody, setCustody] = useState<CustodyEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [downloading, setDownloading] = useState(false);

  function load() {
    api.getDocument(documentId).then(setDoc).catch((e) => setError(msg(e)));
    api.getVersions(documentId).then(setVersions).catch(() => {});
    api.getCustody(documentId).then(setCustody).catch(() => {});
  }

  useEffect(load, [documentId]);

  async function verify() {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await api.verifyDocument(documentId);
      setVerifyResult(result);
      load();
    } catch (e) {
      setError(msg(e));
    } finally {
      setVerifying(false);
    }
  }

  async function download() {
    setDownloading(true);
    try {
      const blob = await api.downloadDocument(documentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc?.name || "document";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(msg(e));
    } finally {
      setDownloading(false);
    }
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
      <PageHeader
        title={doc?.name || "Loading document…"}
        description={doc ? `Case ${doc.case_id}` : undefined}
        action={
          doc && (
            <Link href={`/cases/${doc.case_id}?tab=documents`} className="text-xs text-primary hover:underline">
              ← Back to case
            </Link>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-md border border-border bg-surface p-4">
            {!doc ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={toneForIntegrity(doc.integrity_status)}>
                    {doc.integrity_status === "VERIFIED" ? (
                      <ShieldCheck size={11} />
                    ) : (
                      <ShieldAlert size={11} />
                    )}
                    {doc.integrity_status}
                  </StatusBadge>
                  <StatusBadge tone="neutral">{doc.classification.replace(/_/g, " ")}</StatusBadge>
                  <StatusBadge tone="neutral">{doc.type.replace(/_/g, " ")}</StatusBadge>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted">SHA-256</dt>
                    <dd className="mt-0.5 font-mono text-text">{truncateHash(doc.sha256_hash, 12)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Version</dt>
                    <dd className="mt-0.5 text-text">v{doc.current_version}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Uploaded by</dt>
                    <dd className="mt-0.5 font-mono text-[11px] text-text">{doc.uploaded_by || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Uploaded</dt>
                    <dd className="mt-0.5 text-text">{formatDateTime(doc.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Size</dt>
                    <dd className="mt-0.5 text-text">{formatBytes(doc.size)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Digital signature</dt>
                    <dd className="mt-0.5 text-text">{doc.digital_signature_status}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex gap-2">
                  <Button variant="primary" onClick={verify} loading={verifying}>
                    <ShieldCheck size={13} /> Verify integrity
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={download}
                    loading={downloading}
                    disabled={doc.integrity_status === "VIOLATION"}
                    title={doc.integrity_status === "VIOLATION" ? "Locked pending integrity review" : "Download document"}
                  >
                    <Download size={13} /> {doc.integrity_status === "VIOLATION" ? "Download locked" : "Download"}
                  </Button>
                </div>

                {verifyResult && (
                  <div
                    className={`mt-4 rounded-md border p-4 ${
                      verifyResult.status === "VERIFIED"
                        ? "border-primary/30 bg-primary/5"
                        : "border-critical/30 bg-critical/5"
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 text-sm font-semibold ${
                        verifyResult.status === "VERIFIED" ? "text-primary" : "text-critical"
                      }`}
                    >
                      {verifyResult.status === "VERIFIED" ? (
                        <>
                          <ShieldCheck size={16} /> Integrity verified
                        </>
                      ) : (
                        <>
                          <ShieldAlert size={16} /> Integrity violation detected
                        </>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-text">
                      {verifyResult.status === "VERIFIED"
                        ? "The current document hash matches the recorded integrity hash."
                        : "The document content does not match the recorded integrity hash. Document has been locked and a critical security alert was created."}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <p className="text-muted">Original hash</p>
                        <p className="font-mono text-text">{truncateHash(verifyResult.original_hash, 12)}</p>
                      </div>
                      <div>
                        <p className="text-muted">Current hash</p>
                        <p className="font-mono text-text">{truncateHash(verifyResult.current_hash, 12)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="rounded-md border border-border bg-surface p-4">
            <h3 className="mb-3 text-sm font-semibold">Version history</h3>
            {!versions ? <Skeleton className="h-16 w-full" /> : <VersionHistory versions={versions} />}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Chain of custody</h3>
          {!custody ? <Skeleton className="h-40 w-full" /> : <CustodyTimeline events={custody} />}
        </div>
      </div>
    </div>
  );
}

function msg(e: unknown): string {
  return e instanceof ApiError ? e.message : "Something went wrong.";
}
