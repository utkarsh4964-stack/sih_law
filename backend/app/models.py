import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    INVESTIGATING_OFFICER = "INVESTIGATING_OFFICER"
    FORENSIC_OFFICER = "FORENSIC_OFFICER"
    PROSECUTOR = "PROSECUTOR"
    LEGAL_OFFICER = "LEGAL_OFFICER"
    VIEWER = "VIEWER"


class CaseStatus(str, enum.Enum):
    OPEN = "OPEN"
    UNDER_INVESTIGATION = "UNDER_INVESTIGATION"
    UNDER_REVIEW = "UNDER_REVIEW"
    CHARGESHEETED = "CHARGESHEETED"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"


class CasePriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class DocumentType(str, enum.Enum):
    FIR = "FIR"
    POLICE_REPORT = "POLICE_REPORT"
    WITNESS_STATEMENT = "WITNESS_STATEMENT"
    CHARGE_SHEET = "CHARGE_SHEET"
    COURT_FILING = "COURT_FILING"
    EVIDENCE_RECORD = "EVIDENCE_RECORD"
    FORENSIC_REPORT = "FORENSIC_REPORT"
    LEGAL_NOTICE = "LEGAL_NOTICE"
    JUDGMENT = "JUDGMENT"
    OTHER = "OTHER"


class Classification(str, enum.Enum):
    PUBLIC = "PUBLIC"
    INTERNAL = "INTERNAL"
    CONFIDENTIAL = "CONFIDENTIAL"
    HIGHLY_CONFIDENTIAL = "HIGHLY_CONFIDENTIAL"


class IntegrityStatus(str, enum.Enum):
    VERIFIED = "VERIFIED"
    VIOLATION = "VIOLATION"
    UNVERIFIED = "UNVERIFIED"


class ProcessingStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    INDEXED = "INDEXED"
    READY = "READY"
    FAILED = "FAILED"


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: gen_id("USR"))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    department = Column(String, default="")
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)


class Case(Base):
    __tablename__ = "cases"
    id = Column(String, primary_key=True, default=lambda: gen_id("CR"))
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    fir_number = Column(String, default="")
    case_type = Column(String, default="")
    police_station = Column(String, default="")
    investigating_officer_id = Column(String, ForeignKey("users.id"), nullable=True)
    priority = Column(Enum(CasePriority), default=CasePriority.MEDIUM)
    status = Column(Enum(CaseStatus), default=CaseStatus.OPEN)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CaseMember(Base):
    __tablename__ = "case_members"
    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String, ForeignKey("cases.id"), index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    added_at = Column(DateTime, default=datetime.utcnow)


class Document(Base):
    __tablename__ = "documents"
    id = Column(String, primary_key=True, default=lambda: gen_id("DOC"))
    case_id = Column(String, ForeignKey("cases.id"), index=True, nullable=False)
    name = Column(String, nullable=False)
    type = Column(Enum(DocumentType), default=DocumentType.OTHER)
    description = Column(Text, default="")
    storage_path = Column(String, nullable=False)
    mime_type = Column(String, default="")
    size = Column(Integer, default=0)
    uploaded_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    current_version = Column(Integer, default=1)
    sha256_hash = Column(String, nullable=False)
    integrity_status = Column(Enum(IntegrityStatus), default=IntegrityStatus.VERIFIED)
    classification = Column(Enum(Classification), default=Classification.INTERNAL)
    digital_signature_status = Column(String, default="UNSIGNED")
    processing_status = Column(Enum(ProcessingStatus), default=ProcessingStatus.UPLOADED)
    extracted_text = Column(Text, default="")


class DocumentVersion(Base):
    __tablename__ = "document_versions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String, ForeignKey("documents.id"), index=True)
    version_number = Column(Integer, nullable=False)
    file_path = Column(String, nullable=False)
    sha256_hash = Column(String, nullable=False)
    uploaded_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    change_reason = Column(String, default="")


class ChainOfCustody(Base):
    __tablename__ = "chain_of_custody"
    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String, ForeignKey("documents.id"), index=True)
    case_id = Column(String, ForeignKey("cases.id"), index=True)
    actor_id = Column(String, ForeignKey("users.id"))
    action = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    description = Column(String, default="")
    ip_address = Column(String, default="")
    previous_hash = Column(String, default="")
    event_hash = Column(String, default="")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    resource_type = Column(String, default="")
    resource_id = Column(String, default="")
    case_id = Column(String, nullable=True)
    status = Column(String, default="SUCCESS")
    description = Column(String, default="")
    timestamp = Column(DateTime, default=datetime.utcnow)
    previous_hash = Column(String, default="")
    event_hash = Column(String, default="")


class SecurityAlert(Base):
    __tablename__ = "security_alerts"
    id = Column(String, primary_key=True, default=lambda: gen_id("ALERT"))
    severity = Column(String, nullable=False)  # CRITICAL, SUSPICIOUS, INFO
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    document_id = Column(String, nullable=True)
    case_id = Column(String, nullable=True)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Contradiction(Base):
    __tablename__ = "contradictions"
    id = Column(String, primary_key=True, default=lambda: gen_id("CONTRA"))
    case_id = Column(String, ForeignKey("cases.id"), index=True)
    category = Column(String, default="")
    statement_a = Column(Text, default="")
    statement_b = Column(Text, default="")
    source_a_document_id = Column(String, default="")
    source_b_document_id = Column(String, default="")
    confidence = Column(Integer, default=0)
    status = Column(String, default="REQUIRES_HUMAN_VERIFICATION")
    created_at = Column(DateTime, default=datetime.utcnow)


class TimelineEvent(Base):
    __tablename__ = "timeline_events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String, ForeignKey("cases.id"), index=True)
    event_date = Column(String, default="")
    event_description = Column(String, default="")
    source_document_id = Column(String, default="")
    confidence = Column(Integer, default=100)
    ai_extracted = Column(Boolean, default=False)
