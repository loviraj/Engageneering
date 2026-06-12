-- ══════════════════════════════════════════════════
-- ENGAGENEERING™ — SECURITY TRIGGERS (H-5 & C-4)
-- Run this block in the Supabase SQL Editor
-- ══════════════════════════════════════════════════

-- H-5 Fix: Prevent clients from self-publishing questions or bypassing the Gatekeeper
CREATE OR REPLACE FUNCTION check_question_update_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- If updated by standard authenticated user (client-side)
  IF auth.role() = 'authenticated' THEN
    -- Block modifications to security-critical status and grading fields
    IF (OLD.gatekeeper_verdict IS DISTINCT FROM NEW.gatekeeper_verdict AND NEW.gatekeeper_verdict = 'approved') OR
       (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'published') OR
       (OLD.quality_score IS DISTINCT FROM NEW.quality_score AND NEW.quality_score >= 80) THEN
      RAISE EXCEPTION 'Security Policy violation: client-side self-publishing or score spoofing is restricted.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_question_update_limits ON questions;
CREATE TRIGGER tr_check_question_update_limits
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION check_question_update_limits();

SELECT 'Security triggers created successfully' as status;
