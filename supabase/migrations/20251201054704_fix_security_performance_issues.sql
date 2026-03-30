/*
  # Fix Security and Performance Issues

  ## Changes Made

  ### 1. Add Missing Foreign Key Indexes
  Creates indexes on all foreign key columns that were missing them:
  - anonymous_questions.created_by
  - anonymous_responses.created_by
  - case_tips.created_by
  - case_types.created_by
  - clinical_sites.created_by
  - feed_prompts.created_by
  - post_comments.user_id
  - preceptor_tips.created_by
  - preceptors.created_by
  - study_sessions.study_plan_id
  - study_sessions.topic_id

  ### 2. Optimize RLS Policies
  Updates all RLS policies to use `(select auth.uid())` instead of `auth.uid()` 
  to prevent re-evaluation for each row, improving query performance at scale.

  ### 3. Fix Function Search Paths
  Updates functions to have immutable search paths for security

  ### 4. Fix Multiple Permissive Policies
  Removes duplicate SELECT policy on feed_prompts table
*/

-- =====================================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_anonymous_questions_created_by 
  ON public.anonymous_questions(created_by);

CREATE INDEX IF NOT EXISTS idx_anonymous_responses_created_by 
  ON public.anonymous_responses(created_by);

CREATE INDEX IF NOT EXISTS idx_case_tips_created_by 
  ON public.case_tips(created_by);

CREATE INDEX IF NOT EXISTS idx_case_types_created_by 
  ON public.case_types(created_by);

CREATE INDEX IF NOT EXISTS idx_clinical_sites_created_by 
  ON public.clinical_sites(created_by);

CREATE INDEX IF NOT EXISTS idx_feed_prompts_created_by 
  ON public.feed_prompts(created_by);

CREATE INDEX IF NOT EXISTS idx_post_comments_user_id 
  ON public.post_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_preceptor_tips_created_by 
  ON public.preceptor_tips(created_by);

CREATE INDEX IF NOT EXISTS idx_preceptors_created_by 
  ON public.preceptors(created_by);

CREATE INDEX IF NOT EXISTS idx_study_sessions_study_plan_id 
  ON public.study_sessions(study_plan_id);

CREATE INDEX IF NOT EXISTS idx_study_sessions_topic_id 
  ON public.study_sessions(topic_id);

-- =====================================================
-- PART 2: OPTIMIZE RLS POLICIES - PROFILES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- =====================================================
-- PART 3: OPTIMIZE RLS POLICIES - CARE_PLANS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own care plans" ON public.care_plans;
DROP POLICY IF EXISTS "Users can insert own care plans" ON public.care_plans;
DROP POLICY IF EXISTS "Users can update own care plans" ON public.care_plans;
DROP POLICY IF EXISTS "Users can delete own care plans" ON public.care_plans;

CREATE POLICY "Users can view own care plans"
  ON public.care_plans FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own care plans"
  ON public.care_plans FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own care plans"
  ON public.care_plans FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own care plans"
  ON public.care_plans FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- PART 4: OPTIMIZE RLS POLICIES - SAVED_CALCULATIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own calculations" ON public.saved_calculations;
DROP POLICY IF EXISTS "Users can insert own calculations" ON public.saved_calculations;
DROP POLICY IF EXISTS "Users can delete own calculations" ON public.saved_calculations;

CREATE POLICY "Users can view own calculations"
  ON public.saved_calculations FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own calculations"
  ON public.saved_calculations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own calculations"
  ON public.saved_calculations FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- PART 5: OPTIMIZE RLS POLICIES - STUDY_PLANS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own study plans" ON public.study_plans;
DROP POLICY IF EXISTS "Users can insert own study plans" ON public.study_plans;
DROP POLICY IF EXISTS "Users can update own study plans" ON public.study_plans;
DROP POLICY IF EXISTS "Users can delete own study plans" ON public.study_plans;

CREATE POLICY "Users can view own study plans"
  ON public.study_plans FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own study plans"
  ON public.study_plans FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own study plans"
  ON public.study_plans FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own study plans"
  ON public.study_plans FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- PART 6: OPTIMIZE RLS POLICIES - USER_QUESTION_ATTEMPTS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own attempts" ON public.user_question_attempts;
DROP POLICY IF EXISTS "Users can insert own attempts" ON public.user_question_attempts;

