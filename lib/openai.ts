import { supabase } from '@/lib/supabase';

export interface StudyPlanInput {
  examDate: string;
  currentLevel: string;
  studyHoursPerWeek: number;
  focusAreas: string[];
  weakAreas?: string;
  goals?: string;
}

export interface StudyPlanOutput {
  title: string;
  description: string;
  weeklySchedule: Record<string, any>;
  milestones: Array<{ week: number; title: string; description: string }>;
  fullPlan: string;
}

async function callOpenAIProxy(action: string, payload: Record<string, any>): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const response = await fetch(`${supabaseUrl}/functions/v1/openai-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? supabaseAnonKey}`,
      Apikey: supabaseAnonKey ?? '',
    },
    body: JSON.stringify({ action, payload }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to contact AI service');
  }

  const data = await response.json();
  return data.content;
}

export async function generateStudyPlan(input: StudyPlanInput): Promise<StudyPlanOutput> {
  const weeksUntilExam = Math.ceil(
    (new Date(input.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7)
  );

  const fullPlan = await callOpenAIProxy('generate_study_plan', {
    examDate: input.examDate,
    currentLevel: input.currentLevel,
    studyHoursPerWeek: input.studyHoursPerWeek,
    focusAreas: input.focusAreas,
    weakAreas: input.weakAreas,
    goals: input.goals,
  });

  const parsed = parseStudyPlan(fullPlan, weeksUntilExam);

  return {
    ...parsed,
    fullPlan,
  };
}

export async function generatePracticeQuestion(
  topic: string,
  difficulty: string
): Promise<{
  question: string;
  options: Array<{ id: string; text: string }>;
  correctAnswer: string;
  explanation: string;
}> {
  const content = await callOpenAIProxy('generate_practice_question', { topic, difficulty });
  return parseQuestion(content);
}

function parseStudyPlan(fullPlan: string, totalWeeks: number) {
  const titleMatch = fullPlan.match(/(?:title|plan):\s*(.+?)(?:\n|$)/i);
  const descMatch = fullPlan.match(/(?:description|overview):\s*([\s\S]*?)(?=\n\n|week|$)/i);

  const title = titleMatch
    ? titleMatch[1].trim()
    : `${totalWeeks}-Week NBCRNA Study Plan`;
  const description = descMatch
    ? descMatch[1].trim().substring(0, 200)
    : 'Comprehensive NBCRNA exam preparation plan';

  const milestones: Array<{ week: number; title: string; description: string }> = [];
  const milestoneMatches = fullPlan.matchAll(
    /(?:milestone|week)\s*(\d+):\s*(.+?)(?:\n|$)/gi
  );

  for (const match of milestoneMatches) {
    const week = parseInt(match[1]);
    if (week <= totalWeeks) {
      milestones.push({
        week,
        title: match[2].trim(),
        description: `Complete milestone for week ${week}`,
      });
    }
  }

  if (milestones.length === 0) {
    for (let i = 1; i <= Math.min(totalWeeks, 12); i += 2) {
      milestones.push({
        week: i,
        title: `Week ${i} Checkpoint`,
        description: `Assessment of progress through week ${i}`,
      });
    }
  }

  return {
    title,
    description,
    weeklySchedule: {},
    milestones,
  };
}

function parseQuestion(content: string) {
  const questionMatch = content.match(/QUESTION:\s*([\s\S]*?)(?=\n[A-D]\))/i);
  const optionMatches = content.matchAll(/([A-D])\)\s*(.+?)(?=\n|$)/gi);
  const correctMatch = content.match(/CORRECT:\s*([A-D])/i);
  const explanationMatch = content.match(/EXPLANATION:\s*([\s\S]*?)$/i);

  const options: Array<{ id: string; text: string }> = [];
  for (const match of optionMatches) {
    options.push({
      id: match[1],
      text: match[2].trim(),
    });
  }

  return {
    question: questionMatch ? questionMatch[1].trim() : content,
    options,
    correctAnswer: correctMatch ? correctMatch[1] : 'A',
    explanation: explanationMatch ? explanationMatch[1].trim() : 'No explanation provided',
  };
}
