from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Case,
    CasePriority,
    CaseMember,
    Contradiction,
    Document,
    RoleEnum,
    SecurityAlert,
    TimelineEvent,
    User,
)
from app.schemas import CaseCreate, CaseOut
from app.security.deps import assert_case_access, get_current_user, require_permission
from app.services.audit import log_event

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("", response_model=list[CaseOut])
def list_cases(user: User = Depends(require_permission("case:view")), db: Session = Depends(get_db)):
    if user.role == RoleEnum.ADMIN:
        return db.query(Case).order_by(Case.updated_at.desc()).all()
    member_case_ids = [
        m.case_id for m in db.query(CaseMember).filter(CaseMember.user_id == user.id).all()
    ]
    return db.query(Case).filter(Case.id.in_(member_case_ids)).order_by(Case.updated_at.desc()).all()


@router.post("", response_model=CaseOut)
def create_case(
    payload: CaseCreate,
    user: User = Depends(require_permission("case:create")),
    db: Session = Depends(get_db),
):
    if payload.priority not in CasePriority.__members__:
        raise HTTPException(status_code=422, detail="Invalid case priority")

    case = Case(
        title=payload.title,
        description=payload.description,
        fir_number=payload.fir_number,
        case_type=payload.case_type,
        police_station=payload.police_station,
        investigating_officer_id=user.id,
        priority=payload.priority,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    db.add(CaseMember(case_id=case.id, user_id=user.id))
    db.commit()
    log_event(db, user.id, "CASE_CREATED", "case", case.id, case_id=case.id)
    return case


@router.get("/{case_id}", response_model=CaseOut)
def get_case(case_id: str, user: User = Depends(require_permission("case:view")), db: Session = Depends(get_db)):
    assert_case_access(db, user, case_id)
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.get("/{case_id}/stats")
def case_stats(case_id: str, user: User = Depends(require_permission("case:view")), db: Session = Depends(get_db)):
    assert_case_access(db, user, case_id)
    documents = db.query(Document).filter(Document.case_id == case_id).count()
    contradictions = db.query(Contradiction).filter(Contradiction.case_id == case_id).count()
    events = db.query(TimelineEvent).filter(TimelineEvent.case_id == case_id).count()
    alerts = (
        db.query(SecurityAlert)
        .filter(SecurityAlert.case_id == case_id, SecurityAlert.resolved.is_(False))
        .count()
    )
    return {
        "documents": documents,
        "contradictions": contradictions,
        "timeline_events": events,
        "open_alerts": alerts,
    }


@router.post("/{case_id}/members/{user_id}")
def add_member(
    case_id: str,
    user_id: str,
    user: User = Depends(require_permission("case:assign")),
    db: Session = Depends(get_db),
):
    assert_case_access(db, user, case_id)
    exists = (
        db.query(CaseMember)
        .filter(CaseMember.case_id == case_id, CaseMember.user_id == user_id)
        .first()
    )
    if exists:
        return {"status": "already a member"}
    db.add(CaseMember(case_id=case_id, user_id=user_id))
    db.commit()
    log_event(db, user.id, "CASE_UPDATED", "case", case_id, case_id=case_id,
              description=f"Added member {user_id}")
    return {"status": "added"}
