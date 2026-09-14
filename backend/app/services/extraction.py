import os


def extract_text(file_path: str, mime_type: str) -> str:
    """Extract text from a document. Falls back gracefully (empty string)
    if the format is unsupported or extraction fails, per requirement #17:
    the app must remain usable without any external AI dependency."""
    ext = os.path.splitext(file_path)[1].lower()
    try:
        if ext == ".txt":
            with open(file_path, "r", errors="ignore") as f:
                return f.read()
        if ext == ".pdf":
            from pypdf import PdfReader

            reader = PdfReader(file_path)
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        if ext == ".docx":
            import docx

            doc = docx.Document(file_path)
            return "\n".join(p.text for p in doc.paragraphs)
        # PNG/JPG would go through OCR (pytesseract) in a full build;
        # omitted here to keep the prototype dependency-light (P2 item).
        return ""
    except Exception:
        return ""


def classify_document(filename: str, text: str) -> tuple[str, float]:
    """Very simple rule-based classifier as an AI fallback (works with zero
    API key). Returns (predicted_type, confidence)."""
    lowered = (filename + " " + text[:2000]).lower()
    rules = [
        ("FIR", ["first information report", "fir no", "fir number"]),
        ("WITNESS_STATEMENT", ["witness statement", "statement of witness", "deposition"]),
        ("CHARGE_SHEET", ["charge sheet", "chargesheet"]),
        ("FORENSIC_REPORT", ["forensic", "ballistic", "dna analysis"]),
        ("COURT_FILING", ["in the court of", "hon'ble court", "petitioner", "respondent"]),
        ("JUDGMENT", ["judgment", "order of the court", "hereby ordered"]),
        ("LEGAL_NOTICE", ["legal notice"]),
        ("EVIDENCE_RECORD", ["evidence record", "seizure memo"]),
        ("POLICE_REPORT", ["police report", "station house officer"]),
    ]
    for doc_type, keywords in rules:
        if any(k in lowered for k in keywords):
            return doc_type, 0.85
    return "OTHER", 0.4
