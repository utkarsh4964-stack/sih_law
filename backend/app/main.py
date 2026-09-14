import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import ai, audit, auth, case_intel, cases, documents, security_center
from app.database import Base, engine
from app.config import settings

Base.metadata.create_all(bind=engine)

if os.getenv("ENVIRONMENT", "development").lower() in {"production", "prod"} and (not settings.JWT_SECRET or len(settings.JWT_SECRET) < 32):
    raise RuntimeError("JWT_SECRET must be configured with at least 32 characters in production")

app = FastAPI(
    title="LAW1 — Secure Digital Evidence & Legal Document Management System",
    description="SIH26190: Secure Digital Document Management System for Legal and Investigation Documents",
    version="0.2.0-security-hardened",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Never expose stack traces to users.
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/")
def root():
    return {
        "product": "LAW1",
        "tagline": "Secure Evidence. Intelligent Investigation. Complete Accountability.",
        "status": "operational",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(documents.router)
app.include_router(audit.router)
app.include_router(security_center.router)
app.include_router(ai.router)
app.include_router(case_intel.router)
