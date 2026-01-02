/*
  # Fix admin update policy for feed_prompts

  1. Changes
    - Update UPDATE policy to allow admins to update ANY prompt, not just their own
    - Removes the created_by restriction from the USING clause

  2. Security
    - Still requires is_admin = true to update
    - Maintains authentication requirements
*/

-- Drop the existing restrictive update policy
DROP POLICY IF EXISTS "Admins can update their prompts" ON public.feed_prompts;

-- Create new policy that allows admins to update any prompt
CREATE POLICY "Admins can update any prompt"
  ON public.feed_prompts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );