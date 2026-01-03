/*
  # Fix Profile Creation Trigger with Schema-Qualified Function
  
  1. Issue
    - Trigger exists but doesn't fire when new users are created
    - Function needs to be schema-qualified
  
  2. Changes
    - Recreate trigger with fully qualified function name
    - Grant necessary permissions
  
  3. Security
    - Function runs with SECURITY DEFINER
    - Proper RLS policies already in place
*/

-- Drop and recreate trigger with schema-qualified function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_for_new_user();

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.create_profile_for_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_profile_for_new_user() TO service_role;

-- Grant execute on helper function as well
GRANT EXECUTE ON FUNCTION public.extract_institution_from_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.extract_institution_from_email(TEXT) TO service_role;
