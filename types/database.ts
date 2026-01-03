export interface Profile {
  id: string;
  full_name: string;
  graduation_year: number | null;
  role: string | null;
  is_admin: boolean;
  is_ta: boolean;
  specialty_interest: string | null;
  created_at: string;
  updated_at: string;

  // ML Backend required fields
  first_name: string | null;
  last_name: string | null;
  enrollment_date: string | null;
  institution: string | null;
  program_name: string;
  expected_graduation: string | null;
  cohort_year: number | null;
  program_track: string;

  // ML Backend sync metadata
  ml_user_id: number | null;
  ml_last_synced_at: string | null;

  // Optional profile fields
  phone: string | null;
  gpa: number | null;
  clinical_hours: number;
  current_semester: number;
  preferred_study_time: string | null;
  daily_goal_minutes: number;
  exam_date: string | null;
  email_notifications: boolean;
  weekly_report_enabled: boolean;
  is_active: boolean;

  // Diagnostic exam fields
  diagnostic_completed: boolean;
  diagnostic_completed_at: string | null;
  diagnostic_score: number | null;
  diagnostic_attempt_id: string | null;
}

export interface CarePlan {
  id: string;
  user_id: string;
  patient_age: number;
  patient_weight: number;
  procedure_type: string;
  asa_classification: string;
  medical_history: string | null;
  allergies: string | null;
  generated_plan: string | null;
  preoperative_assessment: string | null;
  anesthetic_plan: string | null;
  monitoring_requirements: string | null;
  potential_complications: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedCalculation {
  id: string;
  user_id: string;
  calculation_type: string;
  tool_name: string;
  input_data: Record<string, any>;
  result_data: Record<string, any>;
  patient_context: string | null;
  created_at: string;
}

export interface StudyPlan {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  exam_date: string | null;
  study_hours_per_week: number;
  current_knowledge_level: string;
  focus_areas: string[];
  weekly_schedule: Record<string, any>;
  milestones: Array<{ week: number; title: string; description: string }>;
  generated_content: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudyTopic {
  id: string;
  category: string;
  subcategory: string | null;
  title: string;
  description: string | null;
  difficulty_level: string;
  estimated_study_hours: number;
  nbcrna_weight: number;
  created_at: string;
}

export interface PracticeQuestion {
  id: string;
  topic_id: string | null;
  question_text: string;
  question_type: string;
  options: Array<{ id: string; text: string }>;
  correct_answer: string;
  explanation: string | null;
  difficulty_level: string;
  source: string;
  created_at: string;
}

export interface UserQuestionAttempt {
  id: string;
  user_id: string;
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  time_spent_seconds: number;
  confidence_level: string | null;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  study_plan_id: string | null;
  topic_id: string | null;
  duration_minutes: number;
  questions_attempted: number;
  questions_correct: number;
  notes: string | null;
  created_at: string;
}

export interface MLSyncStatus {
  id: string;
  user_id: string;
  sync_status: 'pending' | 'active' | 'failed' | 'archived';
  last_sync_at: string | null;
  last_sync_error: string | null;
  pending_responses_count: number;
  created_at: string;
  updated_at: string;
}

export interface TAUser {
  id: string;
  user_id: string;
  bio: string;
  specialties: string[];
  is_active: boolean;
  total_responses: number;
  average_rating: number | null;
  created_at: string;
}

export interface TARequest {
  id: string;
  user_id: string;
  question_text: string;
  category: string | null;
  priority: 'urgent' | 'normal' | 'low';
  status: 'pending' | 'in_progress' | 'answered';
  response_text: string | null;
  assigned_ta_id: string | null;
  rating: number | null;
  created_at: string;
  responded_at: string | null;
  updated_at: string;
}
