/*
  # Remove Unused Indexes

  ## Summary
  Drops all unused indexes that are consuming storage and maintenance overhead
  without providing any query performance benefits.

  ## Changes
  
  ### Indexes Removed (46 total)
  
  #### Feed & Social Features
  - idx_feed_posts_prompt_id
  - idx_post_comments_created_at
  - idx_post_comments_user_id
  - idx_feed_prompts_active
  - idx_feed_prompts_created_by
  
  #### Care Plans & Calculations
  - idx_care_plans_created_at
  - idx_saved_calculations_type
  - idx_saved_calculations_created_at
  
  #### Study Features
  - idx_study_plans_is_active
  - idx_study_topics_category
  - idx_practice_questions_topic
  - idx_user_attempts_question_id
  - idx_study_sessions_study_plan_id
  - idx_study_sessions_topic_id
  - idx_focused_topic_sessions_user_id
  
  #### Profile & ML Sync
  - idx_profiles_ml_user_id
  - idx_profiles_institution_cohort
  - idx_profiles_enrollment_date
  - idx_profiles_is_active
  - idx_ml_sync_status_user_id
  - idx_ml_sync_status_status
  
  #### TA System
  - idx_ta_users_user_id
  - idx_ta_users_active
  - idx_ta_requests_user_id
  - idx_ta_requests_status
  - idx_ta_requests_assigned_ta
  - idx_ta_requests_created_at
  
  #### Clinical Tools
  - idx_clinical_sites_hospital
  - idx_clinical_sites_created_by
  - idx_case_types_name
  - idx_case_types_created_by
  - idx_case_tips_created_at
  - idx_case_tips_created_by
  - idx_preceptors_name
  - idx_preceptors_created_by
  - idx_preceptor_tips_created_at
  - idx_preceptor_tips_created_by
  
  #### Anonymous Q&A
  - idx_anonymous_questions_created_by
  - idx_anonymous_responses_created_at
  - idx_anonymous_responses_created_by
  
  #### Donations
  - donations_user_id_idx
  - donations_stripe_payment_intent_idx
  - donations_stripe_session_idx
  - donations_status_idx
  - donations_created_at_idx
  
  #### Medical References
  - idx_medical_references_category

  ## Notes
  - These indexes have not been used by any queries
  - Foreign key constraints remain intact and continue to enforce referential integrity
  - Primary key indexes remain in place
  - If query patterns change in the future, indexes can be recreated as needed
*/

-- Feed & Social Features
DROP INDEX IF EXISTS public.idx_feed_posts_prompt_id;
DROP INDEX IF EXISTS public.idx_post_comments_created_at;
DROP INDEX IF EXISTS public.idx_post_comments_user_id;
DROP INDEX IF EXISTS public.idx_feed_prompts_active;
DROP INDEX IF EXISTS public.idx_feed_prompts_created_by;

-- Care Plans & Calculations
DROP INDEX IF EXISTS public.idx_care_plans_created_at;
DROP INDEX IF EXISTS public.idx_saved_calculations_type;
DROP INDEX IF EXISTS public.idx_saved_calculations_created_at;

-- Study Features
DROP INDEX IF EXISTS public.idx_study_plans_is_active;
DROP INDEX IF EXISTS public.idx_study_topics_category;
DROP INDEX IF EXISTS public.idx_practice_questions_topic;
DROP INDEX IF EXISTS public.idx_user_attempts_question_id;
DROP INDEX IF EXISTS public.idx_study_sessions_study_plan_id;
DROP INDEX IF EXISTS public.idx_study_sessions_topic_id;
DROP INDEX IF EXISTS public.idx_focused_topic_sessions_user_id;

-- Profile & ML Sync
DROP INDEX IF EXISTS public.idx_profiles_ml_user_id;
DROP INDEX IF EXISTS public.idx_profiles_institution_cohort;
DROP INDEX IF EXISTS public.idx_profiles_enrollment_date;
DROP INDEX IF EXISTS public.idx_profiles_is_active;
DROP INDEX IF EXISTS public.idx_ml_sync_status_user_id;
DROP INDEX IF EXISTS public.idx_ml_sync_status_status;

-- TA System
DROP INDEX IF EXISTS public.idx_ta_users_user_id;
DROP INDEX IF EXISTS public.idx_ta_users_active;
DROP INDEX IF EXISTS public.idx_ta_requests_user_id;
DROP INDEX IF EXISTS public.idx_ta_requests_status;
DROP INDEX IF EXISTS public.idx_ta_requests_assigned_ta;
DROP INDEX IF EXISTS public.idx_ta_requests_created_at;

-- Clinical Tools
DROP INDEX IF EXISTS public.idx_clinical_sites_hospital;
DROP INDEX IF EXISTS public.idx_clinical_sites_created_by;
DROP INDEX IF EXISTS public.idx_case_types_name;
DROP INDEX IF EXISTS public.idx_case_types_created_by;
DROP INDEX IF EXISTS public.idx_case_tips_created_at;
DROP INDEX IF EXISTS public.idx_case_tips_created_by;
DROP INDEX IF EXISTS public.idx_preceptors_name;
DROP INDEX IF EXISTS public.idx_preceptors_created_by;
DROP INDEX IF EXISTS public.idx_preceptor_tips_created_at;
DROP INDEX IF EXISTS public.idx_preceptor_tips_created_by;

-- Anonymous Q&A
DROP INDEX IF EXISTS public.idx_anonymous_questions_created_by;
DROP INDEX IF EXISTS public.idx_anonymous_responses_created_at;
DROP INDEX IF EXISTS public.idx_anonymous_responses_created_by;

-- Donations
DROP INDEX IF EXISTS public.donations_user_id_idx;
DROP INDEX IF EXISTS public.donations_stripe_payment_intent_idx;
DROP INDEX IF EXISTS public.donations_stripe_session_idx;
DROP INDEX IF EXISTS public.donations_status_idx;
DROP INDEX IF EXISTS public.donations_created_at_idx;

-- Medical References
DROP INDEX IF EXISTS public.idx_medical_references_category;
