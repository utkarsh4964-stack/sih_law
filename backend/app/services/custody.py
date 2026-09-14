from datetime import datetime

from sqlalchemy.orm import Session

from app.models import ChainOfCustody
from app.utils.hashing import chain_hash


def _payload(entry: ChainOfCustody) -> str:
    timestamp = entry.timestamp.isoformat() if entry.timestamp else ""
    return "|".join([
        str(entry.document_id or ""),
        str(entry.case_id or ""),
        str(entry.actor_id or ""),
        str(entry.action or ""),
        timestamp,
        str(entry.description or ""),
        str(entry.ip_address or ""),
    ])


def add_custody_event(
    db: Session,
    document_id: str,
    case_id: str,
    actor_id: str,
    action: str,
    description: str = "",
    ip_address: str = "",
) -> ChainOfCustody:
    last = (
        db.query(ChainOfCustody)
        .filter(ChainOfCustody.document_id == document_id)
        .order_by(ChainOfCustody.id.desc())
        .first()
    )
    previous_hash = last.event_hash if last else ""
    entry = ChainOfCustody(
        document_id=document_id,
        case_id=case_id,
        actor_id=actor_id,
        action=action,
        description=description,
        ip_address=ip_address,
        timestamp=datetime.utcnow(),
        previous_hash=previous_hash,
    )
    entry.event_hash = chain_hash(previous_hash, _payload(entry))
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
