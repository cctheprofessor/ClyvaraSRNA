/*
  # Update day_of_week Constraint to ISO Format

  This migration updates the check constraint on ta_availability to accept ISO day format (1-7).
  
  ## Changes
  - Drops the old constraint that checked for JavaScript format (0-6)
  - Adds a new constraint that checks for ISO format (1-7)
    - 1 = Monday
    - 2 = Tuesday
    - 3 = Wednesday
    - 4 = Thursday
    - 5 = Friday
    - 6 = Saturday
    - 7 = Sunday
*/

ALTER TABLE ta_availability
DROP CONSTRAINT IF EXISTS valid_day;

ALTER TABLE ta_availability
ADD CONSTRAINT valid_day CHECK (day_of_week >= 1 AND day_of_week <= 7);
