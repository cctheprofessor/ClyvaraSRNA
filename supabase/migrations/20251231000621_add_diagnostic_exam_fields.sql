/*
  # Add Diagnostic Exam Fields to Profiles

  1. New Columns
    - `diagnostic_completed` (boolean) - Whether user has completed diagnostic exam
    - `diagnostic_completed_at` (timestamptz) - When diagnostic was completed
    - `diagnostic_score` (integer) - Score out of 50
    - `diagnostic_attempt_id` (text) - ML backend attempt ID reference

  2. Changes
    - Add index on diagnostic_completed for efficient filtering
    - Set default values for new fields

  3. Notes
    - Existing users will have diagnostic_completed = false by default
    - Diagnostic exam is required before accessing practice features
*/

-- Add diagnostic exam fields to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'diagnostic_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN diagnostic_completed boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'diagnostic_completed_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN diagnostic_completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'diagnostic_score'
  ) THEN
    ALTER TABLE profiles ADD COLUMN diagnostic_score integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'diagnostic_attempt_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN diagnostic_attempt_id text;
  END IF;
END $$;

-- Create index for efficient queries filtering by diagnostic completion status
CREATE INDEX IF NOT EXISTS idx_profiles_diagnostic_completed
ON profiles(diagnostic_completed);