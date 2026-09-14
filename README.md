# LAW1 — Secure Digital Evidence & Legal Document Management System

**SIH 2026 — Problem Statement SIH26190**
Secure Digital Document Management System for Legal and Investigation Documents

> Secure Evidence. Intelligent Investigation. Complete Accountability.

## Problem

Investigation agencies, police departments, and courts handle legal and
investigation documents (FIRs, witness statements, forensic reports, charge
sheets) with weak guarantees around tamper-evidence, access control, and
accountability — and no tooling to surface relationships or contradictions
across a growing body of case evidence.

## Solution

LAW1 is a secure, AI-assisted digital evidence and legal document management
platform. It hashes and version-controls every document, enforces case-level
access control server-side, records a tamper-evident audit trail and chain of
custody for every action, and gives investigators a source-grounded AI
copilot that never asserts a conclusion the underlying documents don't
support.

## Architecture

```
LAW1/
├── backend/         FastAPI + SQLAlchemy (SQLite by default, Postgres via env)
│   ├── app/
│   │   ├── api/         auth, cases, documents, audit, security, ai, case_intel
│   │   ├── security/    JWT, Argon2 hashing, RBAC permission map
│   │   ├── services/    audit hash-chain, chain-of-custody, text extraction
│   │   ├── ai/          keyword retrieval + Groq-or-fallback generation
│   │   └── utils/       SHA-256 hashing, local storage abstraction
│   └── seed.py
├── frontend/        Next.js (App Router) + TypeScript + Tailwind CSS
│   ├── app/(protected)/   dashboard, cases, cases/[caseId], documents/[documentId], audit, security, search
│   ├── app/login/
│   ├── components/        layout, dashboard, cases, documents, intelligence, security, ui
│   ├── lib/api.ts          single typed API client — the only place that calls the backend
│   └── lib/auth-context.tsx
├── storage/         local file storage (swap to S3 via env vars)
└── .env.example
```

## Security architecture

- **Authentication**: JWT (HS256), Argon2 password hashing, 6 roles.
- **Authorization**: server-side RBAC permission map *and* case-level access
  control (`CaseMember`) — checked on every request, never inferred from the
  frontend. A 403 from the backend always surfaces as "Access denied" in the
  UI, never silently swallowed.
- **Integrity**: SHA-256 hash recorded at upload; `POST /documents/{id}/verify`
  re-hashes the file on disk and compares. A mismatch marks the document
  `VIOLATION`, creates a `CRITICAL` security alert, and logs both an audit
  event and a chain-of-custody event.
- **Tamper-evident audit chain**: every audit log entry embeds the hash of
  the previous entry. `POST /audit/verify-chain` recomputes the chain and
  returns `VALID` or `CHAIN INTEGRITY FAILURE` — never hardcoded.
- **Chain of custody**: a similarly hash-chained, per-document event log
  (UPLOADED, VERIFIED, VIEWED, DOWNLOADED, INTEGRITY_VIOLATION, …).

Technically accurate language is used throughout: SHA-256 is described as
*detecting* content changes, not preventing hacking; the audit/custody
mechanism is described as *tamper-evident*, not blockchain; there is no
"legally admissible" or "military-grade" claim anywhere in the system.

## AI architecture

`POST /ai/query` retrieves only documents inside the authorized case
(access-checked *before* retrieval), scores them by keyword overlap against
the question, and generates an answer that cites every source document. With
no `GROQ_API_KEY` configured, generation falls back to a deterministic,
source-grounded template — the app is fully functional without any AI API
key. If `GROQ_API_KEY`/`GROQ_MODEL` are set, generation upgrades to Groq
automatically. `POST /ai/contradictions` returns stored contradiction
records, always with `REQUIRES_HUMAN_VERIFICATION` status — the system never
declares a statement false.

The frontend never talks to Groq or fabricates an answer; it only renders
what these two endpoints return, and clearly labels retrieval as
keyword-overlap rather than semantic/vector search on the Search page.

## Tech stack

