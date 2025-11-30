/*
  # Clinical Preference Cards & Community Features

  1. New Tables
    - `clinical_sites`: Stores hospitals/clinical sites by state
      - `id` (uuid, primary key)
      - `state` (text, required) - US State
      - `hospital_name` (text, required) - Hospital name
      - `is_user_added` (boolean, default true) - Whether added by user
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz, default now())
    
    - `case_types`: Stores surgical case types per clinical site
      - `id` (uuid, primary key)
      - `clinical_site_id` (uuid, references clinical_sites)
      - `case_name` (text, required) - Surgery name
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz, default now())
    
    - `case_tips`: User-generated tips for case types
      - `id` (uuid, primary key)
      - `case_type_id` (uuid, references case_types)
      - `tip_text` (text, required)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    
    - `preceptors`: Stores preceptor names per clinical site
      - `id` (uuid, primary key)
      - `clinical_site_id` (uuid, references clinical_sites)
      - `preceptor_name` (text, required)
      - `title` (text, default 'CRNA')
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz, default now())
    
    - `preceptor_tips`: User-generated tips for preceptors
      - `id` (uuid, primary key)
      - `preceptor_id` (uuid, references preceptors)
      - `tip_text` (text, required)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    
    - `anonymous_questions`: Anonymous community questions
      - `id` (uuid, primary key)
      - `question_text` (text, required)
      - `created_by` (uuid, references auth.users, nullable for anonymity)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    
    - `anonymous_responses`: Responses to anonymous questions
      - `id` (uuid, primary key)
      - `question_id` (uuid, references anonymous_questions)
      - `response_text` (text, required)
      - `created_by` (uuid, references auth.users, nullable for anonymity)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Indexes
    - Create indexes for fast lookups by state, site, case type, preceptor

  3. Security
    - Enable RLS on all tables
    - Allow authenticated users to read all data
    - Allow authenticated users to create entries
    - Only creators can update/delete their own entries
*/

-- Clinical Sites Table
CREATE TABLE IF NOT EXISTS clinical_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL,
  hospital_name TEXT NOT NULL,
  is_user_added BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(state, hospital_name)
);

ALTER TABLE clinical_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view clinical sites"
  ON clinical_sites FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can create clinical sites"
  ON clinical_sites FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_clinical_sites_state ON clinical_sites(state);
CREATE INDEX IF NOT EXISTS idx_clinical_sites_hospital ON clinical_sites(hospital_name);

-- Case Types Table
CREATE TABLE IF NOT EXISTS case_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinical_site_id UUID NOT NULL REFERENCES clinical_sites(id) ON DELETE CASCADE,
  case_name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinical_site_id, case_name)
);

ALTER TABLE case_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view case types"
  ON case_types FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can create case types"
  ON case_types FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_case_types_site ON case_types(clinical_site_id);
CREATE INDEX IF NOT EXISTS idx_case_types_name ON case_types(case_name);

-- Case Tips Table
CREATE TABLE IF NOT EXISTS case_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_type_id UUID NOT NULL REFERENCES case_types(id) ON DELETE CASCADE,
  tip_text TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE case_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view case tips"
  ON case_tips FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can create case tips"
  ON case_tips FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own case tips"
  ON case_tips FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own case tips"
  ON case_tips FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_case_tips_case_type ON case_tips(case_type_id);
CREATE INDEX IF NOT EXISTS idx_case_tips_created_at ON case_tips(created_at DESC);

-- Preceptors Table
CREATE TABLE IF NOT EXISTS preceptors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinical_site_id UUID NOT NULL REFERENCES clinical_sites(id) ON DELETE CASCADE,
  preceptor_name TEXT NOT NULL,
  title TEXT DEFAULT 'CRNA',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinical_site_id, preceptor_name)
);

ALTER TABLE preceptors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view preceptors"
  ON preceptors FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can create preceptors"
  ON preceptors FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_preceptors_site ON preceptors(clinical_site_id);
CREATE INDEX IF NOT EXISTS idx_preceptors_name ON preceptors(preceptor_name);

-- Preceptor Tips Table
CREATE TABLE IF NOT EXISTS preceptor_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preceptor_id UUID NOT NULL REFERENCES preceptors(id) ON DELETE CASCADE,
  tip_text TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE preceptor_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view preceptor tips"
  ON preceptor_tips FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can create preceptor tips"
  ON preceptor_tips FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own preceptor tips"
  ON preceptor_tips FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own preceptor tips"
  ON preceptor_tips FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_preceptor_tips_preceptor ON preceptor_tips(preceptor_id);
CREATE INDEX IF NOT EXISTS idx_preceptor_tips_created_at ON preceptor_tips(created_at DESC);

-- Anonymous Questions Table
CREATE TABLE IF NOT EXISTS anonymous_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE anonymous_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view anonymous questions"
  ON anonymous_questions FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can create anonymous questions"
  ON anonymous_questions FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE INDEX IF NOT EXISTS idx_anonymous_questions_created_at ON anonymous_questions(created_at DESC);

-- Anonymous Responses Table
CREATE TABLE IF NOT EXISTS anonymous_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES anonymous_questions(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE anonymous_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view anonymous responses"
  ON anonymous_responses FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can create anonymous responses"
  ON anonymous_responses FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE INDEX IF NOT EXISTS idx_anonymous_responses_question ON anonymous_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_responses_created_at ON anonymous_responses(created_at DESC);

-- Update triggers for updated_at columns
CREATE TRIGGER update_case_tips_updated_at
  BEFORE UPDATE ON case_tips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preceptor_tips_updated_at
  BEFORE UPDATE ON preceptor_tips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_anonymous_questions_updated_at
  BEFORE UPDATE ON anonymous_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_anonymous_responses_updated_at
  BEFORE UPDATE ON anonymous_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();