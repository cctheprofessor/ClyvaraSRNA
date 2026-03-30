/*
  # Add Question Rationales Cache

  1. New Tables
    - `question_rationales`
      - `question_id` (text, primary key) - The question ID
      - `rationale` (text) - The explanation/rationale text
      - `option_rationales` (jsonb) - Per-option rationales
      - `correct_answers` (jsonb) - Array of correct answers
      - `created_at` (timestamptz) - When the rationale was cached
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `question_rationales` table
    - Add policy for authenticated users to read rationales
    - Add policy for authenticated users to insert/update their own rationales

  3. Purpose
    - Cache ML backend rationales locally to reduce API calls
    - Improve response time when showing explanations
    - Reduce network latency for better UX
*/

CREATE TABLE IF NOT EXISTS question_rationales (
  question_id text PRIMARY KEY,
  rationale text,
  option_rationales jsonb DEFAULT '{}'::jsonb,
  correct_answers jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE question_rationales ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read rationales
CREATE POLICY "Authenticated users can read rationales"
  ON question_rationales
  FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can insert rationales
CREATE POLICY "Authenticated users can insert rationales"
  ON question_rationales
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- All authenticated users can update rationales
CREATE POLICY "Authenticated users can update rationales"
  ON question_rationales
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_question_rationales_question_id ON question_rationales(question_id);