**Backend**: FastAPI, SQLAlchemy, Pydantic, python-jose (JWT), passlib/argon2,
pypdf, python-docx, SQLite (default) / PostgreSQL (via `DATABASE_URL`).

**Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4,
React Flow (evidence graph), lucide-react (icons), self-hosted IBM Plex
Sans/Mono fonts (no external font CDN dependency).

## Database design

See `backend/app/models.py`. Core tables: `users`, `cases`, `case_members`,
`documents`, `document_versions`, `chain_of_custody`, `audit_logs`,
`security_alerts`, `contradictions`, `timeline_events`.

## Local setup

### Backend

```bash
cd backend
pip install -r requirements.txt --break-system-packages   # or use a venv
cp ../.env.example .env
python seed.py                 # creates demo users + demo case
uvicorn app.main:app --reload  # http://localhost:8000
```

API docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                        # http://localhost:3000
```

Run both at once for the full app: backend on `:8000`, frontend on `:3000`.

## Environment variables

**Backend** (`.env.example`): `DATABASE_URL` (defaults to SQLite),
`JWT_SECRET`, `JWT_EXPIRE_MINUTES`, `GROQ_API_KEY` / `GROQ_MODEL` (optional),
`STORAGE_TYPE`, `S3_*` (for production object storage).

**Frontend** (`frontend/.env.local.example`): `NEXT_PUBLIC_API_URL` — the
only backend URL configuration point; no URL is hardcoded anywhere else in
the frontend.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@law1.demo | Admin@123 |
| Investigating Officer | io@law1.demo | Io@12345 |
| Forensic Officer | forensic@law1.demo | Forensic@123 |
| Prosecutor | prosecutor@law1.demo | Prosecutor@123 |
| Legal Officer | legal@law1.demo | Legal@123 |
| Viewer | viewer@law1.demo | Viewer@123 |

(Development-only credentials — not surfaced anywhere in the UI.)

## API documentation

Interactive OpenAPI docs at `http://localhost:8000/docs` once the backend is
running. `frontend/lib/api.ts` is the single typed client the frontend
uses — every field in `frontend/types/index.ts` mirrors an actual backend
response, not an assumed one.

## Demo workflow (SIH judges)

1. Sign in as `io@law1.demo` / `Io@12345`.
2. Open case `CR-2026-0192` — see live stats (7 documents, 1 contradiction,
   7 timeline events).
3. **Documents** tab → upload a file → watch the real hashing/classification
   pipeline → see the returned SHA-256, classification, and version.
4. Open the uploaded document → **Verify integrity** → `VERIFIED`.
5. **AI Investigation** tab → ask "What evidence connects Rahul Sharma to
   the transaction on 14 March?" → cited, source-grounded answer.
6. Click **Analyze contradictions** → the seeded 8:30 PM vs 10:00 PM witness
   contradiction, marked `REQUIRES HUMAN VERIFICATION`.
7. **Connections** tab → evidence graph (React Flow) built only from real
   documents/contradictions.
8. **Timeline** tab → the seven seeded investigation events.
9. **Audit** tab (case-scoped) or `/audit` (global) → verify the audit chain
   → `VALID`.
10. `/security` → open alerts, resolve one with confirmation.
11. **Tamper demo**: on disk, append a byte to a stored document's file, then
    click Verify integrity again → `VIOLATION`, document locked, `CRITICAL`
    alert created, both an audit event and a custody event logged — visible
    immediately in the Security Center and Audit Trail.
12. Log in as `viewer@law1.demo` and confirm upload is blocked with a clear
    "Access denied" message (backend returns 403; frontend surfaces it, does
    not fail silently).

## Tests performed this session

Backend (previous session): live curl-based tests of the full document
lifecycle, RBAC denial, integrity violation, and audit chain verification —
all passed.

Frontend (this session), against the actual running backend, not mocks:

- npm run build — compiles cleanly, 0 TypeScript errors
- All top-level routes return 200 from the Next.js dev server:
  /, /login, /dashboard, /cases, /cases/[caseId],
  /documents/[documentId], /audit, /security, /search
