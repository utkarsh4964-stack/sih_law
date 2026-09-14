import os

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi import status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import ChainOfCustody, Classification, Document, DocumentType, DocumentVersion, SecurityAlert, User
from app.schemas import DocumentOut
from app.security.deps import assert_case_access, require_permission
from app.services.audit import log_event
from app.services.custody import add_custody_event
from app.services.extraction import classify_document, extract_text
from app.utils.hashing import sha256_bytes, sha256_file
from app.utils.storage import save_file, sanitize_filename

router = APIRouter(tags=["documents"])


def _validate_upload(file: UploadFile, content: bytes):
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail=f"Unsupported file extension: {ext or 'none'}")
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds maximum upload size")

    declared = (file.content_type or "").lower()
    if declared and declared not in settings.ALLOWED_MIME_TYPES and declared != "application/octet-stream":
        raise HTTPException(status_code=415, detail="Unsupported or unsafe MIME type")

    # Verify the content signature instead of trusting only the browser-provided MIME.
    if ext == ".pdf" and not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=415, detail="File signature does not match PDF extension")
    if ext == ".png" and content[:8] != b"\x89PNG\r\n\x1a\n":
        raise HTTPException(status_code=415, detail="File signature does not match PNG extension")
    if ext in {".jpg", ".jpeg"} and not content.startswith(b"\xff\xd8\xff"):
        raise HTTPException(status_code=415, detail="File signature does not match JPEG extension")
    if ext == ".docx" and not content.startswith(b"PK\x03\x04"):
        raise HTTPException(status_code=415, detail="File signature does not match DOCX extension")
    if ext == ".txt" and b"\x00" in content[:4096]:
        raise HTTPException(status_code=415, detail="Binary content is not accepted as TXT")


