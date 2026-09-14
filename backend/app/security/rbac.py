from app.models import RoleEnum

# Permission catalogue
PERMISSIONS = {
    "case:create", "case:view", "case:update", "case:assign",
    "document:upload", "document:view", "document:download",
    "document:update", "document:delete", "document:verify",
    "evidence:view", "evidence:create",
    "ai:query", "ai:analyze",
    "audit:view", "security:view", "user:manage",
}

ROLE_PERMISSIONS: dict[RoleEnum, set[str]] = {
    RoleEnum.ADMIN: set(PERMISSIONS),
    RoleEnum.INVESTIGATING_OFFICER: {
        "case:create", "case:view", "case:update", "case:assign",
        "document:upload", "document:view", "document:download",
        "document:update", "document:verify",
        "evidence:view", "evidence:create",
        "ai:query", "ai:analyze", "audit:view", "security:view",
    },
    RoleEnum.FORENSIC_OFFICER: {
        "case:view", "document:upload", "document:view", "document:download",
        "document:verify", "evidence:view", "evidence:create",
        "ai:query", "ai:analyze",
    },
    RoleEnum.PROSECUTOR: {
        "case:view", "document:view", "document:download",
        "evidence:view", "ai:query", "audit:view",
    },
    RoleEnum.LEGAL_OFFICER: {
        "case:view", "document:view", "document:download",
        "evidence:view", "ai:query",
    },
    RoleEnum.VIEWER: {
        "case:view", "document:view", "evidence:view",
    },
}


def has_permission(role: RoleEnum, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())
