"""Seed LAW1 with demo accounts and a fictional demonstration case.
Run: python seed.py
"""
import sys
from datetime import datetime

sys.path.insert(0, ".")

from app.database import Base, SessionLocal, engine
from app.models import (
    Case,
    CaseMember,
    CasePriority,
    CaseStatus,
    ChainOfCustody,
    Contradiction,
    Document,
    DocumentVersion,
    RoleEnum,
    TimelineEvent,
    User,
)
from app.security.auth import hash_password
from app.services.audit import log_event
from app.services.custody import add_custody_event
from app.utils.hashing import sha256_bytes
from app.utils.storage import save_file

Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("Seeding LAW1 demo data...")

# --- Demo users -------------------------------------------------------
demo_users = [
    ("Admin User", "admin@law1.demo", "Admin@123", RoleEnum.ADMIN, "HQ"),
    ("Inspector A. Sharma", "io@law1.demo", "Io@12345", RoleEnum.INVESTIGATING_OFFICER, "Delhi Police - EOW"),
    ("Dr. R. Mehta", "forensic@law1.demo", "Forensic@123", RoleEnum.FORENSIC_OFFICER, "Forensic Science Lab"),
    ("Adv. S. Nair", "prosecutor@law1.demo", "Prosecutor@123", RoleEnum.PROSECUTOR, "Public Prosecutor's Office"),
    ("Adv. K. Iyer", "legal@law1.demo", "Legal@123", RoleEnum.LEGAL_OFFICER, "Legal Cell"),
    ("Viewer Account", "viewer@law1.demo", "Viewer@123", RoleEnum.VIEWER, "Oversight Committee"),
]

users = {}
for name, email, pwd, role, dept in demo_users:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        users[role.value] = existing
        continue
    u = User(name=name, email=email, password_hash=hash_password(pwd), role=role,
              department=dept, status="ACTIVE")
    db.add(u)
    db.commit()
    db.refresh(u)
    users[role.value] = u
    print(f"  created user {email} / {pwd}")

io = users[RoleEnum.INVESTIGATING_OFFICER.value]
forensic = users[RoleEnum.FORENSIC_OFFICER.value]

