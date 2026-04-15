"""
Engageneering™ — Auth Service
Handles all registration, login, OAuth, and email verification logic.
Called by the auth router. Never touched by ARIA agents.
"""
from __future__ import annotations
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from passlib.context import CryptContext
from jose import jwt, JWTError
from loguru import logger

from config import get_settings
from db.supabase import get_supabase_service
from models.user import (
    AuthProvider, AccountRole, AccountStatus,
    CreateIdentityPayload, CreateProfilePayload,
    RegistrationResponse, UserProfileResponse,
    AuthTokenResponse, TierState, IdentityResponse,
)

settings = get_settings()
db = get_supabase_service()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── PASSWORD UTILITIES ──────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


# ── TOKEN UTILITIES ─────────────────────────────────────────

def create_access_token(uid: str) -> Tuple[str, int]:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": uid, "exp": expire, "iss": "engageneering"}
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, settings.access_token_expire_minutes * 60


def decode_access_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        return payload.get("sub")
    except JWTError:
        return None


def generate_verification_token() -> str:
    return secrets.token_urlsafe(48)


# ── INTERNAL DB HELPERS ─────────────────────────────────────

def _fetch_identity(email: str) -> Optional[dict]:
    res = db.table("identity").select("*").eq("email", email).execute()
    return res.data[0] if res.data else None


def _fetch_profile(uid: str) -> Optional[dict]:
    res = db.table("user_profile").select("*").eq("uid", uid).execute()
    return res.data[0] if res.data else None


def _build_profile_response(profile: dict) -> UserProfileResponse:
    return UserProfileResponse(
        profile_id=profile["profile_id"],
        uid=profile["uid"],
        display_name=profile["display_name"],
        avatar_url=profile.get("avatar_url"),
        primary_role=profile["primary_role"],
        status=profile["status"],
        expertise_tags=profile.get("expertise_tags") or [],
        tier_state=TierState(
            seeker_tier=profile["seeker_tier"],
            seeker_pts=profile["seeker_pts"],
            answerer_tier=profile["answerer_tier"],
            answerer_pts=profile["answerer_pts"],
            is_engageneer=profile["is_engageneer"],
        ),
        aria_initialised=profile["aria_initialised"],
        joined_at=profile["joined_at"],
        last_active=profile["last_active"],
    )


# ── EMAIL + PASSWORD REGISTRATION ──────────────────────────

async def register_email_password(
    email: str,
    password: str,
    display_name: str,
    primary_role: AccountRole,
) -> RegistrationResponse:
    """
    1. Check duplicate email
    2. Write identity row (unverified)
    3. Write user_profile row
    4. Generate verification token
    5. Log verification attempt
    6. Send verification email (via Supabase email or SMTP)
    """
    logger.info(f"Registration attempt: {email} via email_password")

    # Duplicate check
    existing = _fetch_identity(email)
    if existing:
        raise ValueError("An account with this email already exists. Please log in.")

    password_hash = hash_password(password)
    token = generate_verification_token()
    token_expires = datetime.now(timezone.utc) + timedelta(
        minutes=settings.magic_link_expire_minutes
    )

    # Insert identity
    identity_row = db.table("identity").insert({
        "email":              email,
        "provider":           AuthProvider.email_password,
        "email_verified":     False,
        "verification_token": token,
        "token_expires_at":   token_expires.isoformat(),
        "password_hash":      password_hash,
    }).execute()

    if not identity_row.data:
        raise RuntimeError("Failed to create identity record.")

    uid = identity_row.data[0]["uid"]

    # Insert profile (pending verification)
    db.table("user_profile").insert({
        "uid":          uid,
        "display_name": display_name,
        "primary_role": primary_role,
        "status":       AccountStatus.pending_verification,
    }).execute()

    # Log verification attempt
    db.table("email_verification_log").insert({
        "uid":        uid,
        "email":      email,
        "token":      token,
        "expires_at": token_expires.isoformat(),
    }).execute()

    # Send verification email (Supabase handles this via Auth or use SMTP)
    await _send_verification_email(email, display_name, token)

    logger.success(f"Registered uid={uid} email={email} — verification email sent")

    return RegistrationResponse(
        uid=uid,
        email=email,
        status=AccountStatus.pending_verification,
        requires_verification=True,
        message="Account created. Please check your email to verify your address.",
    )


