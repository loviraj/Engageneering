-- ══════════════════════════════════════════════════════
-- ENGAGENEERING™ — VIDEO LAYER SCHEMA
-- Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════

-- ── VIDEO QUESTIONS ──────────────────────────────────
-- Extends questions table with video fields
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS video_url        text,
  ADD COLUMN IF NOT EXISTS video_thumbnail  text,
  ADD COLUMN IF NOT EXISTS video_duration   int,      -- seconds
  ADD COLUMN IF NOT EXISTS video_transcript text,
  ADD COLUMN IF NOT EXISTS content_type     text DEFAULT 'text'
    CHECK (content_type IN ('text','video','both'));

-- ── VIDEO ANSWERS ─────────────────────────────────────
ALTER TABLE answers
  ADD COLUMN IF NOT EXISTS video_url        text,
  ADD COLUMN IF NOT EXISTS video_thumbnail  text,
  ADD COLUMN IF NOT EXISTS video_duration   int,
  ADD COLUMN IF NOT EXISTS video_transcript text,
  ADD COLUMN IF NOT EXISTS content_type     text DEFAULT 'text'
    CHECK (content_type IN ('text','video','both'));

-- ── VIDEO METRICS ─────────────────────────────────────
-- Tracks watch behaviour per answer per user
CREATE TABLE IF NOT EXISTS video_views (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id      uuid NOT NULL,           -- answer id or question id
  video_type    text NOT NULL CHECK (video_type IN ('question','answer')),
  viewer_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  watch_seconds int DEFAULT 0,
  completed     boolean DEFAULT false,
  replayed      boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

-- ── SUPABASE STORAGE BUCKET ───────────────────────────
-- Creates the storage bucket for videos
-- NOTE: Run this separately if SQL editor does not support storage commands
-- Or create the bucket manually in Supabase → Storage → New Bucket

-- Enable RLS on video_views
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_views: insert own"
  ON video_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "video_views: owner read"
  ON video_views FOR SELECT
  USING (auth.uid() = viewer_id);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS video_views_video_id_idx ON video_views(video_id);
CREATE INDEX IF NOT EXISTS video_views_viewer_id_idx ON video_views(viewer_id);

-- ── VIDEO SCORING ADDITIONS ───────────────────────────
-- Add video-specific score columns to score_history
ALTER TABLE score_history
  ADD COLUMN IF NOT EXISTS watch_completion  int,  -- 0-100 percent watched
  ADD COLUMN IF NOT EXISTS replay_count      int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hook_score        int;  -- first 5 seconds rating

SELECT 'Video schema ready' as status;
