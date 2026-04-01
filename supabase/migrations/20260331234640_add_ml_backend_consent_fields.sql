/*
  # Add ML backend consent tracking fields to profiles

  ## Summary
  Adds two columns to the profiles table to track whether a user has given
  explicit consent before their anonymized learning data is transmitted to
  Clyvara Analytica (the ML backend service).

  ## New Columns
  - `ml_backend_consent_given` (boolean, not null, default false)
    Whether the user has accepted the Clyvara Analytica data-sharing notice.
  - `ml_backend_consent_at` (timestamptz, nullable)
    Timestamp of when consent was given.

  ## Notes
  - Follows the same pattern as `ai_care_plan_consent_given` /
    `ai_study_plan_consent_given` already present in the schema.
  - Existing rows default to false (consent not yet given) so the gate
    will be shown on their next sync attempt.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ml_backend_consent_given'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ml_backend_consent_given BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ml_backend_consent_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ml_backend_consent_at TIMESTAMPTZ;
  END IF;
END $$;
