"""
Engageneering™ — Auth Router
All /auth/* endpoints for registration, login, OAuth, and verification.
"""
from fastapi import APIRouter, HTTPException, Request, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from loguru import logger

from models.user import (
    EmailPasswordRegisterRequest,
    MagicLinkRequest,
    EmailLoginRequest,
    VerifyEmailRequest,
    ExpertiseUpdateRequest,
    RoleUpdateRequest,
    RegistrationResponse,
    AuthTokenResponse,
    UserProfileResponse,
)
from services.auth_service import (
    register_email_password,
    verify_email,
    send_magic_link,
    login_email_password,
    decode_access_token,
    _fetch_profile,
    _build_profile_response,
)
from db.supabase import get_supabase_service

router = APIRouter(prefix="/auth", tags=["Authentication"])
bearer = HTTPBearer()
db = get_supabase_service()


# ── AUTH DEPENDENCY ─────────────────────────────────────────

async def get_current_uid(
    credentials: HTTPAuthorizationCredentials = Depends(bearer)
) -> str:
    uid = decode_access_token(credentials.credentials)
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )
    return uid


# ── REGISTER: email + password ──────────────────────────────

@router.post(
    "/register/email",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register with email and password",
)
async def register_email(body: EmailPasswordRegisterRequest):
    """
    Creates a new identity and profile record.
    Sends a verification email. Account is pending until email is verified.
    """
    try:
        return await register_email_password(
            email=body.email,
            password=body.password,
            display_name=body.display_name,
            primary_role=body.primary_role,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")


# ── REGISTER / LOGIN: magic link ────────────────────────────

@router.post(
    "/magic-link",
    response_model=RegistrationResponse,
    summary="Send magic link for registration or login",
)
async def magic_link(body: MagicLinkRequest):
    """
    Sends a magic link to the email address.
    Creates a new account if the email is not yet registered.
    """
    try:
        return await send_magic_link(
            email=body.email,
            display_name=body.display_name,
            primary_role=body.primary_role,
        )
    except Exception as e:
        logger.error(f"Magic link error: {e}")
        raise HTTPException(status_code=500, detail="Could not send magic link.")


# ── VERIFY EMAIL ────────────────────────────────────────────

@router.post(
    "/verify-email",
    response_model=AuthTokenResponse,
    summary="Verify email address using token",
)
async def verify_email_endpoint(body: VerifyEmailRequest):
    """
    Accepts the token from the verification email or magic link.
    On success: activates the account, triggers ARIA init, returns access token.
    """
    try:
        return await verify_email(body.token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Verify email error: {e}")
        raise HTTPException(status_code=500, detail="Verification failed.")


# ── LOGIN: email + password ─────────────────────────────────

@router.post(
    "/login/email",
    response_model=AuthTokenResponse,
    summary="Log in with email and password",
)
async def login_email(body: EmailLoginRequest):
    try:
        return await login_email_password(body.email, body.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed.")


# ── OAuth: Google / LinkedIn ────────────────────────────────
# In production, Supabase handles the OAuth redirect.
# These endpoints receive the already-verified user data
# from the Supabase client SDK on the frontend.

@router.post(
    "/oauth/callback",
    response_model=AuthTokenResponse,
    summary="Handle OAuth callback (Google or LinkedIn)",
)
async def oauth_callback(
    provider: str,
    access_token: str,          # Supabase session token from frontend
):
    """
    The frontend uses the Supabase JS client for OAuth.
    Once authenticated, the frontend sends the Supabase session here
    to get a platform-level JWT and trigger ARIA init if first login.
    """
    from services.auth_service import handle_oauth_callback, AuthProvider
    # Verify the Supabase token and extract user data
    try:
        supabase = get_supabase_service()
        user_res = supabase.auth.get_user(access_token)
        user = user_res.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid OAuth session.")

        provider_enum = AuthProvider(provider)

        return await handle_oauth_callback(
            provider=provider_enum,
            provider_id=user.id,
            email=user.email,
            display_name=user.user_metadata.get("full_name", user.email.split("@")[0]),
            avatar_url=user.user_metadata.get("avatar_url"),
        )
    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        raise HTTPException(status_code=500, detail="OAuth authentication failed.")


# ── PROFILE: get current user ───────────────────────────────

@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Get current user profile",
)
async def get_me(uid: str = Depends(get_current_uid)):
    profile = _fetch_profile(uid)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return _build_profile_response(profile)


# ── PROFILE: update role ────────────────────────────────────

@router.patch(
    "/me/role",
    response_model=UserProfileResponse,
    summary="Update primary role (Seeker / Answerer / Both / Institution)",
)
async def update_role(body: RoleUpdateRequest, uid: str = Depends(get_current_uid)):
    update_data = {"primary_role": body.primary_role}
    if body.institution_name:
        update_data["institution_name"] = body.institution_name
    db.table("user_profile").update(update_data).eq("uid", uid).execute()
    profile = _fetch_profile(uid)
    return _build_profile_response(profile)


# ── PROFILE: update expertise tags ─────────────────────────

@router.patch(
    "/me/expertise",
    response_model=UserProfileResponse,
    summary="Update expertise tags (used by Smart Matcher)",
)
async def update_expertise(
    body: ExpertiseUpdateRequest, uid: str = Depends(get_current_uid)
):
    import json
    db.table("user_profile").update({
        "expertise_tags": json.dumps(body.tags)
    }).eq("uid", uid).execute()
    profile = _fetch_profile(uid)
    return _build_profile_response(profile)
