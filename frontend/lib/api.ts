import type {
  AIResponse,
  AuditChainResult,
  AuditEvent,
  Case,
  CaseGraph,
  CaseStats,
  Contradiction,
  CustodyEvent,
  DocumentVersionRecord,
  LawDocument,
  LoginResponse,
  SecurityAlert,
  SecurityStatus,
  TimelineEvent,
  User,
  VerifyResult,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "law1_token";

export class ApiError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      0,
      "Unable to connect to the LAW1 backend. Check that the API server is running."
    );
  }

  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // no JSON body
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  // --- auth ---
  async login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  async getMe(): Promise<User> {
    return request<User>("/auth/me");
  },

  // --- cases ---
  async getCases(): Promise<Case[]> {
    return request<Case[]>("/cases");
  },
  async getCase(caseId: string): Promise<Case> {
    return request<Case>(`/cases/${caseId}`);
  },
  async getCaseStats(caseId: string): Promise<CaseStats> {
    return request<CaseStats>(`/cases/${caseId}/stats`);
  },
  async createCase(payload: {
    title: string;
    description?: string;
    fir_number?: string;
    case_type?: string;
    police_station?: string;
    priority?: string;
  }): Promise<Case> {
    return request<Case>("/cases", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // --- documents ---
  async getDocuments(caseId: string): Promise<LawDocument[]> {
    return request<LawDocument[]>(`/cases/${caseId}/documents`);
  },
  async getDocument(documentId: string): Promise<LawDocument> {
    return request<LawDocument>(`/documents/${documentId}`);
  },
  async uploadDocument(
    caseId: string,
    file: File,
    docType: string,
    classification: string
  ): Promise<LawDocument> {
    const form = new FormData();
    form.append("file", file);
    const params = new URLSearchParams({
      doc_type: docType,
      classification,
    });
    return request<LawDocument>(
      `/cases/${caseId}/documents?${params.toString()}`,
      { method: "POST", body: form }
    );
  },
  downloadUrl(documentId: string): string {
    return `${BASE_URL}/documents/${documentId}/download`;
  },
  async downloadDocument(documentId: string): Promise<Blob> {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/documents/${documentId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, "Download failed");
    return res.blob();
  },
  async verifyDocument(documentId: string): Promise<VerifyResult> {
    return request<VerifyResult>(`/documents/${documentId}/verify`, {
      method: "POST",
    });
  },
  async getVersions(documentId: string): Promise<DocumentVersionRecord[]> {
    return request<DocumentVersionRecord[]>(
      `/documents/${documentId}/versions`
    );
  },
  async getCustody(documentId: string): Promise<CustodyEvent[]> {
    return request<CustodyEvent[]>(`/documents/${documentId}/custody`);
  },

  // --- AI ---
  async queryAI(caseId: string, question: string): Promise<AIResponse> {
    return request<AIResponse>("/ai/query", {
      method: "POST",
      body: JSON.stringify({ case_id: caseId, question }),
    });
  },
  async detectContradictions(caseId: string): Promise<Contradiction[]> {
    const params = new URLSearchParams({ case_id: caseId });
    return request<Contradiction[]>(`/ai/contradictions?${params.toString()}`, {
      method: "POST",
    });
  },

  // --- case intelligence ---
  async getTimeline(caseId: string): Promise<TimelineEvent[]> {
    return request<TimelineEvent[]>(`/cases/${caseId}/timeline`);
  },
  async getGraph(caseId: string): Promise<CaseGraph> {
    return request<CaseGraph>(`/cases/${caseId}/graph`);
  },

  // --- audit ---
  async getAudit(filters?: {
    action?: string;
    case_id?: string;
    user_id?: string;
  }): Promise<AuditEvent[]> {
    const params = new URLSearchParams();
    if (filters?.action) params.set("action", filters.action);
    if (filters?.case_id) params.set("case_id", filters.case_id);
    if (filters?.user_id) params.set("user_id", filters.user_id);
    const qs = params.toString();
    return request<AuditEvent[]>(`/audit${qs ? `?${qs}` : ""}`);
  },
  async getCaseAudit(caseId: string): Promise<AuditEvent[]> {
    return request<AuditEvent[]>(`/cases/${caseId}/audit`);
  },
  async verifyAuditChain(): Promise<AuditChainResult> {
    return request<AuditChainResult>("/audit/verify-chain", {
      method: "POST",
    });
  },

  // --- security ---
  async getSecurityStatus(): Promise<SecurityStatus> {
    return request<SecurityStatus>("/security/status");
  },
  async getSecurityAlerts(resolved?: boolean): Promise<SecurityAlert[]> {
    const qs = resolved === undefined ? "" : `?resolved=${resolved}`;
    return request<SecurityAlert[]>(`/security/alerts${qs}`);
  },
  async resolveAlert(alertId: string): Promise<{ status: string }> {
    return request<{ status: string }>(
      `/security/alerts/${alertId}/resolve`,
      { method: "POST" }
    );
  },
};
