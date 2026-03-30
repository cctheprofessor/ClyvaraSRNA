/*
  # Fix ML Sync Status RLS Policies

  1. Changes
    - Add INSERT policy for ml_sync_status table to allow users to insert their own sync status
    - Add UPDATE policy for ml_sync_status table to allow users to update their own sync status
  
  2. Security
    - Users can only insert/update their own sync status records
    - Maintains existing SELECT policy
*/

-- Add INSERT policy for ml_sync_status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ml_sync_status' 
    AND policyname = 'Users can insert their own sync status'
  ) THEN
    CREATE POLICY "Users can insert their own sync status"
      ON ml_sync_status
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Add UPDATE policy for ml_sync_status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ml_sync_status' 
    AND policyname = 'Users can update their own sync status'
  ) THEN
    CREATE POLICY "Users can update their own sync status"
      ON ml_sync_status
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;