CREATE POLICY "Users can view own attempts"
  ON public.user_question_attempts FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own attempts"
  ON public.user_question_attempts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- PART 7: OPTIMIZE RLS POLICIES - STUDY_SESSIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.study_sessions;

CREATE POLICY "Users can view own sessions"
  ON public.study_sessions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own sessions"
  ON public.study_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own sessions"
  ON public.study_sessions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- PART 8: OPTIMIZE RLS POLICIES - COMPREHENSIVE_CARE_PLANS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own comprehensive care plans" ON public.comprehensive_care_plans;
DROP POLICY IF EXISTS "Users can create own comprehensive care plans" ON public.comprehensive_care_plans;
DROP POLICY IF EXISTS "Users can update own comprehensive care plans" ON public.comprehensive_care_plans;
DROP POLICY IF EXISTS "Users can delete own comprehensive care plans" ON public.comprehensive_care_plans;

CREATE POLICY "Users can view own comprehensive care plans"
  ON public.comprehensive_care_plans FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own comprehensive care plans"
  ON public.comprehensive_care_plans FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own comprehensive care plans"
  ON public.comprehensive_care_plans FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own comprehensive care plans"
  ON public.comprehensive_care_plans FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- PART 9: OPTIMIZE RLS POLICIES - FEED_PROMPTS
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view active prompts" ON public.feed_prompts;
DROP POLICY IF EXISTS "Authenticated users can view all prompts" ON public.feed_prompts;
DROP POLICY IF EXISTS "Admins can insert prompts" ON public.feed_prompts;
DROP POLICY IF EXISTS "Admins can update their prompts" ON public.feed_prompts;
DROP POLICY IF EXISTS "Admins can delete their prompts" ON public.feed_prompts;

-- Keep only one SELECT policy for authenticated users
CREATE POLICY "Authenticated users can view all prompts"
  ON public.feed_prompts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert prompts"
  ON public.feed_prompts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update their prompts"
  ON public.feed_prompts FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete their prompts"
  ON public.feed_prompts FOR DELETE
  TO authenticated
  USING (
    created_by = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- =====================================================
-- PART 10: OPTIMIZE RLS POLICIES - FEED_POSTS
-- =====================================================

DROP POLICY IF EXISTS "Users can create their own posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.feed_posts;

CREATE POLICY "Users can create their own posts"
  ON public.feed_posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own posts"
  ON public.feed_posts FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own posts"
  ON public.feed_posts FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- PART 11: OPTIMIZE RLS POLICIES - POST_LIKES
-- =====================================================

DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
DROP POLICY IF EXISTS "Users can unlike their own likes" ON public.post_likes;

CREATE POLICY "Users can like posts"
  ON public.post_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can unlike their own likes"
  ON public.post_likes FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- PART 12: OPTIMIZE RLS POLICIES - POST_COMMENTS
-- =====================================================

DROP POLICY IF EXISTS "Users can create comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.post_comments;

CREATE POLICY "Users can create comments"
  ON public.post_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own comments"
  ON public.post_comments FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own comments"
  ON public.post_comments FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- PART 13: OPTIMIZE RLS POLICIES - POST_REPORTS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can report posts" ON public.post_reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON public.post_reports;

CREATE POLICY "Authenticated users can report posts"
  ON public.post_reports FOR INSERT
  TO authenticated
  WITH CHECK (reported_by = (select auth.uid()));

CREATE POLICY "Users can view their own reports"
  ON public.post_reports FOR SELECT
  TO authenticated
  USING (reported_by = (select auth.uid()));

-- =====================================================
-- PART 14: OPTIMIZE RLS POLICIES - STRIPE_CUSTOMERS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own customer data" ON public.stripe_customers;

CREATE POLICY "Users can view their own customer data"
  ON public.stripe_customers FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- PART 15: OPTIMIZE RLS POLICIES - STRIPE_SUBSCRIPTIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own subscription data" ON public.stripe_subscriptions;

CREATE POLICY "Users can view their own subscription data"
  ON public.stripe_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stripe_customers
      WHERE stripe_customers.customer_id = stripe_subscriptions.customer_id
      AND stripe_customers.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- PART 16: OPTIMIZE RLS POLICIES - STRIPE_ORDERS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own order data" ON public.stripe_orders;

CREATE POLICY "Users can view their own order data"
  ON public.stripe_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stripe_customers
      WHERE stripe_customers.customer_id = stripe_orders.customer_id
      AND stripe_customers.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- PART 17: OPTIMIZE RLS POLICIES - ML_SYNC_STATUS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own sync status" ON public.ml_sync_status;
DROP POLICY IF EXISTS "Users can insert their own sync status" ON public.ml_sync_status;
DROP POLICY IF EXISTS "Users can update their own sync status" ON public.ml_sync_status;

CREATE POLICY "Users can view their own sync status"
  ON public.ml_sync_status FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own sync status"
  ON public.ml_sync_status FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own sync status"
  ON public.ml_sync_status FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- PART 18: OPTIMIZE RLS POLICIES - TA_REQUESTS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own requests" ON public.ta_requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON public.ta_requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON public.ta_requests;

CREATE POLICY "Users can view their own requests"
  ON public.ta_requests FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create their own requests"
  ON public.ta_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own requests"
  ON public.ta_requests FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- PART 19: OPTIMIZE RLS POLICIES - CLINICAL SITES & TOOLS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can create clinical sites" ON public.clinical_sites;
DROP POLICY IF EXISTS "Authenticated users can create case types" ON public.case_types;
DROP POLICY IF EXISTS "Authenticated users can create case tips" ON public.case_tips;
DROP POLICY IF EXISTS "Users can update their own case tips" ON public.case_tips;
DROP POLICY IF EXISTS "Users can delete their own case tips" ON public.case_tips;
DROP POLICY IF EXISTS "Authenticated users can create preceptors" ON public.preceptors;
DROP POLICY IF EXISTS "Authenticated users can create preceptor tips" ON public.preceptor_tips;
DROP POLICY IF EXISTS "Users can update their own preceptor tips" ON public.preceptor_tips;
DROP POLICY IF EXISTS "Users can delete their own preceptor tips" ON public.preceptor_tips;

CREATE POLICY "Authenticated users can create clinical sites"
  ON public.clinical_sites FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can create case types"
  ON public.case_types FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can create case tips"
  ON public.case_tips FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can update their own case tips"
  ON public.case_tips FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can delete their own case tips"
  ON public.case_tips FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));

