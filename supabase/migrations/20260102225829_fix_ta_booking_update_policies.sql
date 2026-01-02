/*
  # Fix TA Booking Update Policies

  ## Changes
  Consolidate the UPDATE policies for ta_bookings to prevent conflicts and ensure TAs can properly approve/reject bookings.

  ## Policy Strategy
  - Remove duplicate/conflicting policies
  - Create clear, non-overlapping policies for different operations
  - Ensure TAs can update their bookings for approval workflow
*/

-- Drop all existing UPDATE policies for ta_bookings
DROP POLICY IF EXISTS "TAs can update their bookings" ON ta_bookings;
DROP POLICY IF EXISTS "Students can update own bookings" ON ta_bookings;
DROP POLICY IF EXISTS "TAs can approve or reject booking requests" ON ta_bookings;
DROP POLICY IF EXISTS "Students can update their approved bookings" ON ta_bookings;

-- Policy 1: TAs can approve or reject their pending booking requests
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
    AND status IN ('approved', 'rejected')
  );

-- Policy 2: TAs can update their confirmed bookings (mark complete, etc)
CREATE POLICY "TAs can manage confirmed bookings"
  ON ta_bookings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ta_profiles
      WHERE ta_profiles.id = ta_bookings.ta_id
      AND ta_profiles.user_id = auth.uid()
    )
    AND status = 'confirmed'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ta_profiles
      WHERE ta_profiles.id = ta_bookings.ta_id
      AND ta_profiles.user_id = auth.uid()
    )
  );

-- Policy 3: Students can update their approved bookings (for payment)
CREATE POLICY "Students can pay for approved bookings"
  ON ta_bookings
  FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    AND status = 'approved'
  )
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'confirmed'
  );

-- Policy 4: Students can cancel their own bookings
CREATE POLICY "Students can cancel own bookings"
  ON ta_bookings
  FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    AND status IN ('approved', 'confirmed')
  )
  WITH CHECK (
    student_id = auth.uid()
  );
