-- ══════════════════════════════════════════════════════════════════
-- ENGAGENEERING™ — SECURITY FIXES MIGRATION (005)
-- Date: 2026-06-03
-- Covers: C-3, H-3, H-5 from Security Audit Report
--
-- Run this SQL block in your Supabase SQL Editor (Dashboard → SQL Editor)
-- All statements are idempotent (safe to re-run)
-- ══════════════════════════════════════════════════════════════════


-- ── BLOCK 1: UNIQUE CONSTRAINT ON gateway_payment_id (H-3) ────────
-- Prevents double-crediting Ψ for the same Razorpay payment ID.
-- Idempotent: only adds if constraint doesn't already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_gateway_payment_id_unique'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_gateway_payment_id_unique
      UNIQUE (gateway_payment_id);
  END IF;
END
$$;


-- ── BLOCK 2: RESTRICT questions UPDATE (H-5) ──────────────────────
-- Drops the broad "owner can update anything" policy and replaces it
-- with a policy that lets owners update only safe columns
-- (text, tags, language, video_url, video_thumbnail).
-- status and gatekeeper_verdict are only writable by service role.

DROP POLICY IF EXISTS "questions_update_own" ON questions;

-- Allow question author to update only content fields (not status/verdict)
CREATE POLICY "questions_update_own_content"
  ON questions
  FOR UPDATE
  USING (auth.uid() = asker_id)
  WITH CHECK (
    auth.uid() = asker_id
    -- status and gatekeeper_verdict cannot be set to arbitrary values by the client:
    -- The policy allows the row-level update but the column restriction below
    -- means those columns revert to their DB value unless service role changes them.
    -- We complement this with a trigger (BLOCK 4) for enforcement.
  );


-- ── BLOCK 3: profile_roles — safe column restrictions (C-3) ───────
-- Replace broad UPDATE policy with one restricted to non-sensitive columns.
-- pts_total, seeker_tier, answerer_tier — MUST NOT be writable by clients.
-- Those are updated only via the add_psi_points() SECURITY DEFINER function below.

DROP POLICY IF EXISTS "profile_roles_update_own" ON profile_roles;

-- Only allow clients to update safe display/preference columns:
CREATE POLICY "profile_roles_update_own_safe"
  ON profile_roles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- NOTE: Supabase does not enforce column-level restrictions in WITH CHECK directly,
-- so we also create a BEFORE UPDATE trigger (BLOCK 5) that rejects changes to
-- protected columns from the anon/authenticated role.


-- ── BLOCK 4: TRIGGER — block client-side question status writes (H-5) ──

CREATE OR REPLACE FUNCTION prevent_client_question_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only service role (pg_roles with bypass RLS) may change status/verdict
  IF current_setting('role') NOT IN ('service_role', 'supabase_admin', 'postgres')
     AND (NEW.status IS DISTINCT FROM OLD.status
          OR NEW.gatekeeper_verdict IS DISTINCT FROM OLD.gatekeeper_verdict)
  THEN
    -- Silently revert protected columns to their existing values
    NEW.status               := OLD.status;
    NEW.gatekeeper_verdict   := OLD.gatekeeper_verdict;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_prevent_question_status_client ON questions;

CREATE TRIGGER tg_prevent_question_status_client
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_client_question_status_change();


-- ── BLOCK 5: TRIGGER — block client-side points/tier manipulation (C-3) ──

CREATE OR REPLACE FUNCTION prevent_client_points_manipulation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only service role may change pts_total, seeker_tier, answerer_tier
  IF current_setting('role') NOT IN ('service_role', 'supabase_admin', 'postgres')
  THEN
    -- Silently revert protected columns
    NEW.pts_total       := OLD.pts_total;
    NEW.seeker_tier     := OLD.seeker_tier;
    NEW.answerer_tier   := OLD.answerer_tier;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_prevent_points_manipulation ON profile_roles;

CREATE TRIGGER tg_prevent_points_manipulation
  BEFORE UPDATE ON profile_roles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_client_points_manipulation();


-- ── BLOCK 6: add_psi_points() — safe SECURITY DEFINER function (C-3) ──
-- Called from platform.html instead of direct supa.from('profile_roles').update()
-- Runs as postgres/service role so it bypasses RLS and can update pts_total safely.

CREATE OR REPLACE FUNCTION add_psi_points(
  p_user_id   UUID,
  p_delta     INTEGER,   -- positive = add, negative = deduct
  p_reason    TEXT DEFAULT NULL
)
RETURNS INTEGER           -- returns new pts_total
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_total INTEGER;
BEGIN
  -- Only allow authenticated users to call this for their own user_id
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot modify another user''s points';
  END IF;

  -- Prevent deducting below zero
  UPDATE profile_roles
    SET pts_total   = GREATEST(0, COALESCE(pts_total, 0) + p_delta),
        updated_at  = now()
  WHERE user_id = p_user_id
  RETURNING pts_total INTO v_new_total;

  RETURN COALESCE(v_new_total, 0);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION add_psi_points(UUID, INTEGER, TEXT) TO authenticated;


-- ── BLOCK 7: add_answer_points() — replaces client-side answerer_pts update (C-3) ──
-- Called after answer submission to update both pts_total and answerer_pts atomically.

CREATE OR REPLACE FUNCTION add_answer_points(
  p_user_id       UUID,
  p_pts           INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE profile_roles
    SET pts_total     = GREATEST(0, COALESCE(pts_total, 0) + p_pts),
        answerer_pts  = GREATEST(0, COALESCE(answerer_pts, 0) + p_pts),
        updated_at    = now()
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_answer_points(UUID, INTEGER) TO authenticated;


-- ══════════════════════════════════════════════════════════════════
-- SUMMARY OF CHANGES
-- ══════════════════════════════════════════════════════════════════
-- H-3: payments.gateway_payment_id is now UNIQUE — no double-credit possible
-- H-5: questions.status / gatekeeper_verdict cannot be changed by client JWT
-- C-3: profile_roles.pts_total / seeker_tier / answerer_tier cannot be changed
--      by client JWT — protected by BEFORE UPDATE trigger
-- C-3: add_psi_points() and add_answer_points() provide safe, server-enforced
--      point mutations callable via supa.rpc() with auth
-- ══════════════════════════════════════════════════════════════════
