from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Contradiction, Document, TimelineEvent, User
from app.security.deps import assert_case_access, require_permission

router = APIRouter(prefix="/cases", tags=["case-intel"])


@router.get("/{case_id}/timeline")
def get_timeline(case_id: str, user: User = Depends(require_permission("case:view")), db: Session = Depends(get_db)):
    assert_case_access(db, user, case_id)
    events = (
        db.query(TimelineEvent)
        .filter(TimelineEvent.case_id == case_id)
        .order_by(TimelineEvent.event_date.asc())
        .all()
    )
    return [
        {
            "date": e.event_date,
            "description": e.event_description,
            "source_document_id": e.source_document_id,
            "confidence": e.confidence,
            "ai_extracted": e.ai_extracted,
        }
        for e in events
    ]


@router.get("/{case_id}/graph")
def get_graph(case_id: str, user: User = Depends(require_permission("case:view")), db: Session = Depends(get_db)):
    """Evidence relationship graph. Nodes/edges are derived only from stored
    documents and contradictions — never fabricated."""
    assert_case_access(db, user, case_id)
    docs = db.query(Document).filter(Document.case_id == case_id).all()
    contradictions = db.query(Contradiction).filter(Contradiction.case_id == case_id).all()

    nodes = [{"id": case_id, "type": "Case", "label": case_id}]
    edges = []
    for d in docs:
        nodes.append({"id": d.id, "type": "Document", "label": d.name})
        edges.append({"source": case_id, "target": d.id, "relation": "RELATED_TO"})

    for c in contradictions:
        if c.source_a_document_id:
            edges.append({
                "source": c.source_a_document_id,
                "target": c.source_b_document_id,
                "relation": "CONTRADICTS",
                "label": c.category,
            })

    return {"nodes": nodes, "edges": edges}
