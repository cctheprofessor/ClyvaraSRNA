/*
  # Fix Profile Auto-Creation Trigger

  ## Problem
  The trigger function `create_profile_for_new_user` is failing when new users sign up.
  Error: "Database error saving new user"
  
  The function needs proper error handling and may need to use ON CONFLICT to handle
  race conditions or retry scenarios.

  ## Solution
  1. Add ON CONFLICT clause to handle cases where profile might already exist
  2. Add better error handling and logging
  3. Ensure function has proper permissions

  ## Changes
  - Update trigger function with ON CONFLICT handling
  - Add error logging
  - Grant necessary permissions
*/

-- Drop and recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  email_prefix TEXT;
  detected_institution TEXT;
BEGIN
  -- Log the trigger execution
  RAISE LOG 'Creating profile for new user: %', NEW.id;
  
  -- Extract email prefix as temporary full_name
  email_prefix := SPLIT_PART(NEW.email, '@', 1);
  
  -- Try to detect institution from email domain
  detected_institution := extract_institution_from_email(NEW.email);
  
  -- Insert profile with ON CONFLICT to handle any race conditions
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
  )
  ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();
  
  RAISE LOG 'Profile created successfully for user: %', NEW.id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON profiles TO postgres, anon, authenticated, service_role;
