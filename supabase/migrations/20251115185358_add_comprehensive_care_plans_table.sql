/*
  # Create Comprehensive Care Plans Table

  1. New Tables
    - `comprehensive_care_plans`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `case_description` (text) - original case input
      - `care_plan_data` (jsonb) - complete structured care plan
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `comprehensive_care_plans` table
    - Add policies for authenticated users to manage their own care plans
*/

CREATE TABLE IF NOT EXISTS comprehensive_care_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  case_description text NOT NULL,
  care_plan_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE comprehensive_care_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own care plans
CREATE POLICY "Users can view own comprehensive care plans"
  ON comprehensive_care_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can create their own care plans
CREATE POLICY "Users can create own comprehensive care plans"
  ON comprehensive_care_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own care plans
CREATE POLICY "Users can update own comprehensive care plans"
  ON comprehensive_care_plans
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own care plans
CREATE POLICY "Users can delete own comprehensive care plans"
  ON comprehensive_care_plans
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_comprehensive_care_plans_user_id 
  ON comprehensive_care_plans(user_id);

CREATE INDEX IF NOT EXISTS idx_comprehensive_care_plans_created_at 
  ON comprehensive_care_plans(created_at DESC);
