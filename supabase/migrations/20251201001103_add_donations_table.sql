/*
  # Add Donations Table

  ## Summary
  Creates donation tracking table for Stripe payment integration
  
  ## Tables Created
  
  ### donations
  Tracks all donation transactions from users
  - id (uuid, primary key)
  - user_id (uuid, references profiles)
  - stripe_payment_intent_id (text, unique)
  - stripe_customer_id (text)
  - amount (integer) - Amount in cents
  - currency (text) - Default 'usd'
  - donation_type (text) - 'one_time' or 'monthly'
  - status (text) - 'pending', 'completed', 'failed', 'refunded'
  - stripe_session_id (text) - Checkout session ID
  - metadata (jsonb) - Additional payment metadata
  - created_at (timestamptz)
  - updated_at (timestamptz)
  
  ## Security
  - RLS enabled
  - Users can view their own donations
  - Only authenticated users can access donation data
*/

-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id text UNIQUE,
  stripe_customer_id text,
  stripe_session_id text,
  amount integer NOT NULL CHECK (amount > 0),
  currency text DEFAULT 'usd' NOT NULL,
  donation_type text DEFAULT 'one_time' CHECK (donation_type IN ('one_time', 'monthly')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS donations_user_id_idx ON donations(user_id);
CREATE INDEX IF NOT EXISTS donations_stripe_payment_intent_idx ON donations(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS donations_stripe_session_idx ON donations(stripe_session_id);
CREATE INDEX IF NOT EXISTS donations_status_idx ON donations(status);
CREATE INDEX IF NOT EXISTS donations_created_at_idx ON donations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for donations
CREATE POLICY "Users can view own donations"
  ON donations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own donations"
  ON donations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_donations_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_donations_updated_at_trigger
  BEFORE UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_donations_updated_at_column();
