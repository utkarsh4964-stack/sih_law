from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditLog, CaseMember, RoleEnum, User
from app.security.deps import assert_case_access, require_permission
from app.services.audit import verify_chain

router = APIRouter(tags=["audit"])


def _serialize(events):
    return [
        {
            "id": e.id,
            "timestamp": e.timestamp,
            "actor_id": e.actor_id,
            "action": e.action,
            "resource_type": e.resource_type,
            "resource_id": e.resource_id,
            "case_id": e.case_id,
            "status": e.status,
            "description": e.description,
        }
        for e in events
    ]


@router.get("/cases/{case_id}/audit")
def case_audit(case_id: str, user: User = Depends(require_permission("audit:view")), db: Session = Depends(get_db)):
    assert_case_access(db, user, case_id)
    events = (
        db.query(AuditLog)
        .filter(AuditLog.case_id == case_id)
        .order_by(AuditLog.timestamp.desc())
        .all()
    )
    return _serialize(events)


@router.get("/audit")
def all_audit(
    action: str | None = None,
    case_id: str | None = None,
    user_id: str | None = None,
    user: User = Depends(require_permission("audit:view")),
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if user.role != RoleEnum.ADMIN:
        member_case_ids = [m.case_id for m in db.query(CaseMember).filter(CaseMember.user_id == user.id).all()]
        q = q.filter(AuditLog.case_id.in_(member_case_ids))
    if action:
        q = q.filter(AuditLog.action == action)
    if case_id:
        if user.role != RoleEnum.ADMIN:
            assert_case_access(db, user, case_id)
        q = q.filter(AuditLog.case_id == case_id)
    if user_id:
        q = q.filter(AuditLog.actor_id == user_id)
    return _serialize(q.order_by(AuditLog.timestamp.desc()).limit(500).all())


@router.post("/audit/verify-chain")
def verify_audit_chain(user: User = Depends(require_permission("audit:view")), db: Session = Depends(get_db)):
    # The chain is global, so verification is restricted to administrators.
    if user.role != RoleEnum.ADMIN:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only administrators can verify the global audit chain")
    valid, message = verify_chain(db)
    return {"status": "VALID" if valid else "CHAIN INTEGRITY FAILURE", "detail": message}
