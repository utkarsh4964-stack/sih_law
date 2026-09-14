from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.generation import generate_answer
from app.ai.retrieval import retrieve
from app.database import get_db
from app.models import Contradiction, User
from app.schemas import AIQueryRequest, AIQueryResponse
from app.security.deps import assert_case_access, require_permission
from app.services.audit import log_event

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/query", response_model=AIQueryResponse)
def query(
    payload: AIQueryRequest,
    user: User = Depends(require_permission("ai:query")),
    db: Session = Depends(get_db),
):
    # Authorization check happens BEFORE retrieval — the retriever only ever
    # sees documents within this case, and the case access check runs first.
    assert_case_access(db, user, payload.case_id)

    sources = retrieve(db, payload.case_id, payload.question)
    answer, confidence = generate_answer(payload.question, sources)

    log_event(db, user.id, "AI_QUERY", "case", payload.case_id, case_id=payload.case_id,
              description=payload.question[:200])

    return AIQueryResponse(
        answer=answer,
        confidence=confidence,
        sources=[{"document_id": s["document_id"], "document_name": s["document_name"],
                   "relevance": s["relevance"]} for s in sources],
    )


@router.post("/contradictions")
def detect_contradictions(
    case_id: str,
    user: User = Depends(require_permission("ai:analyze")),
    db: Session = Depends(get_db),
):
    assert_case_access(db, user, case_id)
    contradictions = db.query(Contradiction).filter(Contradiction.case_id == case_id).all()
    log_event(db, user.id, "AI_ANALYSIS", "case", case_id, case_id=case_id,
              description="Contradiction scan")
    return [
        {
            "id": c.id,
            "category": c.category,
            "statement_a": c.statement_a,
            "statement_b": c.statement_b,
            "source_a": c.source_a_document_id,
            "source_b": c.source_b_document_id,
            "confidence": c.confidence,
            "status": c.status,
        }
        for c in contradictions
    ]



