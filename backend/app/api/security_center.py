from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CaseMember, RoleEnum, SecurityAlert, User
from app.security.deps import assert_case_access, require_permission
from app.services.audit import log_event, verify_chain

router = APIRouter(prefix="/security", tags=["security"])


def _scoped_alert_query(db: Session, user: User):
    q = db.query(SecurityAlert)
    if user.role != RoleEnum.ADMIN:
        case_ids = [m.case_id for m in db.query(CaseMember).filter(CaseMember.user_id == user.id).all()]
        q = q.filter(SecurityAlert.case_id.in_(case_ids))
    return q


@router.get("/alerts")
def list_alerts(
    resolved: bool | None = None,
    user: User = Depends(require_permission("security:view")),
    db: Session = Depends(get_db),
):
    q = _scoped_alert_query(db, user)
    if resolved is not None:
        q = q.filter(SecurityAlert.resolved == resolved)
    return q.order_by(SecurityAlert.created_at.desc()).all()


@router.get("/status")
def security_status(user: User = Depends(require_permission("security:view")), db: Session = Depends(get_db)):
    q = _scoped_alert_query(db, user).filter(SecurityAlert.resolved.is_(False))
    open_alerts = q.count()
    critical = q.filter(SecurityAlert.severity == "CRITICAL").count()
    chain_valid, _ = verify_chain(db)
    return {
        "open_alerts": open_alerts,
        "critical_alerts": critical,
        "audit_chain_status": "VALID" if chain_valid else "CHAIN INTEGRITY FAILURE",
    }


@router.post("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: str, user: User = Depends(require_permission("security:view")), db: Session = Depends(get_db)):
    alert = db.query(SecurityAlert).filter(SecurityAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.case_id:
        assert_case_access(db, user, alert.case_id)
    elif user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Only administrators can resolve global security alerts")
    alert.resolved = True
    db.commit()
    log_event(db, user.id, "SECURITY_ALERT_RESOLVED", "security_alert", alert_id, case_id=alert.case_id)
    return {"status": "resolved"}
