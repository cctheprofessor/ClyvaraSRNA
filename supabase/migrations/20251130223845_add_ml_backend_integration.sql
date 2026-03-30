/*
  # ML Backend Integration Schema

  1. Profile Extensions for ML Backend Sync
    - Add ML Backend required fields to profiles table:
      - `enrollment_date` (date, required) - Program start date for ML progression tracking
      - `institution` (text, required) - School/University name
      - `program_name` (text, default 'Nurse Anesthesia Program')
      - `expected_graduation` (date, nullable) - Auto-calculated if not provided
      - `cohort_year` (integer, nullable) - Year entered program
      - `program_track` (text, default 'Full-time') - Full-time, Part-time, Accelerated
      - `ml_user_id` (integer, nullable) - ML backend user ID
      - `ml_last_synced_at` (timestamptz, nullable) - Last successful sync timestamp
      - `first_name` (text, nullable) - Extracted from full_name
      - `last_name` (text, nullable) - Extracted from full_name
      - `phone` (text, nullable) - Phone number
      - `gpa` (numeric, nullable) - Current GPA (0.0-4.0)
      - `clinical_hours` (integer, default 0) - Total clinical hours completed
      - `current_semester` (integer, default 1) - Current semester number
      - `preferred_study_time` (text, nullable) - Study time preference
      - `daily_goal_minutes` (integer, default 30) - Daily study goal
      - `exam_date` (date, nullable) - Target NCE exam date
      - `email_notifications` (boolean, default true)
      - `weekly_report_enabled` (boolean, default true)
      - `is_active` (boolean, default true)

  2. New Tables
    - `ml_sync_status`: Track ML Backend sync status per user
    - `ta_users`: Teaching Assistant user profiles
    - `ta_requests`: Student questions to Teaching Assistants

  3. Indexes
    - Add indexes for ML user lookup and institution queries

  4. Security
    - Enable RLS on new tables
    - Add policies for authenticated users

  ## Important Notes
  - Existing profiles will need enrollment_date populated (migration script required)
  - For existing users without institution, use school field as fallback
  - ML sync will be triggered on new user registration
*/

-- Add ML Backend fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS enrollment_date DATE,
ADD COLUMN IF NOT EXISTS institution TEXT,
ADD COLUMN IF NOT EXISTS program_name TEXT DEFAULT 'Nurse Anesthesia Program',
ADD COLUMN IF NOT EXISTS expected_graduation DATE,
ADD COLUMN IF NOT EXISTS cohort_year INTEGER,
ADD COLUMN IF NOT EXISTS program_track TEXT DEFAULT 'Full-time',
ADD COLUMN IF NOT EXISTS ml_user_id INTEGER,
ADD COLUMN IF NOT EXISTS ml_last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS gpa NUMERIC(3,2) CHECK (gpa IS NULL OR (gpa >= 0.0 AND gpa <= 4.0)),
ADD COLUMN IF NOT EXISTS clinical_hours INTEGER DEFAULT 0 CHECK (clinical_hours >= 0),
ADD COLUMN IF NOT EXISTS current_semester INTEGER DEFAULT 1 CHECK (current_semester >= 1),
ADD COLUMN IF NOT EXISTS preferred_study_time TEXT CHECK (preferred_study_time IS NULL OR preferred_study_time IN ('morning', 'afternoon', 'evening', 'night')),
ADD COLUMN IF NOT EXISTS daily_goal_minutes INTEGER DEFAULT 30 CHECK (daily_goal_minutes >= 5),
ADD COLUMN IF NOT EXISTS exam_date DATE,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS weekly_report_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_ml_user_id ON profiles(ml_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_institution_cohort ON profiles(institution, cohort_year);
CREATE INDEX IF NOT EXISTS idx_profiles_enrollment_date ON profiles(enrollment_date);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active) WHERE is_active = TRUE;

-- Create ML Sync Status table
CREATE TABLE IF NOT EXISTS ml_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'active', 'failed', 'archived')),
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  pending_responses_count INTEGER DEFAULT 0 CHECK (pending_responses_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ml_sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync status"
  ON ml_sync_status
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ml_sync_status_user_id ON ml_sync_status(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_sync_status_status ON ml_sync_status(sync_status);

-- Create Teaching Assistant Users table
CREATE TABLE IF NOT EXISTS ta_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bio TEXT,
  specialties JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  total_responses INTEGER DEFAULT 0 CHECK (total_responses >= 0),
  average_rating NUMERIC(2,1) CHECK (average_rating IS NULL OR (average_rating >= 1.0 AND average_rating <= 5.0)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ta_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active TAs"
  ON ta_users
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

CREATE INDEX IF NOT EXISTS idx_ta_users_user_id ON ta_users(user_id);
CREATE INDEX IF NOT EXISTS idx_ta_users_active ON ta_users(is_active) WHERE is_active = TRUE;

-- Create TA Requests table
CREATE TABLE IF NOT EXISTS ta_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  category TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent', 'normal', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'answered')),
  response_text TEXT,
  assigned_ta_id UUID REFERENCES ta_users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ta_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests"
  ON ta_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own requests"
  ON ta_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own requests"
  ON ta_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ta_requests_user_id ON ta_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ta_requests_status ON ta_requests(status);
CREATE INDEX IF NOT EXISTS idx_ta_requests_assigned_ta ON ta_requests(assigned_ta_id);
CREATE INDEX IF NOT EXISTS idx_ta_requests_created_at ON ta_requests(created_at DESC);

-- Update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_ml_sync_status_updated_at'
  ) THEN
    CREATE TRIGGER update_ml_sync_status_updated_at
    BEFORE UPDATE ON ml_sync_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_ta_requests_updated_at'
  ) THEN
    CREATE TRIGGER update_ta_requests_updated_at
    BEFORE UPDATE ON ta_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;