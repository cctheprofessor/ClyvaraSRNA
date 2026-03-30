/*
  # Add is_admin field to profiles table

  1. Changes
    - Add `is_admin` boolean column to profiles table with default false
    - Set the initial admin user based on email from auth.users
    - Update RLS policies for feed_prompts to use is_admin instead of role

  2. Security
    - Maintains all existing RLS policies
    - Uses is_admin field for admin access control
    - Sets christian.cansino@gmail.com as initial admin

  3. Important Notes
    - This replaces the hardcoded email check in the frontend
    - Admin access is now database-driven
    - Multiple admins can be easily added by updating the is_admin field
*/

-- Add is_admin column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Set the initial admin user by joining with auth.users
UPDATE public.profiles
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email = 'christian.cansino@gmail.com'
);

-- Update feed_prompts RLS policies to use is_admin instead of role
DROP POLICY IF EXISTS "Admins can insert prompts" ON public.feed_prompts;
DROP POLICY IF EXISTS "Admins can update their prompts" ON public.feed_prompts;
DROP POLICY IF EXISTS "Admins can delete their prompts" ON public.feed_prompts;

CREATE POLICY "Admins can insert prompts"
  ON public.feed_prompts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can update their prompts"
  ON public.feed_prompts FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete their prompts"
  ON public.feed_prompts FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );