import Link from "next/link";
import { FileText } from "lucide-react";
import type { AISource } from "@/types";

export function SourceCitation({ source }: { source: AISource }) {
  return (
    <Link
      href={`/documents/${source.document_id}`}
      className="block rounded-[4px] border border-border-strong bg-bg px-3 py-2 transition-colors hover:border-primary/50"
    >
      <div className="flex items-center gap-1.5 text-primary">
        <FileText size={12} />
        <span className="font-mono text-[10px]">{source.document_id}</span>
      </div>
      <p className="mt-1 text-xs text-text">{source.document_name}</p>
      <p className="mt-0.5 text-[10px] text-muted">{source.relevance}% relevance</p>
    </Link>
  );
}