@router.post("/cases/{case_id}/documents", response_model=DocumentOut)
async def upload_document(
    case_id: str,
    file: UploadFile,
    doc_type: str = "OTHER",
    classification: str = "INTERNAL",
    user: User = Depends(require_permission("document:upload")),
    db: Session = Depends(get_db),
):
    assert_case_access(db, user, case_id)
    content = await file.read()
    _validate_upload(file, content)

    safe_name = sanitize_filename(file.filename)
    stored_path = save_file(content, safe_name)
    file_hash = sha256_bytes(content)

    # Exact duplicate detection via SHA-256
    duplicate = db.query(Document).filter(
        Document.case_id == case_id, Document.sha256_hash == file_hash
    ).first()

    text = extract_text(stored_path, file.content_type or "")
    predicted_type, confidence = classify_document(safe_name, text)

    resolved_type = doc_type if doc_type in DocumentType.__members__ else predicted_type
    if resolved_type not in DocumentType.__members__:
        resolved_type = "OTHER"
    if classification not in Classification.__members__:
        raise HTTPException(status_code=422, detail="Invalid document classification")

    doc = Document(
        case_id=case_id,
        name=safe_name,
        type=resolved_type,
        storage_path=stored_path,
        mime_type=file.content_type or "application/octet-stream",
        size=len(content),
        uploaded_by=user.id,
        sha256_hash=file_hash,
        integrity_status="VERIFIED",
        classification=classification,
        processing_status="READY" if text else "READY",
        extracted_text=text[:20000],
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    db.add(DocumentVersion(
        document_id=doc.id, version_number=1, file_path=stored_path,
        sha256_hash=file_hash, uploaded_by=user.id, change_reason="Original upload",
    ))
    db.commit()

    add_custody_event(db, doc.id, case_id, user.id, "UPLOADED", description=f"Uploaded {safe_name}")
    add_custody_event(db, doc.id, case_id, user.id, "VERIFIED", description="SHA-256 generated and verified")
    log_event(db, user.id, "DOCUMENT_UPLOADED", "document", doc.id, case_id=case_id,
              description=f"{safe_name} ({len(content)} bytes)")

    if duplicate:
        db.add(SecurityAlert(
            severity="INFO", title="Possible duplicate document",
            description=f"Identical SHA-256 to existing document {duplicate.id}",
            document_id=doc.id, case_id=case_id,
        ))
        db.commit()

    return doc


@router.get("/cases/{case_id}/documents", response_model=list[DocumentOut])
def list_documents(case_id: str, user: User = Depends(require_permission("document:view")), db: Session = Depends(get_db)):
    assert_case_access(db, user, case_id)
    return db.query(Document).filter(Document.case_id == case_id).order_by(Document.created_at.desc()).all()


@router.get("/documents/{document_id}", response_model=DocumentOut)
def get_document(document_id: str, user: User = Depends(require_permission("document:view")), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    assert_case_access(db, user, doc.case_id)
    add_custody_event(db, doc.id, doc.case_id, user.id, "VIEWED")
    log_event(db, user.id, "DOCUMENT_VIEWED", "document", doc.id, case_id=doc.case_id)
    return doc


@router.get("/documents/{document_id}/download")
def download_document(document_id: str, user: User = Depends(require_permission("document:download")), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    assert_case_access(db, user, doc.case_id)
    if doc.integrity_status == "VIOLATION":
        raise HTTPException(status_code=423, detail="Document is locked pending integrity review")
    if not os.path.exists(doc.storage_path):
        raise HTTPException(status_code=404, detail="File missing from storage")
    add_custody_event(db, doc.id, doc.case_id, user.id, "DOWNLOADED")
    log_event(db, user.id, "DOCUMENT_DOWNLOADED", "document", doc.id, case_id=doc.case_id)
    return FileResponse(doc.storage_path, filename=doc.name, media_type=doc.mime_type)


@router.post("/documents/{document_id}/verify")
def verify_integrity(document_id: str, user: User = Depends(require_permission("document:verify")), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    assert_case_access(db, user, doc.case_id)

    if not os.path.exists(doc.storage_path):
        raise HTTPException(status_code=404, detail="File missing from storage")

    current_hash = sha256_file(doc.storage_path)
    original_hash = doc.sha256_hash

    if current_hash == original_hash:
        doc.integrity_status = "VERIFIED"
        db.commit()
        add_custody_event(db, doc.id, doc.case_id, user.id, "VERIFIED", description="Integrity check passed")
        log_event(db, user.id, "INTEGRITY_CHECK", "document", doc.id, case_id=doc.case_id, status="SUCCESS")
        return {"status": "VERIFIED", "original_hash": original_hash, "current_hash": current_hash}

    doc.integrity_status = "VIOLATION"
    db.commit()
    db.add(SecurityAlert(
        severity="CRITICAL", title="Document integrity violation detected",
        description=f"Original hash {original_hash} != current hash {current_hash}. Document locked.",
        document_id=doc.id, case_id=doc.case_id,
    ))
    db.commit()
    add_custody_event(db, doc.id, doc.case_id, user.id, "INTEGRITY_VIOLATION",
                       description="Hash mismatch detected")
    log_event(db, user.id, "INTEGRITY_VIOLATION", "document", doc.id, case_id=doc.case_id, status="FAILED",
              description="SHA-256 mismatch")
    return {
        "status": "VIOLATION",
        "original_hash": original_hash,
        "current_hash": current_hash,
        "note": "SHA-256 detects that the hashed content changed; it does not by itself identify who changed it.",
    }


@router.get("/documents/{document_id}/versions")
def get_versions(document_id: str, user: User = Depends(require_permission("document:view")), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    assert_case_access(db, user, doc.case_id)
    versions = (
        db.query(DocumentVersion)
        .filter(DocumentVersion.document_id == document_id)
        .order_by(DocumentVersion.version_number.desc())
        .all()
    )
    return [
        {
            "version_number": v.version_number,
            "sha256_hash": v.sha256_hash,
            "uploaded_by": v.uploaded_by,
            "created_at": v.created_at,
            "change_reason": v.change_reason,
        }
        for v in versions
    ]


@router.get("/documents/{document_id}/custody")
def get_custody(document_id: str, user: User = Depends(require_permission("document:view")), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    assert_case_access(db, user, doc.case_id)
    events = (
        db.query(ChainOfCustody)
        .filter(ChainOfCustody.document_id == document_id)
        .order_by(ChainOfCustody.timestamp.asc())
        .all()
    )
    return [
        {
            "action": e.action,
            "actor_id": e.actor_id,
            "timestamp": e.timestamp,
            "description": e.description,
            "event_hash": e.event_hash,
        }
        for e in events
    ]
