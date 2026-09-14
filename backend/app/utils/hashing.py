import hashlib


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def chain_hash(previous_hash: str, payload: str) -> str:
    """Compute a tamper-evident chain hash: hash(previous_hash + payload)."""
    combined = (previous_hash or "GENESIS") + "|" + payload
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()
