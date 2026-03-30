/*
  # Add name field to TA profiles

  1. Changes
    - Add `display_name` column to `ta_profiles` table to store TA's display name
    - This field will be shown to students when browsing TA profiles

  2. Notes
    - Default to empty string to avoid breaking existing profiles
    - Field is optional but recommended for better user experience
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ta_profiles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE ta_profiles ADD COLUMN display_name text DEFAULT '';
  END IF;
END $$;
