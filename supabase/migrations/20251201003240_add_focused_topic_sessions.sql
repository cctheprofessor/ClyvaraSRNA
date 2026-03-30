/*
  # Add Focused Topic Practice Sessions

  1. New Tables
    - `focused_topic_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `topic_id` (integer, references NCE topic)
      - `topic_name` (text, name of the topic)
      - `topic_path` (text, full NCE path like "I.A.1")
      - `questions_count` (integer, total questions in session)
      - `current_question_index` (integer, current progress)
      - `is_completed` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `completed_at` (timestamptz, nullable)

  2. Security
    - Enable RLS on `focused_topic_sessions` table
    - Add policies for authenticated users to manage their own sessions
*/

CREATE TABLE IF NOT EXISTS focused_topic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic_id integer NOT NULL,
  topic_name text NOT NULL,
  topic_path text NOT NULL,
  questions_count integer NOT NULL DEFAULT 10,
  current_question_index integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE focused_topic_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own focused topic sessions"
  ON focused_topic_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own focused topic sessions"
  ON focused_topic_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focused topic sessions"
  ON focused_topic_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own focused topic sessions"
  ON focused_topic_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_focused_topic_sessions_user_id ON focused_topic_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focused_topic_sessions_completed ON focused_topic_sessions(user_id, is_completed);
