/*
  # Add Meeting Link to TA Profiles

  1. Changes
    - Add `meeting_link` column to `ta_profiles` table
    - This will store the TA's default Google Meet/Zoom link
    - The link is automatically sent to students once they complete payment
  
  2. Notes
    - Field is nullable to allow TAs to set it up later
    - Can be a Google Meet, Zoom, or any video conferencing URL
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ta_profiles' AND column_name = 'meeting_link'
  ) THEN
    ALTER TABLE ta_profiles ADD COLUMN meeting_link text;
  END IF;
END $$;