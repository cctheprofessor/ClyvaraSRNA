/*
  # Fix Student Cancel Policy for Awaiting Bookings

  ## Changes
  Update the "Students can cancel own bookings" policy to allow students to cancel bookings in 'awaiting_approval' status as well as 'approved' and 'confirmed' statuses.

  ## Security
  Students can now cancel their own booking requests at any stage before completion.
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Students can cancel own bookings" ON ta_bookings;

-- Recreate with 'awaiting_approval' included
CREATE POLICY "Students can cancel own bookings"
  ON ta_bookings
  FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    AND status IN ('awaiting_approval', 'approved', 'confirmed')
  )
  WITH CHECK (
    student_id = auth.uid()
  );
