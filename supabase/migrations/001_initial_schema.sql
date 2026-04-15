-- ============================================================
-- Engageneering™ — Initial Schema v1
-- Migration: 001_initial_schema.sql
-- DB: Supabase (PostgreSQL 15)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE auth_provider AS ENUM (
    'google',
    'linkedin',
    'magic_link',
    'email_password'
);

CREATE TYPE account_role AS ENUM (
    'seeker',
    'answerer',
    'both',
    'institution'
);

CREATE TYPE account_status AS ENUM (
    'pending_verification',
    'active',
    'suspended',
    'deactivated'
);

CREATE TYPE tier_track AS ENUM (
    'seeker',
    'answerer'
);

-- ============================================================
-- IDENTITY TABLE
-- Stores auth credentials and provider links
-- One row per unique identity (uid = Supabase auth.users.id)
-- ============================================================

CREATE TABLE identity (
    uid                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               TEXT NOT NULL UNIQUE,
    provider            auth_provider NOT NULL,
    provider_id         TEXT,                        -- external OAuth sub/id
    email_verified      BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token  TEXT,                        -- for magic link / email verify
    token_expires_at    TIMESTAMPTZ,
    password_hash       TEXT,                        -- NULL for OAuth providers
    last_sign_in        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE UNIQUE INDEX idx_identity_email ON identity(email);
CREATE INDEX idx_identity_provider ON identity(provider, provider_id);
CREATE INDEX idx_identity_token ON identity(verification_token) WHERE verification_token IS NOT NULL;

-- ============================================================
-- USER PROFILE TABLE
-- Stores public-facing profile data, roles, tiers, expertise
-- ============================================================

CREATE TABLE user_profile (
    profile_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uid                 UUID NOT NULL REFERENCES identity(uid) ON DELETE CASCADE,

    -- Display
    display_name        TEXT NOT NULL,
    avatar_url          TEXT,
    bio                 TEXT,
    location            TEXT,
    institution_name    TEXT,                        -- for institution accounts

    -- Role & status
    primary_role        account_role NOT NULL DEFAULT 'both',
    status              account_status NOT NULL DEFAULT 'pending_verification',

    -- Expertise (JSONB array of tag strings)
    expertise_tags      JSONB NOT NULL DEFAULT '[]',

    -- Tier state — Seeker track
    seeker_tier         INTEGER NOT NULL DEFAULT 1 CHECK (seeker_tier BETWEEN 1 AND 5),
    seeker_pts          INTEGER NOT NULL DEFAULT 0,
    seeker_promoted_at  TIMESTAMPTZ,

    -- Tier state — Answerer track
    answerer_tier       INTEGER NOT NULL DEFAULT 1 CHECK (answerer_tier BETWEEN 1 AND 5),
    answerer_pts        INTEGER NOT NULL DEFAULT 0,
    answerer_promoted_at TIMESTAMPTZ,

    -- Engageneer™ status
    is_engageneer       BOOLEAN NOT NULL DEFAULT FALSE,
    engageneer_awarded_at TIMESTAMPTZ,

    -- ARIA state
    aria_initialised    BOOLEAN NOT NULL DEFAULT FALSE,
    insight_narrator_next TIMESTAMPTZ,             -- next scheduled report

    -- Metadata
    joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE UNIQUE INDEX idx_profile_uid ON user_profile(uid);
CREATE INDEX idx_profile_role ON user_profile(primary_role);
CREATE INDEX idx_profile_status ON user_profile(status);
CREATE INDEX idx_profile_seeker_tier ON user_profile(seeker_tier);
CREATE INDEX idx_profile_answerer_tier ON user_profile(answerer_tier);
CREATE INDEX idx_profile_expertise ON user_profile USING gin(expertise_tags);

-- ============================================================
-- ORGANISATION TABLE
-- For institution accounts — maps org to admin and members
-- ============================================================

CREATE TABLE organisation (
    org_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_uid           UUID NOT NULL REFERENCES identity(uid) ON DELETE RESTRICT,
    org_name            TEXT NOT NULL,
    domain              TEXT,                        -- e.g. "school.edu"
    team_size           INTEGER,
    use_case            TEXT,
    plan                TEXT NOT NULL DEFAULT 'free',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE org_member (
    org_id              UUID NOT NULL REFERENCES organisation(org_id) ON DELETE CASCADE,
    uid                 UUID NOT NULL REFERENCES identity(uid) ON DELETE CASCADE,
    joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (org_id, uid)
);

-- ============================================================
-- EMAIL VERIFICATION LOG
-- Audit trail of all verification attempts
-- ============================================================

CREATE TABLE email_verification_log (
    log_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uid                 UUID NOT NULL REFERENCES identity(uid) ON DELETE CASCADE,
    email               TEXT NOT NULL,
    token               TEXT NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    verified_at         TIMESTAMPTZ,
    ip_address          INET,
    user_agent          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evl_uid ON email_verification_log(uid);
CREATE INDEX idx_evl_token ON email_verification_log(token);

-- ============================================================
-- SESSION LOG
-- Lightweight audit trail of sign-ins
-- ============================================================

CREATE TABLE session_log (
    session_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uid                 UUID NOT NULL REFERENCES identity(uid) ON DELETE CASCADE,
    provider            auth_provider NOT NULL,
    ip_address          INET,
    user_agent          TEXT,
    signed_in_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_uid ON session_log(uid);

-- ============================================================
-- TIER HISTORY
-- Immutable audit trail of every tier change
-- ============================================================

CREATE TABLE tier_history (
    event_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uid                 UUID NOT NULL REFERENCES identity(uid) ON DELETE CASCADE,
    track               tier_track NOT NULL,
    from_tier           INTEGER NOT NULL,
    to_tier             INTEGER NOT NULL,
    trigger_score       NUMERIC(5,2),               -- CDS that triggered the change
    aria_evidence       JSONB,                      -- full audit payload from ARIA
    promoted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tier_history_uid ON tier_history(uid);
CREATE INDEX idx_tier_history_track ON tier_history(track);

-- ============================================================
-- ARIA INITIALISATION LOG
-- Records when ARIA sets up each new user
-- ============================================================

CREATE TABLE aria_init_log (
    log_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uid                 UUID NOT NULL REFERENCES identity(uid) ON DELETE CASCADE,
    smart_matcher_indexed   BOOLEAN NOT NULL DEFAULT FALSE,
    tier_state_created      BOOLEAN NOT NULL DEFAULT FALSE,
    insight_narrator_set    BOOLEAN NOT NULL DEFAULT FALSE,
    initialised_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_aria_init_uid ON aria_init_log(uid);

-- ============================================================
-- ROW LEVEL SECURITY
-- Users can only read/write their own data
-- ============================================================

ALTER TABLE identity             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile         ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE aria_init_log        ENABLE ROW LEVEL SECURITY;

-- Identity: own row only
CREATE POLICY identity_self ON identity
    FOR ALL USING (uid = auth.uid());

-- Profile: own row for write; all active profiles readable (for leaderboard etc.)
CREATE POLICY profile_self_write ON user_profile
    FOR ALL USING (uid = auth.uid());

CREATE POLICY profile_public_read ON user_profile
    FOR SELECT USING (status = 'active');

-- Logs: own rows only
CREATE POLICY evl_self ON email_verification_log
    FOR ALL USING (uid = auth.uid());

CREATE POLICY session_self ON session_log
    FOR ALL USING (uid = auth.uid());

CREATE POLICY tier_self ON tier_history
    FOR ALL USING (uid = auth.uid());

CREATE POLICY aria_self ON aria_init_log
    FOR ALL USING (uid = auth.uid());

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_identity_updated
    BEFORE UPDATE ON identity
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profile_updated
    BEFORE UPDATE ON user_profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_org_updated
    BEFORE UPDATE ON organisation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
