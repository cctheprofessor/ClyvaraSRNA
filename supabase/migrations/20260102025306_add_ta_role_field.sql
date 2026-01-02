/*
  # Add Teaching Assistant (TA) Role Support
  
  1. Changes
    - Add `is_ta` boolean field to profiles table to identify teaching assistants
    - Defaults to false for all existing users
    - Allows users to have both student role (SRNA/RN) and TA status simultaneously
  
  2. Security
    - Users can view their own is_ta status
    - Only admins can modify is_ta status (future enhancement)
*/

-- Add is_ta column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_ta'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_ta boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create index for efficient TA queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_ta ON profiles(is_ta) WHERE is_ta = true;
