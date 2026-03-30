/*
  # Auto-Create Profiles for Auth Users

  ## Problem
  Users created through Bolt User Management or other admin flows only exist in auth.users
  but have no corresponding profile record. This breaks RLS policies that rely on profiles.

  ## Solution
  1. Create a trigger function that automatically creates a profile when a new user is added to auth.users
  2. Extract sensible defaults from the user's email
  3. Mark profile as incomplete so user can be prompted to fill it in later
  4. Backfill existing users who don't have profiles

  ## Changes
  1. Create `create_profile_for_new_user()` trigger function
  2. Create trigger on auth.users AFTER INSERT
  3. Backfill existing users without profiles

  ## Security
  - Profiles are automatically created with RLS-compliant structure
  - All required fields have sensible defaults
  - Users can update their own incomplete profiles
*/

-- Function to extract institution from email domain
CREATE OR REPLACE FUNCTION extract_institution_from_email(email TEXT)
RETURNS TEXT AS $$
DECLARE
  domain TEXT;
  institution TEXT;
BEGIN
  -- Extract domain from email
  domain := LOWER(SPLIT_PART(email, '@', 2));
  
  -- Map common domains to institutions
  CASE 
    WHEN domain LIKE '%columbia.edu%' THEN institution := 'Columbia University';
    WHEN domain LIKE '%cumc.columbia.edu%' THEN institution := 'Columbia University Medical Center';
    WHEN domain LIKE '%nyu.edu%' THEN institution := 'New York University';
    WHEN domain LIKE '%upenn.edu%' THEN institution := 'University of Pennsylvania';
    WHEN domain LIKE '%jhu.edu%' THEN institution := 'Johns Hopkins University';
    WHEN domain LIKE '%duke.edu%' THEN institution := 'Duke University';
    WHEN domain LIKE '%stanford.edu%' THEN institution := 'Stanford University';
    WHEN domain LIKE '%harvard.edu%' THEN institution := 'Harvard University';
    WHEN domain LIKE '%yale.edu%' THEN institution := 'Yale University';
    WHEN domain LIKE '%ucsd.edu%' THEN institution := 'University of California San Diego';
    WHEN domain LIKE '%ucla.edu%' THEN institution := 'University of California Los Angeles';
    WHEN domain LIKE '%ucsf.edu%' THEN institution := 'University of California San Francisco';
    ELSE institution := NULL;
  END CASE;
  
  RETURN institution;
END;
$$ LANGUAGE plpgsql;

-- Function to create profile for new auth user
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

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_new_user();

-- Backfill existing users without profiles
INSERT INTO profiles (
  id,
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
)
SELECT 
  u.id,
  SPLIT_PART(u.email, '@', 1) as full_name,
  NULL as first_name,
  NULL as last_name,
  NULL as phone,
  'Student' as role,
  NULL as specialty_interest,
  extract_institution_from_email(u.email) as institution,
  CURRENT_DATE as enrollment_date,
  'Nurse Anesthesia Program' as program_name,
  'Full-time' as program_track,
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER as cohort_year,
  NULL as expected_graduation,
  NULL as graduation_year,
  0 as clinical_hours,
  1 as current_semester,
  30 as daily_goal_minutes,
  TRUE as email_notifications,
  TRUE as weekly_report_enabled,
  FALSE as is_active, -- Mark as INACTIVE to indicate incomplete profile
  FALSE as is_admin,
  FALSE as is_ta,
  FALSE as diagnostic_completed,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;
