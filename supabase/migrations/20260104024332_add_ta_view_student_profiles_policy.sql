/*
  # Allow TAs to View Student Profiles for Their Bookings

  1. Changes
    - Add RLS policy to `profiles` table allowing TAs to view student profiles when there's an associated booking
  
  2. Security
    - TAs can only view profiles of students who have bookings with them
    - Students can still view their own profiles
    - No modification access granted
*/

-- Allow TAs to view profiles of students who have bookings with them
CREATE POLICY "TAs can view student profiles for bookings"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tb.student_id
      FROM ta_bookings tb
      INNER JOIN ta_profiles tp ON tp.id = tb.ta_id
      WHERE tp.user_id = auth.uid()
    )
  );
