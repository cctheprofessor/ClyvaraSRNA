/*
  # Add rejected questions log table

  1. New Tables
    - `rejected_questions_log`
      - `id` (uuid, primary key) - Unique identifier for each log entry
      - `question_id` (text) - ID of the rejected question from ML backend
      - `question_type` (text) - Type of question that was rejected
      - `ml_user_id` (integer) - ML backend user ID associated with the rejection
      - `supabase_user_id` (uuid, foreign key) - Supabase user who received the bad question
      - `validation_errors` (jsonb) - Array of validation error messages
      - `question_data` (jsonb) - Full question data for debugging
      - `created_at` (timestamptz) - When the question was rejected
      - `resolved` (boolean) - Whether the issue has been addressed (default false)
      - `resolved_at` (timestamptz) - When the issue was resolved
      - `resolution_notes` (text) - Notes about how the issue was resolved

  2. Security
    - Enable RLS on `rejected_questions_log` table
    - Add policy for users to view their own rejected questions
    - Add policy for admins to view all rejected questions
    - Add policy for authenticated users to insert their own rejected questions

  3. Indexes
    - Index on `supabase_user_id` for faster user lookups
    - Index on `question_id` for faster question lookups
    - Index on `created_at` for time-based queries
    - Index on `resolved` for filtering unresolved issues

  4. Important Notes
    - This table helps track data quality issues from the ML backend
    - Provides visibility into which questions are malformed
    - Enables analysis of patterns in bad questions
    - Supports debugging and quality improvement efforts
*/

-- Create rejected_questions_log table
CREATE TABLE IF NOT EXISTS rejected_questions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id text NOT NULL,
  question_type text NOT NULL,
  ml_user_id integer NOT NULL,
  supabase_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  question_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolution_notes text
);

-- Enable RLS
ALTER TABLE rejected_questions_log ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rejected_questions_user 
  ON rejected_questions_log(supabase_user_id);

CREATE INDEX IF NOT EXISTS idx_rejected_questions_question_id 
  ON rejected_questions_log(question_id);

CREATE INDEX IF NOT EXISTS idx_rejected_questions_created_at 
  ON rejected_questions_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rejected_questions_resolved 
  ON rejected_questions_log(resolved) WHERE resolved = false;

-- RLS Policies

-- Users can view their own rejected questions
CREATE POLICY "Users can view own rejected questions"
  ON rejected_questions_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = supabase_user_id);

-- Users can insert their own rejected questions
CREATE POLICY "Users can insert own rejected questions"
  ON rejected_questions_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = supabase_user_id);

-- Note: Admin policies would be added separately if needed
-- For now, users can only access their own data
