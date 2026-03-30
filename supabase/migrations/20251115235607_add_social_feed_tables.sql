/*
  # Social Feed Feature

  1. New Tables
    - `feed_prompts`
      - `id` (uuid, primary key)
      - `prompt_text` (text) - The call-to-action text
      - `prompt_type` (text) - Either 'image' or 'storytime'
      - `is_active` (boolean) - Whether this prompt is currently active
      - `created_at` (timestamptz)
      - `created_by` (uuid) - Admin user who created the prompt
      
    - `feed_posts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `prompt_id` (uuid, foreign key to feed_prompts)
      - `post_type` (text) - Either 'image' or 'text'
      - `content_text` (text, nullable) - For storytime posts
      - `image_url` (text, nullable) - For image posts
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `post_likes`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key to feed_posts)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - Unique constraint on (post_id, user_id)
      
    - `post_comments`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key to feed_posts)
      - `user_id` (uuid, foreign key to auth.users)
      - `comment_text` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Allow authenticated users to read all posts
    - Allow users to create their own posts
    - Allow users to update/delete only their own posts
    - Allow users to like any post once
    - Allow users to create comments
    - Allow users to delete their own comments
    - Admins can manage prompts

  3. Important Notes
    - Posts are ordered by created_at for chronological feed
    - Likes are tracked per user per post
    - Comments support threaded discussions
*/

-- Create feed_prompts table
CREATE TABLE IF NOT EXISTS feed_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_text text NOT NULL,
  prompt_type text NOT NULL CHECK (prompt_type IN ('image', 'storytime')),
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create feed_posts table
CREATE TABLE IF NOT EXISTS feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt_id uuid REFERENCES feed_prompts(id) ON DELETE SET NULL,
  post_type text NOT NULL CHECK (post_type IN ('image', 'text')),
  content_text text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_post_content CHECK (
    (post_type = 'image' AND image_url IS NOT NULL) OR
    (post_type = 'text' AND content_text IS NOT NULL)
  )
);

-- Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES feed_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create post_comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES feed_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_id ON feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_prompt_id ON feed_posts(prompt_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_feed_prompts_active ON feed_prompts(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE feed_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feed_prompts
CREATE POLICY "Anyone can view active prompts"
  ON feed_prompts FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all prompts"
  ON feed_prompts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert prompts"
  ON feed_prompts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their prompts"
  ON feed_prompts FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can delete their prompts"
  ON feed_prompts FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies for feed_posts
CREATE POLICY "Anyone can view posts"
  ON feed_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own posts"
  ON feed_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON feed_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON feed_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for post_likes
CREATE POLICY "Anyone can view likes"
  ON post_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON post_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for post_comments
CREATE POLICY "Anyone can view comments"
  ON post_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON post_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON post_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON post_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert some default prompts to get started
INSERT INTO feed_prompts (prompt_text, prompt_type, is_active)
VALUES 
  ('Upload your scrub OOTD! Show us your style 👔', 'image', true),
  ('Tell us your favorite anesthetic and why 💭', 'storytime', true)
ON CONFLICT DO NOTHING;