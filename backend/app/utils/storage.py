import os
import uuid

from app.config import settings

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STORAGE_DIR = os.path.join(BASE_DIR, "storage")
os.makedirs(STORAGE_DIR, exist_ok=True)


def save_file(content: bytes, original_filename: str) -> str:
    """Save file with a generated name (never trust user-provided filenames).
    Returns the relative storage path."""
    ext = os.path.splitext(original_filename)[1].lower()
    generated_name = f"{uuid.uuid4().hex}{ext}"
    full_path = os.path.join(STORAGE_DIR, generated_name)
    with open(full_path, "wb") as f:
        f.write(content)
    return full_path


def sanitize_filename(filename: str) -> str:
    filename = os.path.basename(filename)
    return filename.replace("..", "").replace("/", "").replace("\\", "")
