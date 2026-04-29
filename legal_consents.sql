-- ══════════════════════════════════════════════════════════════
-- Engageneering™ — Legal Consent Records
-- Run in: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Create the legal_consents table
CREATE TABLE IF NOT EXISTS public.legal_consents (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version   text NOT NULL DEFAULT '1.0',
  accepted_at     timestamptz NOT NULL DEFAULT now(),
  user_agent      text,
  screen_res      text,
  chk_terms       boolean NOT NULL DEFAULT false,
  chk_disclaimer  boolean NOT NULL DEFAULT false,
  chk_yom         boolean NOT NULL DEFAULT false,
  -- IP is captured server-side via Supabase Edge Function if needed
  -- For client-side recording, we store what's available
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_legal_consents_user_id
  ON public.legal_consents(user_id);

-- Index for audit queries by date
CREATE INDEX IF NOT EXISTS idx_legal_consents_accepted_at
  ON public.legal_consents(accepted_at);

-- RLS: users can insert their own consent, admins can read all
ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;

-- Users can insert their own consent record
CREATE POLICY "Users can insert own consent"
  ON public.legal_consents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own consent records
CREATE POLICY "Users can view own consent"
  ON public.legal_consents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role (backend/admin) can read all records
-- This is automatic via service_role key — no policy needed

-- ══════════════════════════════════════════════════════════════
-- Verify: query all consents (run as service_role)
-- SELECT * FROM legal_consents ORDER BY accepted_at DESC;
--
-- Query specific user:
-- SELECT * FROM legal_consents WHERE user_id = '<uuid>';
--
-- Audit count by version:
-- SELECT terms_version, COUNT(*) FROM legal_consents GROUP BY 1;
-- ══════════════════════════════════════════════════════════════
