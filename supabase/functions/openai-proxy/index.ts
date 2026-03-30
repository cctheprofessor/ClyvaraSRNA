import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, payload } = body;

    if (!action || !payload) {
      return new Response(
        JSON.stringify({ error: "Missing action or payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let prompt = "";
    let maxTokens = 4000;
    let temperature = 0.7;

    if (action === "generate_study_plan") {
      const { examDate, currentLevel, studyHoursPerWeek, focusAreas, weakAreas, goals } = payload;
      const weeksUntilExam = Math.ceil(
        (new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7)
      );

      prompt = `You are an expert NBCRNA (National Board of Certification and Recertification for Nurse Anesthetists) exam preparation advisor. Create a personalized study plan for a student with the following profile:

Exam Date: ${examDate} (${weeksUntilExam} weeks from now)
Current Knowledge Level: ${currentLevel}
Available Study Time: ${studyHoursPerWeek} hours per week
Focus Areas: ${focusAreas.join(", ")}
${weakAreas ? `Weak Areas: ${weakAreas}` : ""}
${goals ? `Goals: ${goals}` : ""}

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
      maxTokens = 4000;
      temperature = 0.7;
    } else if (action === "generate_practice_question") {
      const { topic, difficulty } = payload;
      prompt = `Generate a high-quality NBCRNA-style multiple choice question about: ${topic}

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
      maxTokens = 1200;
      temperature = 0.8;
    } else {
      return new Response(
        JSON.stringify({ error: "Unknown action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemContent =
      action === "generate_study_plan"
        ? "You are an expert NBCRNA exam preparation advisor. Create detailed, personalized, and achievable study plans based on evidence-based learning principles."
        : "You are an expert in creating NBCRNA certification exam questions. Generate high-quality, clinically relevant questions.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: prompt },
        ],
        temperature,
        max_completion_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(
        JSON.stringify({ error: errorData.error?.message || "OpenAI request failed" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
