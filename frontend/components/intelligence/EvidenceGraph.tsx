"use client";

import { useMemo, useState, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import Link from "next/link";
import type { CaseGraph } from "@/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { Workflow } from "lucide-react";

const TYPE_COLOR: Record<string, string> = {
  Case: "#10b981",
  Document: "#3b82f6",
  Person: "#f59e0b",
  Evidence: "#a78bfa",
};

function layout(graph: CaseGraph): { nodes: Node[]; edges: Edge[] } {
  const caseNode = graph.nodes.find((n) => n.type === "Case");
  const others = graph.nodes.filter((n) => n.type !== "Case");
  const radius = Math.max(180, others.length * 30);

  const nodes: Node[] = graph.nodes.map((n, i) => {
    const isCase = n.type === "Case";
    let x = 0;
    let y = 0;
    if (!isCase) {
      const idx = others.findIndex((o) => o.id === n.id);
      const angle = (idx / Math.max(others.length, 1)) * 2 * Math.PI;
      x = 320 + radius * Math.cos(angle);
      y = 260 + radius * Math.sin(angle);
    } else {
      x = 320;
      y = 260;
    }
    return {
      id: n.id,
      position: { x, y },
      data: { label: n.label, type: n.type },
      style: {
        background: "#111111",
        border: `1.5px solid ${TYPE_COLOR[n.type] || "#34343a"}`,
        color: "#f5f5f5",
        borderRadius: 5,
        fontSize: 11,
        padding: 8,
        width: isCase ? 140 : 160,
      },
    };
  });

  const edges: Edge[] = graph.edges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    label: e.relation === "CONTRADICTS" ? `⚠ ${e.label || "CONTRADICTS"}` : undefined,
    animated: e.relation === "CONTRADICTS",
    style: {
      stroke: e.relation === "CONTRADICTS" ? "#f59e0b" : "#34343a",
      strokeWidth: e.relation === "CONTRADICTS" ? 2 : 1,
    },
    labelStyle: { fill: "#f59e0b", fontSize: 10 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#52525b" },
  }));

  return { nodes, edges };
}

export function EvidenceGraph({ graph }: { graph: CaseGraph }) {
  const { nodes, edges } = useMemo(() => layout(graph), [graph]);
  const [selected, setSelected] = useState<Node | null>(null);

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    setSelected(node);
  }, []);

  if (graph.nodes.length <= 1) {
    return (
      <EmptyState
        icon={Workflow}
        title="No evidence relationships yet"
        description="The graph is built from documents and contradictions stored on this case."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="h-[520px] rounded-md border border-border bg-surface lg:col-span-2">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1c1c1c" gap={20} />
          <Controls showInteractive={false} />
          <MiniMap
            style={{ background: "#111111" }}
            maskColor="rgba(0,0,0,0.6)"
            nodeColor={(n) => TYPE_COLOR[(n.data as { type?: string })?.type || ""] || "#34343a"}
          />
        </ReactFlow>
      </div>

      <div className="rounded-md border border-border bg-surface p-4">
        <p className="mb-3 text-[11px] font-medium tracking-wide text-muted">ENTITY</p>
        {!selected && (
          <p className="text-xs text-muted">Click a node to inspect its source.</p>
        )}
        {selected && (
          <div>
            <p className="text-sm font-medium text-text">
              {(selected.data as { label?: string }).label}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              {(selected.data as { type?: string }).type}
            </p>
            {selected.data && (selected.data as { type?: string }).type === "Document" && (
              <Link
                href={`/documents/${selected.id}`}
                className="mt-3 inline-block text-xs text-primary hover:underline"
              >
                Open document →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
