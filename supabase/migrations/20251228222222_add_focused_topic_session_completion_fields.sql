/*
  # Add Completion Fields to Focused Topic Sessions

  1. Changes
    - Add `answers_data` column to store session answers as JSONB
    - Add `correct_answers` column to store count of correct answers
    - Add `total_time_seconds` column to store total time spent in seconds

  2. Notes
    - These fields are used to track session progress and completion stats
    - `answers_data` stores the complete answer history for the session
    - `correct_answers` and `total_time_seconds` are populated when session is completed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'focused_topic_sessions' AND column_name = 'answers_data'
  ) THEN
    ALTER TABLE focused_topic_sessions ADD COLUMN answers_data jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'focused_topic_sessions' AND column_name = 'correct_answers'
  ) THEN
    ALTER TABLE focused_topic_sessions ADD COLUMN correct_answers integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'focused_topic_sessions' AND column_name = 'total_time_seconds'
  ) THEN
    ALTER TABLE focused_topic_sessions ADD COLUMN total_time_seconds integer;
  END IF;
END $$;
