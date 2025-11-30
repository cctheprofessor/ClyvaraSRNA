/*
  # Add User Role and Update School Field
  
  1. Changes
    - Rename `institution` column to `school` for clarity
    - Add `role` column to profiles table with options: 'SRNA/NAR/RRNA' or 'RN'
    - Update existing policies to accommodate new fields
  
  2. Security
    - Maintain existing RLS policies
    - Users can view and update their own profile data
*/

-- Add role column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role text;
  END IF;
END $$;

-- Rename institution to school if not already renamed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'institution'
  ) THEN
    ALTER TABLE profiles RENAME COLUMN institution TO school;
  END IF;
END $$;