from datetime import datetime

from sqlalchemy.orm import Session

from app.models import AuditLog
from app.utils.hashing import chain_hash


def _payload(entry: AuditLog) -> str:
    timestamp = entry.timestamp.isoformat() if entry.timestamp else ""
    return "|".join([
        str(entry.actor_id or ""),
        str(entry.action or ""),
        str(entry.resource_type or ""),
        str(entry.resource_id or ""),
        str(entry.case_id or ""),
        str(entry.status or ""),
        timestamp,
        str(entry.description or ""),
    ])


def log_event(
    db: Session,
    actor_id: str | None,
    action: str,
    resource_type: str = "",
    resource_id: str = "",
    case_id: str | None = None,
    status: str = "SUCCESS",
    description: str = "",
) -> AuditLog:
    last = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    previous_hash = last.event_hash if last else ""
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        case_id=case_id,
        status=status,
        description=description,
        timestamp=datetime.utcnow(),
        previous_hash=previous_hash,
    )
    entry.event_hash = chain_hash(previous_hash, _payload(entry))
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def verify_chain(db: Session) -> tuple[bool, str]:
    events = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
    previous_hash = ""
    for e in events:
        expected = chain_hash(previous_hash, _payload(e))
        if expected != e.event_hash or e.previous_hash != previous_hash:
            return False, f"Chain integrity failure at audit log id {e.id}"
        previous_hash = e.event_hash
    return True, "VALID"
