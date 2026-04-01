/*
  # Remove Payment Fields from TA Booking System

  ## Summary
  Removes all payment-related columns and constraints from the TA booking
  system, converting it to a free scheduling/booking service with no costs.

  ## Changes

  ### `ta_bookings` table
  - Drops columns: `session_rate`, `service_charge`, `total_amount`,
    `stripe_payment_intent_id`, `stripe_transfer_id`
  - Drops constraint: `positive_amounts` (referenced removed columns)

  ### `ta_profiles` table
  - Drops columns: `base_rate_30min`, `stripe_account_id`
  - Drops constraint: `positive_rate` (referenced removed column)

  ## Notes
  - All existing bookings are preserved; only payment-specific columns are removed
  - The scheduling, approval, and completion workflow remains fully intact
*/

-- Remove payment constraint and columns from ta_bookings
ALTER TABLE ta_bookings DROP CONSTRAINT IF EXISTS positive_amounts;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ta_bookings' AND column_name = 'session_rate') THEN
    ALTER TABLE ta_bookings DROP COLUMN session_rate;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ta_bookings' AND column_name = 'service_charge') THEN
    ALTER TABLE ta_bookings DROP COLUMN service_charge;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ta_bookings' AND column_name = 'total_amount') THEN
    ALTER TABLE ta_bookings DROP COLUMN total_amount;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ta_bookings' AND column_name = 'stripe_payment_intent_id') THEN
    ALTER TABLE ta_bookings DROP COLUMN stripe_payment_intent_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ta_bookings' AND column_name = 'stripe_transfer_id') THEN
    ALTER TABLE ta_bookings DROP COLUMN stripe_transfer_id;
  END IF;
END $$;

-- Remove payment constraint and columns from ta_profiles
ALTER TABLE ta_profiles DROP CONSTRAINT IF EXISTS positive_rate;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ta_profiles' AND column_name = 'base_rate_30min') THEN
    ALTER TABLE ta_profiles DROP COLUMN base_rate_30min;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ta_profiles' AND column_name = 'stripe_account_id') THEN
    ALTER TABLE ta_profiles DROP COLUMN stripe_account_id;
  END IF;
END $$;
