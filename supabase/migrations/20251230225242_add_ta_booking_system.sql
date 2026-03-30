/*
  # TA Booking System

  This migration creates a complete tutoring appointment (TA) booking system with Stripe integration.

  ## 1. New Tables
  
  ### `ta_profiles`
  - `id` (uuid, primary key) - References auth.users
  - `user_id` (uuid, foreign key) - Links to user
  - `bio` (text) - TA's bio/description
  - `base_rate_30min` (decimal) - Base rate for 30-minute sessions
  - `specialties` (text[]) - Array of specialty areas
  - `is_active` (boolean) - Whether accepting bookings
  - `stripe_account_id` (text) - Stripe Connect account ID for payouts
  - `total_sessions` (integer) - Total completed sessions
  - `average_rating` (decimal) - Average star rating
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `ta_availability`
  - `id` (uuid, primary key)
  - `ta_id` (uuid, foreign key) - References ta_profiles
  - `day_of_week` (integer) - 0=Sunday, 6=Saturday
  - `start_time` (time) - Start time in HH:MM format
  - `end_time` (time) - End time in HH:MM format
  - `is_recurring` (boolean) - Whether this repeats weekly
  - `created_at` (timestamptz)

  ### `ta_bookings`
  - `id` (uuid, primary key)
  - `ta_id` (uuid, foreign key) - References ta_profiles
  - `student_id` (uuid, foreign key) - References auth.users
  - `session_date` (date) - Date of session
  - `start_time` (time) - Session start time
  - `duration_minutes` (integer) - 30, 60, or 90
  - `session_rate` (decimal) - TA's rate for this session
  - `service_charge` (decimal) - Platform service charge ($2.50)
  - `total_amount` (decimal) - Total amount charged
  - `status` (text) - 'pending', 'confirmed', 'completed', 'cancelled', 'refunded'
  - `meeting_link` (text) - Virtual meeting link
  - `notes` (text) - Student's notes/questions
  - `stripe_payment_intent_id` (text) - Stripe payment ID
  - `stripe_transfer_id` (text) - Stripe transfer to TA
  - `cancelled_by` (uuid) - User who cancelled
  - `cancelled_at` (timestamptz) - Cancellation timestamp
  - `cancellation_reason` (text) - Reason for cancellation
  - `completed_at` (timestamptz) - When session was completed
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `booking_reviews`
  - `id` (uuid, primary key)
  - `booking_id` (uuid, foreign key) - References ta_bookings
  - `ta_id` (uuid, foreign key) - References ta_profiles
  - `student_id` (uuid, foreign key) - References auth.users
  - `rating` (integer) - 1-5 stars
  - `review_text` (text) - Written review
  - `created_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - TAs can manage their own profiles and availability
  - Students can view TA profiles and create bookings
  - Both parties can view their own bookings
  - Only students who completed sessions can leave reviews

  ## 3. Business Rules
  - Base rate is for 30 minutes
  - 60-minute sessions: base_rate * 1.8
  - 90-minute sessions: base_rate * 2.5
  - Service charge: $2.50 per booking (kept by platform)
  - Cancellation policy: Free cancellation up to 24 hours before
*/

-- Create ta_profiles table
CREATE TABLE IF NOT EXISTS ta_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  bio text DEFAULT '',
  base_rate_30min decimal(10,2) NOT NULL DEFAULT 25.00,
  specialties text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  stripe_account_id text,
  total_sessions integer DEFAULT 0,
  average_rating decimal(3,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT positive_rate CHECK (base_rate_30min >= 0),
  CONSTRAINT valid_rating CHECK (average_rating >= 0 AND average_rating <= 5)
);

-- Create ta_availability table
CREATE TABLE IF NOT EXISTS ta_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ta_id uuid REFERENCES ta_profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_recurring boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_day CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT valid_times CHECK (start_time < end_time)
);

-- Create ta_bookings table
CREATE TABLE IF NOT EXISTS ta_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ta_id uuid REFERENCES ta_profiles(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_date date NOT NULL,
  start_time time NOT NULL,
  duration_minutes integer NOT NULL,
  session_rate decimal(10,2) NOT NULL,
  service_charge decimal(10,2) DEFAULT 2.50,
  total_amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending',
  meeting_link text,
  notes text,
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  cancelled_by uuid REFERENCES auth.users(id),
  cancelled_at timestamptz,
  cancellation_reason text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_duration CHECK (duration_minutes IN (30, 60, 90)),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'refunded')),
  CONSTRAINT positive_amounts CHECK (session_rate >= 0 AND service_charge >= 0 AND total_amount >= 0)
);

