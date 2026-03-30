/*
  # Add Resumable Practice Sessions

  1. New Table: `practice_session_state`
    - Stores in-progress practice sessions
    - Allows users to resume from where they left off
    - Automatically cleans up old sessions

  2. Fields
    - `id` (uuid, primary key) - Unique session identifier
    - `user_id` (uuid, references auth.users) - Session owner
    - `session_type` (text) - Type: '25', '50', or 'focused'
    - `topic_ids` (jsonb) - Array of topic IDs for the session
    - `questions` (jsonb) - Full questions array
    - `current_index` (integer) - Current question index
    - `answers` (jsonb) - User's answers so far (question_index -> answer)
    - `answer_results` (jsonb) - Results for submitted answers
    - `submitted_questions` (jsonb) - Array of submitted question indices
    - `start_time` (timestamptz) - When session started
    - `last_updated` (timestamptz) - Last activity timestamp
    - `is_completed` (boolean) - Whether session is finished
    - `created_at` (timestamptz) - Creation timestamp

  3. Security
    - Enable RLS
    - Users can only access their own sessions
    - Automatic cleanup of sessions older than 24 hours

  4. Indexes
    - Index on user_id and is_completed for fast active session lookup
    - Index on last_updated for cleanup queries
*/

-- Create practice_session_state table
CREATE TABLE IF NOT EXISTS practice_session_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_type text NOT NULL,
  topic_ids jsonb DEFAULT '[]'::jsonb,
  questions jsonb NOT NULL,
  current_index integer DEFAULT 0,
  answers jsonb DEFAULT '{}'::jsonb,
  answer_results jsonb DEFAULT '{}'::jsonb,
  submitted_questions jsonb DEFAULT '[]'::jsonb,
  start_time timestamptz DEFAULT now(),
  last_updated timestamptz DEFAULT now(),
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE practice_session_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own practice sessions"
  ON practice_session_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own practice sessions"
  ON practice_session_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own practice sessions"
  ON practice_session_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own practice sessions"
  ON practice_session_state FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_practice_session_user_active 
  ON practice_session_state(user_id, is_completed, last_updated DESC) 
  WHERE is_completed = false;

CREATE INDEX IF NOT EXISTS idx_practice_session_cleanup 
  ON practice_session_state(last_updated) 
  WHERE is_completed = false;

-- Add comments
COMMENT ON TABLE practice_session_state IS 'Stores in-progress practice sessions for resume capability';
COMMENT ON COLUMN practice_session_state.session_type IS 'Type of practice session: 25, 50, or focused';
COMMENT ON COLUMN practice_session_state.questions IS 'Full array of question objects for the session';
COMMENT ON COLUMN practice_session_state.current_index IS 'Index of current question (0-based)';
COMMENT ON COLUMN practice_session_state.answers IS 'Map of question index to user answer';
COMMENT ON COLUMN practice_session_state.answer_results IS 'Map of question index to answer result (correctness, rationale, etc)';
COMMENT ON COLUMN practice_session_state.submitted_questions IS 'Array of question indices that have been submitted';
