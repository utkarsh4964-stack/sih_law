"""Focused security regression tests for LAW1's highest-risk controls.

These tests are intentionally dependency-light; full API integration tests can
be run with pytest once the backend environment is installed.
"""
from app.services.audit import _payload as audit_payload
from app.services.custody import _payload as custody_payload


def test_audit_payload_binds_description_and_timestamp():
    class Entry:
        actor_id = "USR-1"
        action = "LOGIN"
        resource_type = "user"
        resource_id = "USR-1"
        case_id = None
        status = "SUCCESS"
        description = "normal login"
        timestamp = __import__("datetime").datetime(2026, 9, 13, 12, 0, 0)

    payload = audit_payload(Entry())
    assert "normal login" in payload
    assert "2026-09-13T12:00:00" in payload


def test_custody_payload_binds_case_description_ip_and_timestamp():
    class Entry:
        document_id = "DOC-1"
        case_id = "CR-1"
        actor_id = "USR-1"
        action = "DOWNLOADED"
        description = "download"
        ip_address = "127.0.0.1"
        timestamp = __import__("datetime").datetime(2026, 9, 13, 12, 0, 0)

    payload = custody_payload(Entry())
    assert "CR-1" in payload
    assert "download" in payload
    assert "127.0.0.1" in payload
    assert "2026-09-13T12:00:00" in payload
