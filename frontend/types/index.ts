// Types mirror the LAW1 backend's actual Pydantic schemas and raw dict
// responses (see backend/app/schemas.py and backend/app/api/*.py).
// Do not add fields the backend does not return.

export type Role =
  | "ADMIN"
  | "INVESTIGATING_OFFICER"
  | "FORENSIC_OFFICER"
  | "PROSECUTOR"
  | "LEGAL_OFFICER"
  | "VIEWER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  status: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: { id: string; name: string; email: string; role: Role };
}

export type CaseStatus =
  | "OPEN"
  | "UNDER_INVESTIGATION"
  | "UNDER_REVIEW"
  | "CHARGESHEETED"
  | "CLOSED"
  | "ARCHIVED";

export type CasePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Case {
  id: string;
  title: string;
  description: string;
  fir_number: string;
  case_type: string;
  police_station: string;
  priority: CasePriority;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
}

export interface CaseStats {
  documents: number;
  contradictions: number;
  timeline_events: number;
  open_alerts: number;
}

export type IntegrityStatus = "VERIFIED" | "VIOLATION" | "UNVERIFIED";
export type Classification =
  | "PUBLIC"
  | "INTERNAL"
  | "CONFIDENTIAL"
  | "HIGHLY_CONFIDENTIAL";
export type ProcessingStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "INDEXED"
  | "READY"
  | "FAILED";

export interface LawDocument {
  id: string;
  case_id: string;
  name: string;
  type: string;
  description: string;
  mime_type: string;
  size: number;
  uploaded_by: string | null;
  created_at: string;
  current_version: number;
  sha256_hash: string;
  integrity_status: IntegrityStatus;
  classification: Classification;
  digital_signature_status: string;
  processing_status: ProcessingStatus;
}

export interface DocumentVersionRecord {
  version_number: number;
  sha256_hash: string;
  uploaded_by: string;
  created_at: string;
  change_reason: string;
}

export interface CustodyEvent {
  action: string;
  actor_id: string;
  timestamp: string;
  description: string;
  event_hash: string;
}

export interface VerifyResult {
  status: "VERIFIED" | "VIOLATION";
  original_hash: string;
  current_hash: string;
  note?: string;
}

export interface AuditEvent {
  id: number;
  timestamp: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  case_id: string | null;
  status: string;
  description: string;
}

export interface AuditChainResult {
  status: "VALID" | "CHAIN INTEGRITY FAILURE";
  detail: string;
}

export interface SecurityAlert {
  id: string;
  severity: "CRITICAL" | "SUSPICIOUS" | "INFO";
  title: string;
  description: string;
  document_id: string | null;
  case_id: string | null;
  resolved: boolean;
  created_at: string;
}

export interface SecurityStatus {
  open_alerts: number;
  critical_alerts: number;
  audit_chain_status: "VALID" | "CHAIN INTEGRITY FAILURE";
}

export interface AISource {
  document_id: string;
  document_name: string;
  relevance: number;
}

export interface AIResponse {
  answer: string;
  confidence: number;
  sources: AISource[];
}

export interface Contradiction {
  id: string;
  category: string;
  statement_a: string;
  statement_b: string;
  source_a: string;
  source_b: string;
  confidence: number;
  status: string;
}

export interface TimelineEvent {
  date: string;
  description: string;
  source_document_id: string;
  confidence: number;
  ai_extracted: boolean;
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  label?: string;
}

export interface CaseGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ApiErrorShape {
  status: number;
  detail: string;
}
