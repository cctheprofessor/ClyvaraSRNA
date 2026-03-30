/*
  # Fix admin delete policy for feed_prompts

  1. Changes
    - Update DELETE policy to allow admins to delete ANY prompt, not just their own
    - This matches the expected behavior where admins manage all prompts

  2. Security
    - Still requires is_admin = true to delete
    - Maintains authentication requirements
*/

-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Admins can delete their prompts" ON public.feed_prompts;

-- Create new policy that allows admins to delete any prompt
CREATE POLICY "Admins can delete any prompt"
  ON public.feed_prompts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );