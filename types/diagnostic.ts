export interface DiagnosticStatus {
  required: boolean;
  in_progress: boolean;
  completed: boolean;
  attempt_id?: string;
  questions_answered?: number;
  total_questions?: number;
}

export interface DiagnosticQuestion {
  question_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'multi_select' | 'clinical_scenario' | 'drag_drop_matching' | 'drag_drop_ordering' | 'hotspot';
  options?: string[];
  correct_answer?: string | string[];
  image_url?: string;
  nce_section?: string;
  bloom_level?: string;
  difficulty?: string;
  topic?: string;
}

export interface DiagnosticAnswer {
  question_id: string;
  answer: string | string[];
  response_time_ms: number;
}

export interface DiagnosticSectionScore {
  section: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface DiagnosticBloomScore {
  level: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface DiagnosticTypeScore {
  type: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface DiagnosticRecommendation {
  topic: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DiagnosticResults {
  attempt_id: string;
  total_score: number;
  total_questions: number;
  percentage: number;
  completed_at: string;
  section_scores: DiagnosticSectionScore[];
  bloom_scores: DiagnosticBloomScore[];
  type_scores: DiagnosticTypeScore[];
  strengths: string[];
  weaknesses: string[];
  recommended_topics: DiagnosticRecommendation[];
}
