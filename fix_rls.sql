-- ══════════════════════════════════════════════════
-- ENGAGENEERING™ — RLS POLICY FIX
-- Run this entire block in Supabase SQL Editor
-- This fixes the "profile not being created" issue
-- ══════════════════════════════════════════════════

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "profiles: insert own" ON profiles;
CREATE POLICY "profiles: insert own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own role
DROP POLICY IF EXISTS "profile_roles: insert own" ON profile_roles;
CREATE POLICY "profile_roles: insert own"
  ON profile_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow upsert on profile_roles (needed for first login)
DROP POLICY IF EXISTS "profile_roles: upsert own" ON profile_roles;
CREATE POLICY "profile_roles: upsert own"
  ON profile_roles FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow score_history insert from authenticated users
DROP POLICY IF EXISTS "score_history: insert own" ON score_history;
CREATE POLICY "score_history: insert own"
  ON score_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow notifications insert (system writes)
DROP POLICY IF EXISTS "notifications: insert own" ON notifications;
CREATE POLICY "notifications: insert own"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow tier_events insert (system writes)
DROP POLICY IF EXISTS "tier_events: insert own" ON tier_events;
CREATE POLICY "tier_events: insert own"
  ON tier_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Verify trigger exists for auto profile creation
-- If this returns 0 rows, the trigger is missing — re-run Block 11 from schema.sql
SELECT COUNT(*) as trigger_exists
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