# --- Demo case ----------------------------------------------------------
case = db.query(Case).filter(Case.id == "CR-2026-0192").first()
if not case:
    case = Case(
        id="CR-2026-0192",
        title="Financial Fraud Investigation",
        description="Suspected financial fraud involving unauthorized fund transfers "
                     "linked to shell transactions.",
        fir_number="FIR/0192/2026",
        case_type="Financial Fraud",
        police_station="Economic Offences Wing, Delhi",
        investigating_officer_id=io.id,
        priority=CasePriority.HIGH,
        status=CaseStatus.UNDER_INVESTIGATION,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    for role_key in users:
        db.add(CaseMember(case_id=case.id, user_id=users[role_key].id))
    db.commit()
    print(f"  created case {case.id}")

# --- Demo documents (fictional content) ---------------------------------
demo_docs = [
    ("FIR_CR-2026-0192.txt", "FIR",
     "First Information Report. FIR No. FIR/0192/2026. Complainant reports "
     "suspicious fund transfers from account linked to Rahul Sharma. "
     "Incident reported on 12 March 2026.", "CONFIDENTIAL"),
    ("Bank_Statement_TXN84921.txt", "EVIDENCE_RECORD",
     "Bank Statement excerpt. Transaction TXN-84921 dated 14 March 2026. "
     "Amount: INR 5,00,000. Transferred from account held by Rahul Sharma "
     "to account held by Amit Verma. Branch: Connaught Place, Delhi.",
     "HIGHLY_CONFIDENTIAL"),
    ("Witness_Statement_A.txt", "WITNESS_STATEMENT",
     "Statement of witness Neha Kapoor. On 14 March 2026, witness states the "
     "incident at the office premises occurred at approximately 8:30 PM. "
     "Witness observed Rahul Sharma leaving the premises shortly after.",
     "CONFIDENTIAL"),
    ("Witness_Statement_B.txt", "WITNESS_STATEMENT",
     "Statement of witness security guard on duty. States that the incident "
     "at the office premises occurred at approximately 10:00 PM, and that "
     "Rahul Sharma was seen on the premises at that time.", "CONFIDENTIAL"),
    ("Forensic_Report_001.txt", "FORENSIC_REPORT",
     "Forensic analysis of seized digital devices belonging to Amit Verma. "
     "Metadata review indicates file modification timestamps consistent "
     "with 14 March 2026 between 8:00 PM and 10:30 PM.", "HIGHLY_CONFIDENTIAL"),
    ("Investigation_Report_001.txt", "POLICE_REPORT",
     "Investigation report summarizing findings to date. Transaction "
     "TXN-84921 is under scrutiny as the central financial instrument "
     "connecting Rahul Sharma and Amit Verma in this case.", "CONFIDENTIAL"),
    ("Charge_Sheet_Draft.txt", "CHARGE_SHEET",
     "Draft charge sheet prepared for CR-2026-0192, pending prosecutorial "
     "review. Charges under consideration relate to criminal breach of "
     "trust and cheating.", "HIGHLY_CONFIDENTIAL"),
]

doc_ids = {}
if db.query(Document).filter(Document.case_id == case.id).count() == 0:
    for filename, doc_type, text, classification in demo_docs:
        content = text.encode("utf-8")
        path = save_file(content, filename)
        file_hash = sha256_bytes(content)
        doc = Document(
            case_id=case.id, name=filename, type=doc_type, storage_path=path,
            mime_type="text/plain", size=len(content), uploaded_by=io.id,
            sha256_hash=file_hash, integrity_status="VERIFIED",
            classification=classification, processing_status="READY",
            extracted_text=text,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        doc_ids[filename] = doc.id
        db.add(DocumentVersion(document_id=doc.id, version_number=1, file_path=path,
                                sha256_hash=file_hash, uploaded_by=io.id,
                                change_reason="Original upload"))
        db.commit()
        add_custody_event(db, doc.id, case.id, io.id, "UPLOADED", description=f"Uploaded {filename}")
        add_custody_event(db, doc.id, case.id, io.id, "VERIFIED", description="SHA-256 generated and verified")
        log_event(db, io.id, "DOCUMENT_UPLOADED", "document", doc.id, case_id=case.id,
                  description=filename)
        print(f"  uploaded {filename} -> {doc.id}")

    # --- Designed contradiction -------------------------------------
    db.add(Contradiction(
        case_id=case.id, category="Timeline",
        statement_a="Incident occurred at 8:30 PM.",
        statement_b="Incident occurred at 10:00 PM.",
        source_a_document_id=doc_ids["Witness_Statement_A.txt"],
        source_b_document_id=doc_ids["Witness_Statement_B.txt"],
        confidence=94, status="REQUIRES_HUMAN_VERIFICATION",
    ))

    # --- Timeline events ----------------------------------------------
    timeline = [
        ("12 Mar 2026", "FIR registered", "FIR_CR-2026-0192.txt", 100, False),
        ("14 Mar 2026", "Financial transaction TXN-84921 executed", "Bank_Statement_TXN84921.txt", 100, False),
        ("14 Mar 2026", "Witness statement recorded (Witness A)", "Witness_Statement_A.txt", 90, True),
        ("15 Mar 2026", "Witness statement recorded (Witness B)", "Witness_Statement_B.txt", 90, True),
        ("18 Mar 2026", "Forensic analysis of devices completed", "Forensic_Report_001.txt", 85, True),
        ("20 Mar 2026", "Investigation report filed", "Investigation_Report_001.txt", 95, False),
        ("25 Mar 2026", "Charge sheet drafted", "Charge_Sheet_Draft.txt", 80, False),
    ]
    for date, desc, fname, conf, ai_ex in timeline:
        db.add(TimelineEvent(
            case_id=case.id, event_date=date, event_description=desc,
            source_document_id=doc_ids.get(fname, ""), confidence=conf, ai_extracted=ai_ex,
        ))

    db.commit()
    print("  seeded contradiction and timeline")

print("\nDone. Demo credentials:")
for name, email, pwd, role, dept in demo_users:
    print(f"  {role.value:<25} {email:<22} {pwd}")
print(f"\nDemo case: {case.id} — {case.title}")

db.close()
