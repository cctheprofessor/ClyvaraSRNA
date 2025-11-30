/*
  # Add CASCADE delete to feed tables

  This migration updates the foreign key constraints on post_likes and post_comments
  tables to CASCADE delete when a post is deleted. This ensures that when a user
  deletes their post, all associated likes and comments are automatically removed.

  ## Changes
  - Drop and recreate foreign key on post_likes.post_id with ON DELETE CASCADE
  - Drop and recreate foreign key on post_comments.post_id with ON DELETE CASCADE
*/

DO $$ 
BEGIN
  -- Update post_likes foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'post_likes_post_id_fkey' 
    AND table_name = 'post_likes'
  ) THEN
    ALTER TABLE post_likes DROP CONSTRAINT post_likes_post_id_fkey;
  END IF;
  
  ALTER TABLE post_likes 
    ADD CONSTRAINT post_likes_post_id_fkey 
    FOREIGN KEY (post_id) 
    REFERENCES feed_posts(id) 
    ON DELETE CASCADE;

  -- Update post_comments foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'post_comments_post_id_fkey' 
    AND table_name = 'post_comments'
  ) THEN
    ALTER TABLE post_comments DROP CONSTRAINT post_comments_post_id_fkey;
  END IF;
  
  ALTER TABLE post_comments 
    ADD CONSTRAINT post_comments_post_id_fkey 
    FOREIGN KEY (post_id) 
    REFERENCES feed_posts(id) 
    ON DELETE CASCADE;
END $$;
