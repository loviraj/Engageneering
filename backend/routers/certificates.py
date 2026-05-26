"""
Engageneering™ — Certificates Router
Endpoints:
  GET  /api/v1/certificates/public/{cert_id}  — public: verify any cert by ENG-XXXX-XXXXXXXX
  GET  /api/v1/certificates/me                — get all certs for a user (by user_id query param)
  GET  /api/v1/certificates/cluster/{slug}    — list all certs for a cluster
  POST /api/v1/certificates/check-and-issue   — auto-issue if first contribution
  POST /api/v1/certificates/issue             — manual issue (admin/service)
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import re

from slowapi import Limiter
from slowapi.util import get_remote_address

from db.supabase import get_supabase_service

router  = APIRouter(prefix="/certificates", tags=["Certificates"])
limiter = Limiter(key_func=get_remote_address)


# ══════════════════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════════════════

class IssueRequest(BaseModel):
    user_id:        str
    cluster_slug:   str   # e.g. "computational-thinking"
    cluster_label:  str   # e.g. "Computational Thinking"
    trigger_type:   str   # "question" | "answer" | "contribution" | "manual"
    trigger_ref_id: Optional[str] = None


class CheckAndIssueRequest(BaseModel):
    user_id:        str
    cluster_slug:   str
    cluster_label:  str
    trigger_type:   str   # "question" | "answer"
    trigger_ref_id: Optional[str] = None


class CertificateOut(BaseModel):
    id:             str
    user_id:        str
    display_name:   str
    avatar_url:     Optional[str] = None
    cluster_slug:   str
    cluster_label:  str
    cert_title:     str
    cert_type:      str
    cert_id:        str
    verify_url:     str
    status:         str
    issued_at:      str
    expires_at:     Optional[str] = None
    trigger_type:   str
    trigger_ref_id: Optional[str] = None


# ══════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════

CERT_ID_RE = re.compile(r"^ENG-[A-Z0-9]{4}-[A-Z0-9]{8}$")


def _row_to_cert(row: dict) -> CertificateOut:
    return CertificateOut(
        id             = str(row["id"]),
        user_id        = str(row["user_id"]),
        display_name   = row["display_name"],
        avatar_url     = row.get("avatar_url"),
        cluster_slug   = row["cluster_slug"],
        cluster_label  = row["cluster_label"],
        cert_title     = row["cert_title"],
        cert_type      = row["cert_type"],
        cert_id        = row["cert_id"],
        verify_url     = row["verify_url"],
        status         = row["status"],
        issued_at      = str(row["issued_at"]),
        expires_at     = str(row["expires_at"]) if row.get("expires_at") else None,
        trigger_type   = row["trigger_type"],
        trigger_ref_id = str(row["trigger_ref_id"]) if row.get("trigger_ref_id") else None,
    )


# ══════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════

@router.get("/public/{cert_id}", response_model=CertificateOut, summary="Publicly verify a certificate")
@limiter.limit("120/minute")
async def verify_certificate(cert_id: str, request: Request):
    """
    Public endpoint — no auth required.
    Used by verify.html to look up a cert by its human-friendly ID.
    """
    cert_id_upper = cert_id.strip().upper()
    if not CERT_ID_RE.match(cert_id_upper):
        raise HTTPException(
            status_code=400,
            detail="Invalid certificate ID format. Expected: ENG-XXXX-XXXXXXXX"
        )

    supa = get_supabase_service()
    res  = (
        supa.table("certificates")
        .select("*")
        .eq("cert_id", cert_id_upper)
        .limit(1)
        .execute()
    )

    if not res.data:
        raise HTTPException(status_code=404, detail="Certificate not found or has been revoked.")

    row = res.data[0]
    if row.get("status") == "revoked":
        raise HTTPException(
            status_code=410,
            detail=f"Certificate has been revoked. Reason: {row.get('revoke_reason', 'N/A')}"
        )

    return _row_to_cert(row)


@router.get("/me", response_model=list[CertificateOut], summary="Get all certs for a user")
@limiter.limit("30/minute")
async def get_my_certificates(user_id: str, request: Request):
    """
    Returns all certificates (active + revoked) for a given user_id.
    Pass user_id as a query param: /me?user_id=<uuid>
    """
    supa = get_supabase_service()
    res  = (
        supa.table("certificates")
        .select("*")
        .eq("user_id", user_id)
        .order("issued_at", desc=True)
        .execute()
    )
    return [_row_to_cert(r) for r in (res.data or [])]


@router.get("/cluster/{cluster_slug}", response_model=list[CertificateOut], summary="List certs by cluster")
@limiter.limit("30/minute")
async def get_cluster_certificates(cluster_slug: str, request: Request, limit: int = 50):
    """
    Returns all active certificates for a given cluster — useful for leaderboards.
    """
    supa = get_supabase_service()
    res  = (
        supa.table("certificates")
        .select("*")
        .eq("cluster_slug", cluster_slug)
        .eq("status", "active")
        .order("issued_at", desc=True)
        .limit(min(limit, 200))
        .execute()
    )
    return [_row_to_cert(r) for r in (res.data or [])]


@router.post("/check-and-issue", response_model=Optional[CertificateOut], summary="Auto-issue on first contribution")
@limiter.limit("30/minute")
async def check_and_issue(body: CheckAndIssueRequest, request: Request):
    """
    Called by the frontend after a user successfully posts a question or answer.
    Issues a certificate if this is the user's first contribution to this cluster.
    The Postgres function award_cluster_certificate is idempotent.
    """
    supa = get_supabase_service()

    res = supa.rpc("award_cluster_certificate", {
        "p_user_id":       body.user_id,
        "p_cluster_slug":  body.cluster_slug,
        "p_cluster_label": body.cluster_label,
        "p_trigger_type":  body.trigger_type,
        "p_trigger_ref":   body.trigger_ref_id,
    }).execute()

    new_cert_uuid = res.data
    if not new_cert_uuid:
        # Already certified — return null (frontend ignores this gracefully)
        return None

    cert_res = (
        supa.table("certificates")
        .select("*")
        .eq("id", new_cert_uuid)
        .limit(1)
        .execute()
    )
    if not cert_res.data:
        return None

    return _row_to_cert(cert_res.data[0])


@router.post("/issue", response_model=CertificateOut, summary="Manually issue a certificate")
@limiter.limit("10/minute")
async def issue_certificate(body: IssueRequest, request: Request):
    """
    Admin/service endpoint — issues a certificate directly.
    """
    supa = get_supabase_service()

    res = supa.rpc("award_cluster_certificate", {
        "p_user_id":       body.user_id,
        "p_cluster_slug":  body.cluster_slug,
        "p_cluster_label": body.cluster_label,
        "p_trigger_type":  body.trigger_type,
        "p_trigger_ref":   body.trigger_ref_id,
    }).execute()

    if not res.data:
        raise HTTPException(
            status_code=409,
            detail="Certificate already issued for this user and cluster, or user not found."
        )

    cert_res = (
        supa.table("certificates")
        .select("*")
        .eq("id", res.data)
        .limit(1)
        .execute()
    )
    if not cert_res.data:
        raise HTTPException(status_code=500, detail="Certificate issued but could not be retrieved.")

    return _row_to_cert(cert_res.data[0])
