/*
  # Add Booking Messages System

  1. New Tables
    - `booking_messages`
      - `id` (uuid, primary key)
      - `booking_id` (uuid, foreign key) - References ta_bookings
      - `sender_id` (uuid, foreign key) - References auth.users
      - `message_text` (text) - Message content
      - `read_at` (timestamptz) - When message was read
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on booking_messages table
    - Both TA and student in a booking can send and view messages
    - Messages are only visible to participants of the booking

  3. Indexes
    - Index on booking_id for fast message retrieval
    - Index on sender_id for sender queries
*/

-- Create booking_messages table
CREATE TABLE IF NOT EXISTS booking_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES ta_bookings(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_text text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_booking_messages_booking_id ON booking_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_messages_sender_id ON booking_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_booking_messages_created_at ON booking_messages(created_at);

-- Enable RLS
ALTER TABLE booking_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Students can view messages for their bookings
CREATE POLICY "Students can view messages for their bookings"
  ON booking_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ta_bookings
      WHERE ta_bookings.id = booking_messages.booking_id
      AND ta_bookings.student_id = auth.uid()
    )
  );

-- TAs can view messages for their bookings
CREATE POLICY "TAs can view messages for their bookings"
  ON booking_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ta_bookings
      JOIN ta_profiles ON ta_profiles.id = ta_bookings.ta_id
      WHERE ta_bookings.id = booking_messages.booking_id
      AND ta_profiles.user_id = auth.uid()
    )
  );

-- Students can send messages for their bookings
CREATE POLICY "Students can send messages for their bookings"
  ON booking_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM ta_bookings
      WHERE ta_bookings.id = booking_messages.booking_id
      AND ta_bookings.student_id = auth.uid()
    )
  );

-- TAs can send messages for their bookings
CREATE POLICY "TAs can send messages for their bookings"
  ON booking_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM ta_bookings
      JOIN ta_profiles ON ta_profiles.id = ta_bookings.ta_id
      WHERE ta_bookings.id = booking_messages.booking_id
      AND ta_profiles.user_id = auth.uid()
    )
  );

-- Users can update their own messages (for read receipts)
CREATE POLICY "Users can update messages for their bookings"
  ON booking_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ta_bookings
      WHERE ta_bookings.id = booking_messages.booking_id
      AND (
        ta_bookings.student_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM ta_profiles
          WHERE ta_profiles.id = ta_bookings.ta_id
          AND ta_profiles.user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ta_bookings
      WHERE ta_bookings.id = booking_messages.booking_id
      AND (
        ta_bookings.student_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM ta_profiles
          WHERE ta_profiles.id = ta_bookings.ta_id
          AND ta_profiles.user_id = auth.uid()
        )
      )
    )
  );