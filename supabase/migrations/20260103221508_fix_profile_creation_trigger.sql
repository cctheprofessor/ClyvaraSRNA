/*
  # Fix profile creation trigger
  
  1. Changes
    - Drop and recreate the trigger function to ensure it's properly updated
    - Ensure all NOT NULL constraints are satisfied
    - Add better error handling
  
  2. Security
    - Function runs with SECURITY DEFINER to have proper permissions
*/

-- Drop and recreate the function with proper error handling
DROP FUNCTION IF EXISTS create_profile_for_new_user() CASCADE;

CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  email_prefix TEXT;
  detected_institution TEXT;
BEGIN
  -- Extract email prefix as temporary full_name
  email_prefix := COALESCE(SPLIT_PART(NEW.email, '@', 1), 'User');
  
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
    NEW.email,
    email_prefix,
    NULL,
    NULL,
    NULL,
    'Student',
    NULL,
    detected_institution,
    CURRENT_DATE,
    'Nurse Anesthesia Program',
    'Full-time',
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    NULL,
    NULL,
    0,
    1,
    30,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, skip
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_new_user();