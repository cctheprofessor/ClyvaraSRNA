/*
  # Update profile trigger to include email

  1. Changes
    - Update `create_profile_for_new_user()` trigger function to include email field
    - Backfill email for existing profiles from auth.users
  
  2. Security
    - Email is part of user's own profile data
    - No additional RLS policies needed
*/

-- Update function to create profile for new auth user (with email)
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  email_prefix TEXT;
  detected_institution TEXT;
BEGIN
  -- Extract email prefix as temporary full_name
  email_prefix := SPLIT_PART(NEW.email, '@', 1);
  
  -- Try to detect institution from email domain
  detected_institution := extract_institution_from_email(NEW.email);
  
  -- Insert profile with sensible defaults
  INSERT INTO profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    phone,
    role,
    specialty_interest,
    institution,
    enrollment_date,
    program_name,
    program_track,
    cohort_year,
    expected_graduation,
    graduation_year,
    clinical_hours,
    current_semester,
    daily_goal_minutes,
    email_notifications,
    weekly_report_enabled,
    is_active,
    is_admin,
    is_ta,
    diagnostic_completed,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email, -- Store email from auth.users
    email_prefix, -- Temporary name from email
    NULL, -- User will fill in
    NULL, -- User will fill in
    NULL, -- User will fill in
    'Student', -- Default role
    NULL, -- User will fill in
    detected_institution, -- From email domain
    CURRENT_DATE, -- Default to today
    'Nurse Anesthesia Program', -- Default program
    'Full-time', -- Default track
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, -- Current year
    NULL, -- User will fill in
    NULL, -- User will fill in
    0, -- No clinical hours yet
    1, -- First semester
    30, -- Default 30 min daily goal
    TRUE, -- Enable notifications
    TRUE, -- Enable weekly reports
    FALSE, -- Mark as INACTIVE to indicate incomplete profile
    FALSE, -- Not admin by default
    FALSE, -- Not TA by default
    FALSE, -- Diagnostic not completed
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill email for existing profiles from auth.users
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;