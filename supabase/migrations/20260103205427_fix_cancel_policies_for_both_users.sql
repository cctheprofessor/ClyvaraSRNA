/*
  # Fix Cancel Policies for Students and TAs

  ## Changes
  1. Update "Students can cancel own bookings" policy to explicitly allow 'cancelled' status in WITH CHECK
  2. Update "TAs can manage approval workflow" policy to allow 'cancelled' in addition to 'approved' and 'rejected'

  ## Security
  - Students can now cancel bookings in 'awaiting_approval', 'approved', or 'confirmed' status
  - TAs can now approve, reject, OR cancel bookings in 'awaiting_approval' or 'approved' status
*/

-- Fix student cancel policy
DROP POLICY IF EXISTS "Students can cancel own bookings" ON ta_bookings;

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
    AND status IN ('awaiting_approval', 'approved', 'confirmed', 'cancelled')
  );

-- Fix TA approval workflow policy to allow cancellation
DROP POLICY IF EXISTS "TAs can manage approval workflow" ON ta_bookings;

CREATE POLICY "TAs can manage approval workflow"
  ON ta_bookings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ta_profiles
      WHERE ta_profiles.id = ta_bookings.ta_id
      AND ta_profiles.user_id = auth.uid()
    )
    AND status IN ('awaiting_approval', 'approved')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ta_profiles
      WHERE ta_profiles.id = ta_bookings.ta_id
      AND ta_profiles.user_id = auth.uid()
    )
    AND status IN ('approved', 'rejected', 'cancelled')
  );
