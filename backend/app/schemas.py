from datetime import datetime

from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str
    department: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    department: str
    status: str

    class Config:
        from_attributes = True


class CaseCreate(BaseModel):
    title: str
    description: str = ""
    fir_number: str = ""
    case_type: str = ""
    police_station: str = ""
    priority: str = "MEDIUM"


class CaseOut(BaseModel):
    id: str
    title: str
    description: str
    fir_number: str
    case_type: str
    police_station: str
    priority: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentOut(BaseModel):
    id: str
    case_id: str
    name: str
    type: str
    description: str
    mime_type: str
    size: int
    uploaded_by: str | None
    created_at: datetime
    current_version: int
    sha256_hash: str
    integrity_status: str
    classification: str
    digital_signature_status: str
    processing_status: str

    class Config:
        from_attributes = True


class AIQueryRequest(BaseModel):
    case_id: str
    question: str


class AIQueryResponse(BaseModel):
    answer: str
    confidence: int
    sources: list[dict]
