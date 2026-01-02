/*
  # TA Booking Approval Workflow

  ## Changes
  1. **New Booking Statuses**
     - Add 'awaiting_approval' status for when student submits request
     - Add 'approved' status for when TA approves (ready for payment)
     - Add 'rejected' status for when TA declines

  2. **New Columns**
     - `approved_at` (timestamptz) - When TA approved the request
     - `approved_by` (uuid) - TA who approved (for audit trail)
     - `rejected_at` (timestamptz) - When TA rejected the request
     - `rejection_reason` (text) - Reason for rejection

  ## Workflow
  1. Student submits booking → status = 'awaiting_approval'
  2. TA approves → status = 'approved', approved_at set
  3. Student pays → status = 'confirmed', stripe_payment_intent_id set
  4. Session completes → status = 'completed', completed_at set
  
  OR
  
  2. TA rejects → status = 'rejected', rejected_at set, rejection_reason provided
*/

-- Add new columns for approval workflow
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ta_bookings' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE ta_bookings ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ta_bookings' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE ta_bookings ADD COLUMN approved_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ta_bookings' AND column_name = 'rejected_at'
  ) THEN
    ALTER TABLE ta_bookings ADD COLUMN rejected_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ta_bookings' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE ta_bookings ADD COLUMN rejection_reason text;
  END IF;
END $$;

-- Drop the old status constraint
ALTER TABLE ta_bookings DROP CONSTRAINT IF EXISTS valid_status;

-- Update existing 'pending' status bookings to 'awaiting_approval'
UPDATE ta_bookings 
SET status = 'awaiting_approval' 
WHERE status = 'pending';

-- Add new status constraint with all statuses
ALTER TABLE ta_bookings ADD CONSTRAINT valid_status 
  CHECK (status IN ('awaiting_approval', 'approved', 'rejected', 'confirmed', 'completed', 'cancelled', 'refunded'));

-- Add RLS policy for TAs to view pending approval requests
DROP POLICY IF EXISTS "TAs can view their pending approval requests" ON ta_bookings;
CREATE POLICY "TAs can view their pending approval requests"
  ON ta_bookings
  FOR SELECT
  TO authenticated
  USING (
    ta_id IN (SELECT id FROM ta_profiles WHERE user_id = auth.uid())
  );

-- Add RLS policy for TAs to update pending bookings (approve/reject)
DROP POLICY IF EXISTS "TAs can approve or reject booking requests" ON ta_bookings;
CREATE POLICY "TAs can approve or reject booking requests"
  ON ta_bookings
  FOR UPDATE
  TO authenticated
  USING (
    ta_id IN (SELECT id FROM ta_profiles WHERE user_id = auth.uid())
    AND status IN ('awaiting_approval', 'approved')
  )
  WITH CHECK (
    ta_id IN (SELECT id FROM ta_profiles WHERE user_id = auth.uid())
  );

-- Add RLS policy for students to update their approved bookings (for payment)
DROP POLICY IF EXISTS "Students can update their approved bookings" ON ta_bookings;
CREATE POLICY "Students can update their approved bookings"
  ON ta_bookings
  FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    AND status = 'approved'
  )
  WITH CHECK (
    student_id = auth.uid()
  );