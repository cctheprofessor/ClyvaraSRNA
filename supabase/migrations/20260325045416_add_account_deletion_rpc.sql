/*
  # Add Account Deletion RPC Function

  ## Summary
  Creates a secure database function that allows users to permanently delete their own account
  and all associated data, in compliance with App Store Guideline 5.1.1(v).

  ## What This Does
  1. Creates `delete_user_account()` - a SECURITY DEFINER function callable by authenticated users
     that deletes ALL data belonging to the calling user across every table, then removes their
     auth.users record entirely.

  ## Data Deleted (in dependency order)
  - booking_messages (messages sent by user)
  - booking_reviews (reviews left by user as student)
  - ta_bookings (bookings where user is the student)
  - ta_availability (availability slots if user is a TA)
  - ta_profiles (TA profile if user is a TA)
  - post_likes, post_comments, post_reports (social interactions)
  - feed_posts (posts created by user)
  - focused_topic_sessions, practice_session_state (study session data)
  - study_sessions, user_question_attempts, study_plans (study history)
  - saved_calculations, care_plans, comprehensive_care_plans (clinical tools data)
  - rejected_questions_log (QA data referencing user)
  - ml_sync_status (ML backend sync record)
  - donations (donation records)
  - stripe_customers (Stripe customer record)
  - anonymous_questions, anonymous_responses (anonymous community posts)
  - profiles (user profile)
  - auth.users (auth record — permanently deletes login)

  ## Security
  - Function runs as SECURITY DEFINER (elevated privileges needed to delete from auth.users)
  - Only the authenticated user calling the function can delete their own account
  - Uses auth.uid() to identify the caller — cannot be spoofed
*/

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calling_user_id uuid;
  user_ta_profile_id uuid;
BEGIN
  calling_user_id := auth.uid();

  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get TA profile ID if exists (needed for cascaded deletes)
  SELECT id INTO user_ta_profile_id
  FROM public.ta_profiles
  WHERE user_id = calling_user_id;

  -- Delete booking messages sent by user
  DELETE FROM public.booking_messages
  WHERE sender_id = calling_user_id;

  -- Delete booking reviews where user is student
  DELETE FROM public.booking_reviews
  WHERE student_id = calling_user_id;

  -- Delete TA-related data if user is a TA
  IF user_ta_profile_id IS NOT NULL THEN
    DELETE FROM public.booking_messages
    WHERE booking_id IN (
      SELECT id FROM public.ta_bookings WHERE ta_id = user_ta_profile_id
    );

    DELETE FROM public.booking_reviews
    WHERE ta_id = user_ta_profile_id;

    DELETE FROM public.ta_availability
    WHERE ta_id = user_ta_profile_id;

    DELETE FROM public.ta_bookings
    WHERE ta_id = user_ta_profile_id;
  END IF;

  -- Delete student bookings
  DELETE FROM public.ta_bookings
  WHERE student_id = calling_user_id;

  -- Delete TA profile
  DELETE FROM public.ta_profiles
  WHERE user_id = calling_user_id;

  -- Delete social feed data
  DELETE FROM public.post_reports WHERE reported_by = calling_user_id;
  DELETE FROM public.post_likes WHERE user_id = calling_user_id;
  DELETE FROM public.post_comments WHERE user_id = calling_user_id;

  -- Delete posts (comments/likes/reports on user posts cascade via FK)
  DELETE FROM public.feed_posts WHERE user_id = calling_user_id;

  -- Delete study data
  DELETE FROM public.focused_topic_sessions WHERE user_id = calling_user_id;
  DELETE FROM public.practice_session_state WHERE user_id = calling_user_id;
  DELETE FROM public.study_sessions WHERE user_id = calling_user_id;
  DELETE FROM public.user_question_attempts WHERE user_id = calling_user_id;
  DELETE FROM public.study_plans WHERE user_id = calling_user_id;

  -- Delete clinical tools data
  DELETE FROM public.saved_calculations WHERE user_id = calling_user_id;
  DELETE FROM public.care_plans WHERE user_id = calling_user_id;
  DELETE FROM public.comprehensive_care_plans WHERE user_id = calling_user_id;

  -- Delete QA/ML data
  DELETE FROM public.rejected_questions_log WHERE supabase_user_id = calling_user_id;
  DELETE FROM public.ml_sync_status WHERE user_id = calling_user_id;

  -- Delete financial records
  DELETE FROM public.donations WHERE user_id = calling_user_id;
  DELETE FROM public.stripe_customers WHERE user_id = calling_user_id;

  -- Delete community data
  DELETE FROM public.anonymous_responses WHERE created_by = calling_user_id;
  DELETE FROM public.anonymous_questions WHERE created_by = calling_user_id;

  -- Delete clinical site data created by user
  DELETE FROM public.preceptor_tips WHERE created_by = calling_user_id;
  DELETE FROM public.case_tips WHERE created_by = calling_user_id;

  -- Delete ta_requests and ta_users data
  DELETE FROM public.ta_requests WHERE user_id = calling_user_id;
  DELETE FROM public.ta_users WHERE user_id = calling_user_id;

  -- Delete profile (must come before auth.users)
  DELETE FROM public.profiles WHERE id = calling_user_id;

  -- Finally delete the auth user record
  DELETE FROM auth.users WHERE id = calling_user_id;
END;
$$;

-- Grant execute permission to authenticated users only
REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
