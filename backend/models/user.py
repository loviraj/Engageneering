"""
Engageneering™ — User & Identity models
Request/response schemas — validated by Pydantic v2
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


# ── ENUMS ──────────────────────────────────────────────────

class AuthProvider(str, Enum):
    google         = "google"
    linkedin       = "linkedin"
    magic_link     = "magic_link"
    email_password = "email_password"


class AccountRole(str, Enum):
    seeker      = "seeker"
    answerer    = "answerer"
    both        = "both"
    institution = "institution"


class AccountStatus(str, Enum):
    pending_verification = "pending_verification"
    active               = "active"
    suspended            = "suspended"
    deactivated          = "deactivated"


# ── REQUEST SCHEMAS ─────────────────────────────────────────

class EmailPasswordRegisterRequest(BaseModel):
    email:        EmailStr
    password:     str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=2, max_length=80)
    primary_role: AccountRole = AccountRole.both

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit.")
        return v

    @field_validator("display_name")
    @classmethod
    def no_html(cls, v: str) -> str:
        if re.search(r"[<>\"']", v):
            raise ValueError("Display name contains invalid characters.")
        return v.strip()


class MagicLinkRequest(BaseModel):
    email:        EmailStr
    display_name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    primary_role: AccountRole = AccountRole.both


class OAuthCallbackRequest(BaseModel):
    provider: AuthProvider
    code:     str
    state:    Optional[str] = None


class EmailLoginRequest(BaseModel):
    email:    EmailStr
    password: str


class ExpertiseUpdateRequest(BaseModel):
    tags: List[str] = Field(min_length=1, max_items=20)

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: List[str]) -> List[str]:
        cleaned = [t.strip() for t in v if t.strip()]
        if len(cleaned) < 1:
            raise ValueError("At least one expertise tag is required.")
        return cleaned


class RoleUpdateRequest(BaseModel):
    primary_role:    AccountRole
    institution_name: Optional[str] = None


class VerifyEmailRequest(BaseModel):
    token: str


# ── RESPONSE SCHEMAS ────────────────────────────────────────

class IdentityResponse(BaseModel):
    uid:            str
    email:          str
    provider:       AuthProvider
    email_verified: bool
    created_at:     datetime


class TierState(BaseModel):
    seeker_tier:   int
    seeker_pts:    int
    answerer_tier: int
    answerer_pts:  int
    is_engageneer: bool


class UserProfileResponse(BaseModel):
    profile_id:      str
    uid:             str
    display_name:    str
    avatar_url:      Optional[str]
    primary_role:    AccountRole
    status:          AccountStatus
    expertise_tags:  List[str]
    tier_state:      TierState
    aria_initialised: bool
    joined_at:       datetime
    last_active:     datetime


class AuthTokenResponse(BaseModel):
    access_token:  str
    token_type:    str = "bearer"
    expires_in:    int
    uid:           str
    profile:       UserProfileResponse


class RegistrationResponse(BaseModel):
    uid:            str
    email:          str
    status:         AccountStatus
    requires_verification: bool
    message:        str


class ARIAInitResponse(BaseModel):
    uid:                    str
    smart_matcher_indexed:  bool
    tier_state_created:     bool
    insight_narrator_set:   bool
    initialised_at:         datetime


# ── INTERNAL SCHEMAS (not exposed via API) ──────────────────

class CreateIdentityPayload(BaseModel):
    email:         str
    provider:      AuthProvider
    provider_id:   Optional[str] = None
    password_hash: Optional[str] = None
    display_name:  str
    primary_role:  AccountRole


class CreateProfilePayload(BaseModel):
    uid:             str
    display_name:    str
    primary_role:    AccountRole
    expertise_tags:  List[str] = []
    institution_name: Optional[str] = None
