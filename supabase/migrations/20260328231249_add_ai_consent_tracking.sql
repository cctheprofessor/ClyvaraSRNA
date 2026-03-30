/*
  # Add AI Consent Tracking to Profiles

  ## Summary
  Adds fields to the profiles table to track whether users have explicitly
  consented to their data being sent to OpenAI for AI-powered features.

  ## New Columns (profiles table)
  - `ai_care_plan_consent_given` (boolean) - Whether the user has consented to
    sending case description data to OpenAI for care plan generation.
    Defaults to false.
  - `ai_care_plan_consent_at` (timestamptz) - Timestamp when care plan AI
    consent was granted.
  - `ai_study_plan_consent_given` (boolean) - Whether the user has consented to
    sending study preferences to OpenAI for study plan / practice question
    generation. Defaults to false.
  - `ai_study_plan_consent_at` (timestamptz) - Timestamp when study plan AI
    consent was granted.

  ## Security
  - No RLS changes needed; existing profile policies already govern access.
    Authenticated users can update their own profile row.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ai_care_plan_consent_given'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ai_care_plan_consent_given boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ai_care_plan_consent_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ai_care_plan_consent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ai_study_plan_consent_given'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ai_study_plan_consent_given boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ai_study_plan_consent_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ai_study_plan_consent_at timestamptz;
  END IF;
END $$;
