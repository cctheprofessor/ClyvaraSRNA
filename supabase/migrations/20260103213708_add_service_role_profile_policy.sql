/*
  # Add Service Role Policy for Profile Creation

  ## Problem
  The trigger function `create_profile_for_new_user` cannot insert profiles because
  RLS policies don't allow the service role to insert records during trigger execution.

  ## Solution
  Add a permissive policy that allows service_role to insert profiles.
  This is safe because:
  1. Only the trigger function uses service_role context
  2. The trigger only fires on auth.users INSERT
  3. Users cannot directly access service_role

  ## Changes
  - Add INSERT policy for service_role to bypass RLS during trigger execution
*/

-- Allow service role to insert profiles (needed for trigger)
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also allow service role to update (needed for signup flow)
CREATE POLICY "Service role can update profiles"
  ON profiles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
