/*
  # Add repair tracking columns

  1. Changes
    - Add `repair_attempted` boolean to track if repair was attempted
    - Add `repair_successful` boolean to track if repair succeeded
    - Add `original_errors` jsonb to store pre-repair validation errors
    - Add index for repair analytics queries

  2. Important Notes
    - Helps measure effectiveness of question repair service
    - Enables tracking of which issues are fixable vs unfixable
    - Supports A/B testing of repair strategies
*/

-- Add repair tracking columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rejected_questions_log' AND column_name = 'repair_attempted'
  ) THEN
    ALTER TABLE rejected_questions_log 
    ADD COLUMN repair_attempted boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rejected_questions_log' AND column_name = 'repair_successful'
  ) THEN
    ALTER TABLE rejected_questions_log 
    ADD COLUMN repair_successful boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rejected_questions_log' AND column_name = 'original_errors'
  ) THEN
    ALTER TABLE rejected_questions_log 
    ADD COLUMN original_errors jsonb;
  END IF;
END $$;

-- Create index for repair analytics
CREATE INDEX IF NOT EXISTS idx_rejected_questions_repair_stats 
  ON rejected_questions_log(repair_attempted, repair_successful) 
  WHERE repair_attempted = true;

-- Add comments for clarity
COMMENT ON COLUMN rejected_questions_log.repair_attempted IS 'Whether the question repair service attempted to fix this question';
COMMENT ON COLUMN rejected_questions_log.repair_successful IS 'Whether the repair was successful (question became valid after repair)';
COMMENT ON COLUMN rejected_questions_log.original_errors IS 'Validation errors before repair attempt (if repair was attempted)';
