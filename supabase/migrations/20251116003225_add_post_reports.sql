/*
  # Add Post Reporting System

  1. New Tables
    - `post_reports`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key to feed_posts)
      - `reported_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `post_reports` table
    - Users can create reports for any post
    - Users can view reports they created
    - Once a post is reported, it's hidden from the feed
  
  3. Important Notes
    - First report on a post immediately removes it from the feed
    - Cascade delete: when a post is deleted, all its reports are deleted
*/

-- Create post_reports table
CREATE TABLE IF NOT EXISTS post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, reported_by)
);

-- Enable RLS
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;

-- Users can report any post
CREATE POLICY "Authenticated users can report posts"
  ON post_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
  ON post_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reported_by);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_reported_by ON post_reports(reported_by);
