/*
  # Add analytics columns to rejected questions log

  1. Changes
    - Add `rejection_reason` column to categorize rejection types
    - Add `topic_id` column to track which topics have quality issues
    - Add index on rejection_reason for faster aggregation queries
    - Add index on topic_id for per-topic analysis

  2. Important Notes
    - Helps identify patterns in ML backend failures
    - Enables topic-specific quality monitoring
    - Supports data-driven improvements to ML prompts
*/

-- Add new columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rejected_questions_log' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE rejected_questions_log 
    ADD COLUMN rejection_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rejected_questions_log' AND column_name = 'topic_id'
  ) THEN
    ALTER TABLE rejected_questions_log 
    ADD COLUMN topic_id integer;
  END IF;
END $$;

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_rejected_questions_rejection_reason 
  ON rejected_questions_log(rejection_reason);

CREATE INDEX IF NOT EXISTS idx_rejected_questions_topic_id 
  ON rejected_questions_log(topic_id);

-- Update existing records to categorize them
UPDATE rejected_questions_log
SET rejection_reason = CASE
  WHEN validation_errors::text LIKE '%Sub-question%' THEN 'malformed_clinical_scenario'
  WHEN validation_errors::text LIKE '%correct_pairs%' THEN 'empty_correct_pairs'
  WHEN validation_errors::text LIKE '%correct_order%' THEN 'empty_correct_order'
  WHEN validation_errors::text LIKE '%placeholder text%' THEN 'placeholder_text'
  WHEN validation_errors::text LIKE '%missing%' THEN 'missing_required_field'
  ELSE 'other'
END
WHERE rejection_reason IS NULL;

-- Extract topic_id from question_data
UPDATE rejected_questions_log
SET topic_id = (question_data->>'topic_id')::integer
WHERE topic_id IS NULL AND question_data ? 'topic_id';