- Node integration script exercising every api.* call the frontend
  makes — login, cases, stats, documents, document detail, versions,
  custody, integrity verification, AI query (with real cited sources),
  contradiction detection, evidence graph, timeline, audit log, audit-chain
  verification, security status/alerts, and a VIEWER-role upload attempt
  correctly rejected with 403 — all against the live backend, all passed
- No server-side runtime errors in the Next.js dev log across any route

No headless-browser (Playwright/Cypress) UI test run was performed in this
sandboxed session — see Known limitations.

## Known limitations

- No headless-browser UI testing was run (no browser automation tool
  available in this environment); verification was via build success + live
  API integration tests + manual code review of every component against the
  actual endpoint shapes.
- AI retrieval is keyword-overlap, not vector/semantic search — labeled
  honestly in the UI ("Case Evidence Search", not "semantic AI search").
- No digital signatures, PII redaction, OCR for images, anomaly detection,
  or Hindi voice/text support — out of scope for this build and not
  represented as working anywhere in the UI (sidebar shows them under a
  disabled "Future scope" section only).
- Auth token is stored in localStorage — acceptable for a hackathon
  prototype, not a production-grade session strategy.
- SQLite by default; validate concurrent-write behavior before any real
  deployment on Postgres.
- The tamper-evident audit/custody chains are application-level hash chains,
  not a public blockchain; there is no digital-signature module in this
  build, so "Digitally Signed" status is not currently reachable from any
  document.

## SIH 2026 security-hardening release

This build hardens the prototype around the security claims that matter most for SIH26190.

### Security controls enforced

- Public self-registration is disabled; account creation requires `user:manage` (ADMIN).
- Case-level authorization is enforced on case audit records, security alerts, document access, AI retrieval, timeline, and evidence graph.
- Global audit-chain verification is ADMIN-only.
- Security-alert resolution is case-scoped; global alerts are ADMIN-only.
- Documents with a detected SHA-256 integrity violation are locked from download with HTTP 423 until reviewed.
- Uploads validate extension, declared MIME type, and common file signatures (PDF/DOCX/PNG/JPEG); binary content is rejected for TXT.
- AI retrieval excludes documents whose integrity status is `VIOLATION`.
- AI system instructions explicitly treat uploaded evidence as untrusted data and reject prompt-injection instructions contained in evidence.
- Audit and chain-of-custody hashes bind timestamp and descriptive metadata, not only actor/action identifiers.
- SQLite foreign-key enforcement is enabled for local deployments.
- Production deployments require a non-empty JWT secret of at least 32 characters.
- CORS is configurable through `CORS_ORIGINS` instead of `*`.

### Honest prototype boundaries

LAW1 is a hackathon prototype, not a certified evidence-management product. The current build still uses SQLite/local storage by default, keyword-overlap retrieval, and does not implement government PKI digital signatures, image OCR, or blockchain anchoring. These are explicitly treated as future/production-hardening work rather than claimed capabilities.

### Recommended judge demo

1. Sign in as the seeded Investigating Officer.
2. Open `CR-2026-0192` and show authorized case access.
3. Open a verified document and show its SHA-256 and custody history.
4. Ask the AI a case question and show the source document references.
5. Run contradiction analysis and show the 8:30 PM vs 10:00 PM conflict as `REQUIRES_HUMAN_VERIFICATION`.
6. Open Connections and Timeline to show evidence relationships derived from stored records.
7. Open Audit and verify the chain as ADMIN.
8. For the security climax, alter a demo file on disk, run integrity verification, show `VIOLATION`, the critical alert, and the disabled download.
9. Resolve the alert and show that the resolution itself creates an audit event.

### Security regression tests

Run from `backend/`:

```bash
PYTHONPATH=. pytest -q
```

The included regression tests cover the strengthened audit and custody hash payloads. End-to-end API testing should be run against a clean seeded database before the final SIH presentation.
