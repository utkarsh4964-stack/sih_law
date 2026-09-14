from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RoleEnum, User
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.security.auth import create_access_token, hash_password, verify_password
from app.security.deps import get_current_user, require_permission
from app.services.audit import log_event

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut)
def register(
    payload: RegisterRequest,
    actor: User = Depends(require_permission("user:manage")),
    db: Session = Depends(get_db),
):
    """Create an account through an authorized administrator only.

    Public self-registration is intentionally disabled because role selection is
    security-sensitive in an evidence-management system.
    """
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if payload.role not in RoleEnum.__members__:
        raise HTTPException(status_code=422, detail="Invalid role")
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=RoleEnum(payload.role),
        department=payload.department,
        status="ACTIVE",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_event(db, actor.id, "USER_CREATED", "user", user.id, status="SUCCESS",
              description=f"Created {user.email} with role {user.role.value}")
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        log_event(db, None, "LOGIN", "user", payload.email, status="FAILED",
                   description="Invalid credentials")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="Account is not active")
    user.last_login = datetime.utcnow()
    db.commit()
    token = create_access_token(user.id, user.role.value)
    log_event(db, user.id, "LOGIN", "user", user.id, status="SUCCESS")
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "name": user.name, "email": user.email, "role": user.role.value},
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
