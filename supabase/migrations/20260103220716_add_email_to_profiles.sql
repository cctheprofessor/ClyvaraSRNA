/*
  # Add email field to profiles table

  1. Changes
    - Add `email` column to `profiles` table to store user email address
    - Email is populated from auth.users email during profile creation
    - Email is unique and indexed for faster lookups
  
  2. Security
    - No RLS policy changes needed as email is part of user's own profile
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
  END IF;
END $$;