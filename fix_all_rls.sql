-- ══════════════════════════════════════════════════════
-- ENGAGENEERING™ — COMPLETE RLS FIX
-- Run each BLOCK separately in Supabase SQL Editor
-- ══════════════════════════════════════════════════════

-- ══ BLOCK 1: DROP ALL EXISTING POLICIES ══════════════
DROP POLICY IF EXISTS "profiles: public read" ON profiles;
DROP POLICY IF EXISTS "profiles: owner update" ON profiles;
DROP POLICY IF EXISTS "profiles: insert own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

DROP POLICY IF EXISTS "profile_roles: owner read" ON profile_roles;
DROP POLICY IF EXISTS "profile_roles: owner update" ON profile_roles;
DROP POLICY IF EXISTS "profile_roles: insert own" ON profile_roles;
DROP POLICY IF EXISTS "profile_roles: upsert own" ON profile_roles;
DROP POLICY IF EXISTS "profile_roles: system insert" ON profile_roles;
DROP POLICY IF EXISTS "profile_roles_select_own" ON profile_roles;
DROP POLICY IF EXISTS "profile_roles_insert_own" ON profile_roles;
DROP POLICY IF EXISTS "profile_roles_update_own" ON profile_roles;

DROP POLICY IF EXISTS "questions: public read published" ON questions;
DROP POLICY IF EXISTS "questions: owner insert" ON questions;
DROP POLICY IF EXISTS "questions: owner update" ON questions;
DROP POLICY IF EXISTS "questions_select_published" ON questions;
DROP POLICY IF EXISTS "questions_insert_own" ON questions;
DROP POLICY IF EXISTS "questions_update_own" ON questions;

DROP POLICY IF EXISTS "answers: public read published" ON answers;
DROP POLICY IF EXISTS "answers: owner insert" ON answers;
DROP POLICY IF EXISTS "answers: owner update" ON answers;
DROP POLICY IF EXISTS "answers_select_published" ON answers;
DROP POLICY IF EXISTS "answers_insert_own" ON answers;
DROP POLICY IF EXISTS "answers_update_own" ON answers;

DROP POLICY IF EXISTS "score_history: owner read" ON score_history;
DROP POLICY IF EXISTS "score_history: insert own" ON score_history;
DROP POLICY IF EXISTS "score_history_select_own" ON score_history;
DROP POLICY IF EXISTS "score_history_insert_own" ON score_history;

DROP POLICY IF EXISTS "tier_events: owner read" ON tier_events;
DROP POLICY IF EXISTS "tier_events: insert own" ON tier_events;
DROP POLICY IF EXISTS "tier_events_select_own" ON tier_events;
DROP POLICY IF EXISTS "tier_events_insert_own" ON tier_events;

DROP POLICY IF EXISTS "insight_reports: owner read" ON insight_reports;
DROP POLICY IF EXISTS "insight_reports_select_own" ON insight_reports;
DROP POLICY IF EXISTS "insight_reports_insert_own" ON insight_reports;
DROP POLICY IF EXISTS "insight_reports_upsert_own" ON insight_reports;

DROP POLICY IF EXISTS "notifications: owner read" ON notifications;
DROP POLICY IF EXISTS "notifications: owner update" ON notifications;
DROP POLICY IF EXISTS "notifications: insert own" ON notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;

-- ══ BLOCK 2: PROFILES ════════════════════════════════
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- ══ BLOCK 3: PROFILE_ROLES ═══════════════════════════
ALTER TABLE profile_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_roles_select_own"
  ON profile_roles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profile_roles_insert_own"
  ON profile_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_roles_update_own"
  ON profile_roles FOR UPDATE USING (auth.uid() = user_id);

-- ══ BLOCK 4: QUESTIONS ═══════════════════════════════
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "questions_select_published"
  ON questions FOR SELECT
  USING (status = 'published' OR auth.uid() = asker_id);

CREATE POLICY "questions_insert_own"
  ON questions FOR INSERT WITH CHECK (auth.uid() = asker_id);

CREATE POLICY "questions_update_own"
  ON questions FOR UPDATE USING (auth.uid() = asker_id);

-- ══ BLOCK 5: ANSWERS ═════════════════════════════════
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "answers_select_published"
  ON answers FOR SELECT
  USING (status = 'published' OR auth.uid() = answerer_id);

CREATE POLICY "answers_insert_own"
  ON answers FOR INSERT WITH CHECK (auth.uid() = answerer_id);

CREATE POLICY "answers_update_own"
  ON answers FOR UPDATE USING (auth.uid() = answerer_id);

-- ══ BLOCK 6: SCORE_HISTORY ═══════════════════════════
ALTER TABLE score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "score_history_select_own"
  ON score_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "score_history_insert_own"
  ON score_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ══ BLOCK 7: TIER_EVENTS ═════════════════════════════
ALTER TABLE tier_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tier_events_select_own"
  ON tier_events FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tier_events_insert_own"
  ON tier_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ══ BLOCK 8: INSIGHT_REPORTS ═════════════════════════
ALTER TABLE insight_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insight_reports_select_own"
  ON insight_reports FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insight_reports_insert_own"
  ON insight_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "insight_reports_update_own"
  ON insight_reports FOR UPDATE USING (auth.uid() = user_id);

-- ══ BLOCK 9: NOTIFICATIONS ═══════════════════════════
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_own"
  ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ══ BLOCK 10: ADD MISSING COLUMNS ════════════════════
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_thumbnail text,
  ADD COLUMN IF NOT EXISTS video_duration int,
  ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'text';

ALTER TABLE answers
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_thumbnail text,
  ADD COLUMN IF NOT EXISTS video_duration int,
  ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'text';

-- ══ BLOCK 11: VERIFY ═════════════════════════════════
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
