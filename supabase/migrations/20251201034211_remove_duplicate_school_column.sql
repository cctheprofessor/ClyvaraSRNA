/*
  # Remove duplicate school column from profiles table

  1. Changes
    - Drop the 'school' column as we're using 'institution' for ML backend integration
    - The 'institution' column is the correct field per ML backend integration requirements
  
  2. Rationale
    - Previous migration attempted to rename 'institution' to 'school' but both columns now exist
    - ML backend expects 'institution' field
    - Code already uses 'institution' field
    - Removing 'school' to eliminate duplication and confusion
*/

-- Drop the school column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'school'
  ) THEN
    ALTER TABLE profiles DROP COLUMN school;
  END IF;
END $$;
