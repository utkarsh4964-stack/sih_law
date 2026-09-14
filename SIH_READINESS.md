# LAW1 — SIH 2026 Readiness & Security Review

## Target

**SIH26190 — Secure Digital Document Management for Legal and Investigation Documents**

## Current target score

**9.0–9.3/10 for a hackathon prototype**, assuming the final demo is run against a clean database and the P0/P1 controls below are demonstrated honestly.

This is a judging-readiness target, not a claim of production certification.

## Why LAW1 can score highly

### 1. Strong problem-to-feature mapping

- Case-centric secure document vault
- Role-based and case-level authorization
- Integrity verification with SHA-256
- Immutable-style version records
- Hash-chained chain of custody
- Hash-chained audit trail
- Security alerts on integrity violations
- Source-grounded investigation assistant
- Evidence relationships and investigation timeline
- Human-verification workflow for contradictions

### 2. Demonstrable security event chain

The strongest demo is a controlled integrity attack:

`Verified document -> disk tampering -> verification -> SHA-256 mismatch -> VIOLATION -> download lock -> CRITICAL alert -> audit/custody records`

This gives judges a concrete security story instead of a collection of security badges.

### 3. AI is deliberately constrained

The AI is an investigation-support tool, not a decision-maker. Retrieval is case-scoped, integrity-violated documents are excluded from AI retrieval, source references are returned, and uploaded evidence is treated as untrusted data rather than instructions.

## Threat model

| Threat | Control | Status |
|---|---|---|
| Privilege escalation at registration | Admin-only user creation | Implemented |
| Cross-case data access | CaseMember authorization | Implemented |
| Audit data leakage | Case-scoped audit queries | Implemented |
| Global security-alert leakage | Case-scoped alert queries | Implemented |
| Unauthorized alert resolution | Case access / ADMIN check | Implemented |
| Evidence tampering | SHA-256 verification | Implemented |
| Continued download of tampered evidence | HTTP 423 lock | Implemented |
| Malicious file extension/MIME | Signature validation | Implemented |
| AI prompt injection in evidence | Evidence/instruction separation policy | Implemented |
| AI retrieval of tampered evidence | Integrity filter | Implemented |
| Audit record modification | Hash chain | Implemented |
| Custody record modification | Hash chain | Implemented |
| Known/default production JWT secret | Production startup check | Implemented |
| Over-broad browser access | Configurable CORS | Implemented |

## Deliberate limitations

The prototype does **not** claim:

- Government PKI / legally certified digital signatures
- Blockchain-based evidence anchoring
- Production-grade HSM/key management
- Full image OCR
- Semantic/vector retrieval
- Multi-region object storage
- Formal legal admissibility certification

These should be presented as production roadmap items.

## Judge Q&A

### Why SHA-256?

It provides a deterministic integrity fingerprint. If the stored bytes change, the recomputed digest changes. It does not identify the attacker by itself.

### Why not blockchain?

A permissioned hash chain is simpler, cheaper, and directly useful for an audit/custody prototype. Blockchain can be added later for external anchoring if a deployment requires independent notarization.

### Can the AI decide guilt?

No. LAW1 is an investigation-support system. It retrieves authorized evidence, cites sources, surfaces potential relationships or contradictions, and explicitly requires human verification.

### What if someone edits an evidence file?

The next integrity check recomputes SHA-256. A mismatch changes the document state to `VIOLATION`, creates a critical alert, records custody/audit events, and blocks download.

### Can a user from another case read the document?

No. Every case-bound endpoint checks case membership server-side. The frontend is not the security boundary.

### What if an uploaded document contains an instruction to the AI?

Uploaded evidence is treated as untrusted data. The model is instructed not to follow commands contained inside retrieved evidence.

## Final demo sequence

1. Login as Investigating Officer.
2. Open `CR-2026-0192`.
3. Show case members / authorized access.
4. Open a verified bank statement and show SHA-256.
5. Show chain of custody.
6. Ask: `What transaction connects Rahul Sharma and Amit Verma?`
7. Show cited source document.
8. Run contradiction analysis.
9. Show 8:30 PM vs 10:00 PM and `REQUIRES_HUMAN_VERIFICATION`.
10. Open Connections.
11. Open Timeline.
12. Switch to ADMIN and verify audit chain.
13. Tamper with a demo file on disk.
14. Verify integrity.
15. Show `VIOLATION` + critical alert + locked download.
16. Resolve the alert.
17. Show the resolution itself in the audit trail.

## Final presentation rule

Do not lead with “AI chatbot”. Lead with **evidence trust and accountability**, then show AI operating inside that trusted boundary.
