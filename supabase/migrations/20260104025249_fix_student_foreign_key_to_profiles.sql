/*
  # Fix Student Foreign Key to Point to Profiles Table

  1. Changes
    - Drop existing `ta_bookings_student_id_fkey` that incorrectly points to auth.users
    - Recreate it to point to profiles table instead
    - This enables Supabase client to properly join bookings with student profiles
  
  2. Security
    - Foreign key ensures referential integrity with profiles table
    - Maintains cascade delete behavior
*/

-- Drop the incorrect foreign key
ALTER TABLE ta_bookings
DROP CONSTRAINT IF EXISTS ta_bookings_student_id_fkey;

-- Add correct foreign key pointing to profiles table
ALTER TABLE ta_bookings
ADD CONSTRAINT ta_bookings_student_id_fkey
FOREIGN KEY (student_id)
REFERENCES profiles(id)
ON DELETE CASCADE;
