/*
  # Fix TA Availability Day Format

  This migration converts day_of_week values from JavaScript format (0-6) to ISO format (1-7).
  
  ## Changes
  - Updates any Sunday entries (day_of_week = 0) to ISO Sunday (7)
  - All other days (1-6) remain the same as they align between both formats:
    - Monday = 1 (both)
    - Tuesday = 2 (both)
    - Wednesday = 3 (both)
    - Thursday = 4 (both)
    - Friday = 5 (both)
    - Saturday = 6 (both)
    - Sunday = 0 (JS) → 7 (ISO)
*/

UPDATE ta_availability
SET day_of_week = 7
WHERE day_of_week = 0;
