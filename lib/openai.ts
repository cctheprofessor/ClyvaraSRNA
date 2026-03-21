import Constants from 'expo-constants';

const OPENAI_API_KEY =
  Constants.expoConfig?.extra?.openaiApiKey ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY;

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

export async function generateStudyPlan(input: StudyPlanInput): Promise<StudyPlanOutput> {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
    throw new Error(
      'OpenAI API key not configured. Please add your API key to the .env file.'
    );
  }

  const weeksUntilExam = Math.ceil(
    (new Date(input.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7)
  );

  const prompt = `You are an expert NBCRNA (National Board of Certification and Recertification for Nurse Anesthetists) exam preparation advisor. Create a personalized study plan for a student with the following profile:

Exam Date: ${input.examDate} (${weeksUntilExam} weeks from now)
Current Knowledge Level: ${input.currentLevel}
Available Study Time: ${input.studyHoursPerWeek} hours per week
Focus Areas: ${input.focusAreas.join(', ')}
${input.weakAreas ? `Weak Areas: ${input.weakAreas}` : ''}
${input.goals ? `Goals: ${input.goals}` : ''}

Create a comprehensive ${weeksUntilExam}-week study plan that includes:

1. OVERVIEW
- Study plan title and description
- Key objectives
- Expected outcomes

2. WEEKLY BREAKDOWN
For each week, provide:
- Week number and focus areas
- Specific topics to cover
- Daily study activities
- Practice questions targets
- Review sessions

3. MILESTONES
Create major milestones every 2-4 weeks with:
- Milestone title
- What should be accomplished
- Assessment method

Focus on high-yield NBCRNA topics including:
- Anatomy & Physiology
- Pharmacology (especially anesthetic agents)
- Anesthesia Equipment & Technology
- Patient Safety & Monitoring
- Regional & General Anesthesia Techniques
- Pathophysiology
- Professional Issues

Make the plan realistic, achievable, and evidence-based. Include spaced repetition principles and progressive difficulty increases.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert NBCRNA exam preparation advisor. Create detailed, personalized, and achievable study plans based on evidence-based learning principles.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_completion_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to generate study plan');
    }

    const data = await response.json();
    const fullPlan = data.choices[0].message.content;

    const parsed = parseStudyPlan(fullPlan, weeksUntilExam);

    return {
      ...parsed,
      fullPlan,
    };
  } catch (error) {
    if (__DEV__) { console.error('OpenAI API Error:', error); }
    throw error;
  }
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
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
    throw new Error('OpenAI API key not configured.');
  }

  const prompt = `Generate a high-quality NBCRNA-style multiple choice question about: ${topic}

Difficulty Level: ${difficulty}

Requirements:
- Create a clinically relevant, exam-style question
- Provide 4 answer choices (A, B, C, D)
- Include one correct answer
- Provide a detailed explanation of why the answer is correct and why other options are incorrect
- Make the question challenging but fair
- Use evidence-based information

Format your response as:
QUESTION: [the question]
A) [option A]
B) [option B]
C) [option C]
D) [option D]
CORRECT: [the correct letter]
EXPLANATION: [detailed explanation]`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert in creating NBCRNA certification exam questions. Generate high-quality, clinically relevant questions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_completion_tokens: 1200,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate question');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    return parseQuestion(content);
  } catch (error) {
    if (__DEV__) { console.error('OpenAI API Error:', error); }
    throw error;
  }
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