# ── EMAIL VERIFICATION ──────────────────────────────────────

async def verify_email(token: str) -> AuthTokenResponse:
    """
    1. Look up token in identity table
    2. Check not expired
    3. Mark identity as verified, clear token
    4. Activate profile
    5. Trigger ARIA initialisation
    6. Return access token
    """
    res = db.table("identity").select("*").eq(
        "verification_token", token
    ).execute()

    if not res.data:
        raise ValueError("Invalid or already-used verification token.")

    identity = res.data[0]

    # Check expiry
    expires_at = datetime.fromisoformat(identity["token_expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise ValueError("Verification link has expired. Please request a new one.")

    uid = identity["uid"]

    # Mark verified
    db.table("identity").update({
        "email_verified":     True,
        "verification_token": None,
        "token_expires_at":   None,
        "last_sign_in":       datetime.now(timezone.utc).isoformat(),
    }).eq("uid", uid).execute()

    # Mark verification log
    db.table("email_verification_log").update({
        "verified_at": datetime.now(timezone.utc).isoformat()
    }).eq("token", token).execute()

    # Activate profile
    db.table("user_profile").update({
        "status":      AccountStatus.active,
        "last_active": datetime.now(timezone.utc).isoformat(),
    }).eq("uid", uid).execute()

    # Trigger ARIA init
    await aria_initialise_user(uid)

    # Build token response
    profile = _fetch_profile(uid)
    access_token, expires_in = create_access_token(uid)

    logger.success(f"Email verified for uid={uid}")

    return AuthTokenResponse(
        access_token=access_token,
        expires_in=expires_in,
        uid=uid,
        profile=_build_profile_response(profile),
    )


# ── MAGIC LINK REGISTRATION / LOGIN ────────────────────────

async def send_magic_link(
    email: str,
    display_name: Optional[str],
    primary_role: AccountRole,
) -> RegistrationResponse:
    """
    If new user: create identity + profile then send link.
    If existing user: send login link.
    Token is single-use and expires in 24 hours.
    """
    existing = _fetch_identity(email)
    token = generate_verification_token()
    token_expires = datetime.now(timezone.utc) + timedelta(
        minutes=settings.magic_link_expire_minutes
    )
    is_new = existing is None

    if is_new:
        if not display_name:
            display_name = email.split("@")[0]

        identity_row = db.table("identity").insert({
            "email":              email,
            "provider":           AuthProvider.magic_link,
            "email_verified":     False,
            "verification_token": token,
            "token_expires_at":   token_expires.isoformat(),
        }).execute()

        uid = identity_row.data[0]["uid"]

        db.table("user_profile").insert({
            "uid":          uid,
            "display_name": display_name,
            "primary_role": primary_role,
            "status":       AccountStatus.pending_verification,
        }).execute()
    else:
        uid = existing["uid"]
        db.table("identity").update({
            "verification_token": token,
            "token_expires_at":   token_expires.isoformat(),
        }).eq("uid", uid).execute()

    db.table("email_verification_log").insert({
        "uid":        uid,
        "email":      email,
        "token":      token,
        "expires_at": token_expires.isoformat(),
    }).execute()

    await _send_magic_link_email(email, token, is_new=is_new)

    logger.info(f"Magic link sent to {email} (new={is_new})")

    return RegistrationResponse(
        uid=uid,
        email=email,
        status=AccountStatus.pending_verification if is_new else AccountStatus.active,
        requires_verification=True,
        message="Magic link sent. Check your email — the link expires in 24 hours.",
    )


# ── OAUTH REGISTRATION / LOGIN ──────────────────────────────

async def handle_oauth_callback(
    provider: AuthProvider,
    provider_id: str,
    email: str,
    display_name: str,
    avatar_url: Optional[str] = None,
    primary_role: AccountRole = AccountRole.both,
) -> AuthTokenResponse:
    """
    Called after OAuth provider returns. Supabase handles the OAuth
    redirect; we receive the verified user data and upsert.
    """
    existing = _fetch_identity(email)

    if existing:
        uid = existing["uid"]
        # Update last sign in and provider_id
        db.table("identity").update({
            "provider_id":  provider_id,
            "email_verified": True,
            "last_sign_in": datetime.now(timezone.utc).isoformat(),
        }).eq("uid", uid).execute()
        db.table("user_profile").update({
            "last_active": datetime.now(timezone.utc).isoformat(),
        }).eq("uid", uid).execute()
    else:
        # New OAuth user — verified immediately
        identity_row = db.table("identity").insert({
            "email":          email,
            "provider":       provider,
            "provider_id":    provider_id,
            "email_verified": True,
            "last_sign_in":   datetime.now(timezone.utc).isoformat(),
        }).execute()
        uid = identity_row.data[0]["uid"]

        db.table("user_profile").insert({
            "uid":          uid,
            "display_name": display_name,
            "avatar_url":   avatar_url,
            "primary_role": primary_role,
            "status":       AccountStatus.active,
        }).execute()

        # ARIA init for new OAuth users — immediate (no email verification needed)
        await aria_initialise_user(uid)

    # Log session
    db.table("session_log").insert({
        "uid":      uid,
        "provider": provider,
    }).execute()

    profile = _fetch_profile(uid)
    access_token, expires_in = create_access_token(uid)

    return AuthTokenResponse(
        access_token=access_token,
        expires_in=expires_in,
        uid=uid,
        profile=_build_profile_response(profile),
    )


# ── EMAIL + PASSWORD LOGIN ──────────────────────────────────

async def login_email_password(email: str, password: str) -> AuthTokenResponse:
    identity = _fetch_identity(email)

    if not identity or identity["provider"] != AuthProvider.email_password:
        raise ValueError("Invalid email or password.")
    if not verify_password(password, identity.get("password_hash", "")):
        raise ValueError("Invalid email or password.")
    if not identity["email_verified"]:
        raise ValueError("Email not yet verified. Please check your inbox.")

    uid = identity["uid"]
    db.table("identity").update({
        "last_sign_in": datetime.now(timezone.utc).isoformat()
    }).eq("uid", uid).execute()
    db.table("user_profile").update({
        "last_active": datetime.now(timezone.utc).isoformat()
    }).eq("uid", uid).execute()
    db.table("session_log").insert({
        "uid":      uid,
        "provider": AuthProvider.email_password,
    }).execute()

    profile = _fetch_profile(uid)
    access_token, expires_in = create_access_token(uid)

    return AuthTokenResponse(
        access_token=access_token,
        expires_in=expires_in,
        uid=uid,
        profile=_build_profile_response(profile),
    )


# ── ARIA INITIALISATION ─────────────────────────────────────

async def aria_initialise_user(uid: str) -> None:
    """
    Fires after a new user is verified and active.
    Sets up Smart Matcher index, Tier Engine state,
    and schedules the first Insight Narrator report.
    """
    logger.info(f"ARIA initialising uid={uid}")

    # Smart Matcher: tag index is already in profile — signal is implicit
    # Tier Engine: ensure tier_state is at defaults (already set at profile creation)
    # Insight Narrator: schedule next Sunday
    from datetime import date
    today = date.today()
    days_until_sunday = (6 - today.weekday()) % 7 or 7
    next_sunday = datetime.combine(
        today + timedelta(days=days_until_sunday),
        datetime.min.time()
    ).replace(tzinfo=timezone.utc)

    db.table("user_profile").update({
        "aria_initialised":         True,
        "insight_narrator_next":    next_sunday.isoformat(),
    }).eq("uid", uid).execute()

    db.table("aria_init_log").insert({
        "uid":                    uid,
        "smart_matcher_indexed":  True,
        "tier_state_created":     True,
        "insight_narrator_set":   True,
    }).execute()

    logger.success(f"ARIA init complete for uid={uid}")


# ── EMAIL SENDING STUBS ─────────────────────────────────────
# Wire these to SendGrid, Supabase email, or SMTP in production

async def _send_verification_email(email: str, name: str, token: str) -> None:
    verify_url = f"{settings.frontend_url}/verify?token={token}"
    logger.info(f"[EMAIL] Verification to {email} → {verify_url}")
    # TODO: replace with real SMTP / SendGrid call


async def _send_magic_link_email(email: str, token: str, is_new: bool) -> None:
    magic_url = f"{settings.frontend_url}/verify?token={token}"
    action = "complete your registration" if is_new else "sign in"
    logger.info(f"[EMAIL] Magic link to {email} to {action} → {magic_url}")
    # TODO: replace with real SMTP / SendGrid call