CREATE POLICY "Authenticated users can create preceptors"
  ON public.preceptors FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can create preceptor tips"
  ON public.preceptor_tips FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can update their own preceptor tips"
  ON public.preceptor_tips FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can delete their own preceptor tips"
  ON public.preceptor_tips FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));

-- =====================================================
-- PART 20: OPTIMIZE RLS POLICIES - DONATIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own donations" ON public.donations;
DROP POLICY IF EXISTS "Users can insert own donations" ON public.donations;

CREATE POLICY "Users can view own donations"
  ON public.donations FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own donations"
  ON public.donations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- PART 21: OPTIMIZE RLS POLICIES - FOCUSED_TOPIC_SESSIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own focused topic sessions" ON public.focused_topic_sessions;
DROP POLICY IF EXISTS "Users can create own focused topic sessions" ON public.focused_topic_sessions;
DROP POLICY IF EXISTS "Users can update own focused topic sessions" ON public.focused_topic_sessions;
DROP POLICY IF EXISTS "Users can delete own focused topic sessions" ON public.focused_topic_sessions;

CREATE POLICY "Users can view own focused topic sessions"
  ON public.focused_topic_sessions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own focused topic sessions"
  ON public.focused_topic_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own focused topic sessions"
  ON public.focused_topic_sessions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own focused topic sessions"
  ON public.focused_topic_sessions FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- PART 22: FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Recreate update_updated_at_column with immutable search path
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate update_donations_updated_at_column with immutable search path
DROP FUNCTION IF EXISTS public.update_donations_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_donations_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate all triggers that used these functions
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = tables.table_name 
      AND column_name = 'updated_at'
    )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I', t.table_name, t.table_name);
    EXECUTE format(
      'CREATE TRIGGER update_%I_updated_at 
       BEFORE UPDATE ON public.%I 
       FOR EACH ROW 
       EXECUTE FUNCTION public.update_updated_at_column()',
      t.table_name, t.table_name
    );
  END LOOP;
END $$;
