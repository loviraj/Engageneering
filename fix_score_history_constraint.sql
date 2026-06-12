-- ALTER SCORE_HISTORY CHECK CONSTRAINT
-- Run this block in the Supabase SQL Editor to allow 'psi_spend', 'aria_query', and 'signup_bonus' action types.

ALTER TABLE score_history DROP CONSTRAINT IF EXISTS score_history_action_type_check;

ALTER TABLE score_history ADD CONSTRAINT score_history_action_type_check 
  CHECK (action_type IN ('question', 'answer', 'psi_spend', 'aria_query', 'signup_bonus'));

SELECT 'score_history constraint updated successfully' as status;
