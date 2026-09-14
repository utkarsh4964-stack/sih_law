import re

from sqlalchemy.orm import Session

from app.models import Document

STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "what", "which", "who",
    "connects", "connect", "to", "on", "in", "of", "and", "or", "for", "with",
    "that", "this", "does", "did", "how", "when", "where",
}


def _tokenize(text: str) -> set[str]:
    words = re.findall(r"[a-zA-Z0-9]+", text.lower())
    return {w for w in words if w not in STOPWORDS and len(w) > 2}


def retrieve(db: Session, case_id: str, question: str, top_k: int = 5) -> list[dict]:
    """Simple keyword-overlap retrieval over authorized case documents.
    Never retrieves documents outside case_id (authorization is enforced by
    the caller having already checked case access)."""
    q_tokens = _tokenize(question)
    docs = (db.query(Document)
            .filter(Document.case_id == case_id, Document.integrity_status == "VERIFIED")
            .all())

    scored = []
    for doc in docs:
        text = doc.extracted_text or ""
        doc_tokens = _tokenize(text)
        overlap = q_tokens & doc_tokens
        if not overlap:
            continue
        score = len(overlap) / max(len(q_tokens), 1)
        snippet = _best_snippet(text, overlap)
        scored.append({
            "document_id": doc.id,
            "document_name": doc.name,
            "document_type": doc.type,
            "relevance": round(min(score, 1.0) * 100, 1),
            "snippet": snippet,
        })

    scored.sort(key=lambda x: x["relevance"], reverse=True)
    return scored[:top_k]


def _best_snippet(text: str, keywords: set[str], window: int = 160) -> str:
    if not text:
        return ""
    lowered = text.lower()
    for kw in keywords:
        idx = lowered.find(kw)
        if idx != -1:
            start = max(0, idx - window // 2)
            end = min(len(text), idx + window // 2)
            return text[start:end].strip()
    return text[:window].strip()
