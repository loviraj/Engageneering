-- ENGAGENEERING™ — Multilingual + Video-Only Migration
-- Run in Supabase SQL Editor

-- ── QUESTIONS TABLE ──────────────────────────────────────────
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS language        VARCHAR(10)  DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS language_name  VARCHAR(50)  DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS video_duration  NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transcript      TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS integrity_level VARCHAR(20)  DEFAULT 'PASS',
  ADD COLUMN IF NOT EXISTS integrity_flags JSONB        DEFAULT '[]';

-- ── ANSWERS TABLE ─────────────────────────────────────────────
ALTER TABLE answers
  ADD COLUMN IF NOT EXISTS language        VARCHAR(10)  DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS language_name  VARCHAR(50)  DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS video_duration  NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transcript      TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS integrity_level VARCHAR(20)  DEFAULT 'PASS',
  ADD COLUMN IF NOT EXISTS integrity_flags JSONB        DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS integrity_layers_checked INTEGER DEFAULT 9,
  ADD COLUMN IF NOT EXISTS integrity_confidence NUMERIC(4,3) DEFAULT 0.95;

-- ── INDEXES FOR LANGUAGE FILTERING ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_questions_language
  ON questions(language);

CREATE INDEX IF NOT EXISTS idx_answers_language
  ON answers(language);

CREATE INDEX IF NOT EXISTS idx_questions_lang_status
  ON questions(language, gatekeeper_verdict, status);

-- ── LANGUAGE STATS VIEW ───────────────────────────────────────
CREATE OR REPLACE VIEW language_stats AS
SELECT
  language,
  language_name,
  COUNT(*) FILTER (WHERE table_name='questions') AS total_questions,
  COUNT(*) FILTER (WHERE table_name='answers')   AS total_answers,
  AVG(cds)  FILTER (WHERE table_name='answers')  AS avg_cds,
  MAX(created_at)                                AS last_activity
FROM (
  SELECT language, language_name, 'questions' AS table_name, NULL AS cds, created_at
  FROM questions WHERE gatekeeper_verdict='approved'
  UNION ALL
  SELECT language, language_name, 'answers', cds, created_at
  FROM answers WHERE status='published'
) combined
GROUP BY language, language_name
ORDER BY total_questions DESC;

-- ── INTEGRITY LOG TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS integrity_log (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(20)  NOT NULL,  -- 'question' or 'answer'
  content_id   UUID         NOT NULL,
  user_id      UUID         REFERENCES auth.users(id),
  level        VARCHAR(20)  NOT NULL,  -- PASS/WARN/HOLD/REJECT/ESCALATE
  flags        JSONB        DEFAULT '[]',
  layer_results JSONB       DEFAULT '{}',
  confidence   NUMERIC(4,3) DEFAULT 0.95,
  note         TEXT,
  checked_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrity_log_user
  ON integrity_log(user_id, checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_integrity_log_level
  ON integrity_log(level) WHERE level IN ('HOLD','REJECT','ESCALATE');

-- ── USER LANGUAGE PREFERENCES ─────────────────────────────────
ALTER TABLE profile_roles
  ADD COLUMN IF NOT EXISTS preferred_languages  TEXT[] DEFAULT ARRAY['en'],
  ADD COLUMN IF NOT EXISTS answer_languages     TEXT[] DEFAULT ARRAY['en'],
  ADD COLUMN IF NOT EXISTS multilingual_bonus   INTEGER DEFAULT 0;

-- ── UPDATE EXISTING ROWS ──────────────────────────────────────
UPDATE questions SET language='en', language_name='English'
  WHERE language IS NULL;

UPDATE answers SET language='en', language_name='English'
  WHERE language IS NULL;

-- ── DURATION CONSTRAINT: Q=60s, A=180s ────────────────────────
-- Note: enforced in application layer, stored for audit
COMMENT ON COLUMN questions.video_duration IS 'Duration in seconds. Max 60s enforced in app.';
COMMENT ON COLUMN answers.video_duration   IS 'Duration in seconds. Max 180s enforced in app.';

SELECT 'Multilingual migration complete.' AS status;