-- Create booking_reviews table
CREATE TABLE IF NOT EXISTS booking_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES ta_bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  ta_id uuid REFERENCES ta_profiles(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL,
  review_text text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ta_profiles_user_id ON ta_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_ta_profiles_is_active ON ta_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_ta_availability_ta_id ON ta_availability(ta_id);
CREATE INDEX IF NOT EXISTS idx_ta_bookings_ta_id ON ta_bookings(ta_id);
CREATE INDEX IF NOT EXISTS idx_ta_bookings_student_id ON ta_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_ta_bookings_status ON ta_bookings(status);
CREATE INDEX IF NOT EXISTS idx_ta_bookings_session_date ON ta_bookings(session_date);
CREATE INDEX IF NOT EXISTS idx_booking_reviews_ta_id ON booking_reviews(ta_id);

-- Enable Row Level Security
ALTER TABLE ta_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ta_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE ta_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ta_profiles

-- Anyone authenticated can view active TA profiles
CREATE POLICY "Anyone can view active TA profiles"
  ON ta_profiles FOR SELECT
  TO authenticated
  USING (is_active = true);

-- TAs can view their own profile (even if inactive)
CREATE POLICY "TAs can view own profile"
  ON ta_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- TAs can create their own profile
CREATE POLICY "TAs can create own profile"
  ON ta_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- TAs can update their own profile
CREATE POLICY "TAs can update own profile"
  ON ta_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ta_availability

-- Anyone can view availability for active TAs
CREATE POLICY "Anyone can view TA availability"
  ON ta_availability FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ta_profiles
      WHERE ta_profiles.id = ta_availability.ta_id
      AND ta_profiles.is_active = true
    )
  );

-- TAs can manage their own availability
CREATE POLICY "TAs can insert own availability"
  ON ta_availability FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ta_profiles
      WHERE ta_profiles.id = ta_availability.ta_id
      AND ta_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "TAs can update own availability"
  ON ta_availability FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ta_profiles
      WHERE ta_profiles.id = ta_availability.ta_id
      AND ta_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ta_profiles
      WHERE ta_profiles.id = ta_availability.ta_id
      AND ta_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "TAs can delete own availability"
  ON ta_availability FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ta_profiles
      WHERE ta_profiles.id = ta_availability.ta_id
      AND ta_profiles.user_id = auth.uid()
    )
  );

-- RLS Policies for ta_bookings

-- TAs can view their bookings
CREATE POLICY "TAs can view own bookings"
  ON ta_bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ta_profiles
      WHERE ta_profiles.id = ta_bookings.ta_id
      AND ta_profiles.user_id = auth.uid()
    )
  );

-- Students can view their bookings
CREATE POLICY "Students can view own bookings"
  ON ta_bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

-- Students can create bookings
CREATE POLICY "Students can create bookings"
  ON ta_bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- TAs and students can update their bookings (status, completion, cancellation)
CREATE POLICY "TAs can update their bookings"
  ON ta_bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ta_profiles
      WHERE ta_profiles.id = ta_bookings.ta_id
      AND ta_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ta_profiles
      WHERE ta_profiles.id = ta_bookings.ta_id
      AND ta_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update own bookings"
  ON ta_bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- RLS Policies for booking_reviews

-- Anyone can view reviews for active TAs
CREATE POLICY "Anyone can view TA reviews"
  ON booking_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ta_profiles
      WHERE ta_profiles.id = booking_reviews.ta_id
      AND ta_profiles.is_active = true
    )
  );

-- Students can create reviews for their completed bookings
CREATE POLICY "Students can create reviews"
  ON booking_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM ta_bookings
      WHERE ta_bookings.id = booking_id
      AND ta_bookings.student_id = auth.uid()
      AND ta_bookings.status = 'completed'
    )
  );

-- Function to update TA rating when review is added
CREATE OR REPLACE FUNCTION update_ta_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ta_profiles
  SET 
    average_rating = (
      SELECT AVG(rating)::decimal(3,2)
      FROM booking_reviews
      WHERE ta_id = NEW.ta_id
    )
  WHERE id = NEW.ta_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update TA rating
DROP TRIGGER IF EXISTS trigger_update_ta_rating ON booking_reviews;
CREATE TRIGGER trigger_update_ta_rating
  AFTER INSERT ON booking_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_ta_rating();

-- Function to increment session count when booking is completed
CREATE OR REPLACE FUNCTION increment_ta_sessions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE ta_profiles
    SET total_sessions = total_sessions + 1
    WHERE id = NEW.ta_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment session count
DROP TRIGGER IF EXISTS trigger_increment_ta_sessions ON ta_bookings;
CREATE TRIGGER trigger_increment_ta_sessions
  AFTER UPDATE ON ta_bookings
  FOR EACH ROW
  EXECUTE FUNCTION increment_ta_sessions();