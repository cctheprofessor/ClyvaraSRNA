import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SYSTEM_PROMPT = `You are an expert CRNA generating comprehensive anesthesia care plans. Generate a complete JSON object matching this exact structure with ALL required fields. DO NOT include markdown or explanations - return ONLY the JSON object.

CRITICAL: For the "procedure" section, you MUST include "majorAnesthesiaConcerns" - this is an array of the most important anesthesia-specific concerns for THIS specific surgical procedure. Consider procedure-specific risks like:
- Positioning-related concerns (nerve injury risks, eye protection, etc.)
- Surgical approach considerations (laparoscopic pneumoperitoneum, one-lung ventilation, etc.)
- Blood loss potential and fluid shifts
- Procedure-specific complications (air embolism, tourniquet pain, etc.)
- Duration and intensity of surgical stimulation
- Special equipment or techniques needed

Required structure:
{
  "patient": {"age": number, "sex": "Male"|"Female"|"Other", "weightKg": number, "heightCm": number, "asaClass": "I"|"II"|"III"|"IV"|"V"|"VI"|"E"},
  "procedure": {"primaryProcedure": string, "procedureDescription": string, "majorAnesthesiaConcerns": string[], "surgicalService": string, "urgency": "Elective"|"Urgent"|"Emergent", "position": string},
  "history": {"pmh": string[], "psh": string[], "medications": string[], "allergies": string[], "familyAnestheticHistory": string, "socialHistorySummary": string},
  "exam": {"airway": {"mallampati": "I"|"II"|"III"|"IV", "tmDistanceCm": number, "neckMobility": "Full"|"Limited", "dentition": string, "anticipatedDifficultAirway": boolean, "airwayConcerns": string}, "cardiacSummary": string, "pulmonarySummary": string, "neuroSummary": string, "renalHepaticEndocrineSummary": string, "otherFindings": string},
  "labsAndImaging": {"relevantLabs": string[], "ekgSummary": string, "echoSummary": string, "otherImagingSummary": string},
  "riskAssessment": {"primaryRisks": string[], "mhRisk": "Low"|"Moderate"|"High", "aspirationRisk": "Low"|"Moderate"|"High", "postopNauseaVomitingRisk": "Low"|"Moderate"|"High", "obstructiveSleepApneaRisk": "Low"|"Moderate"|"High", "cardiovascularRiskSummary": string, "pulmonaryRiskSummary": string},
  "anestheticPlan": {"anestheticTechnique": ["General"|"Regional"|"MAC"|"Combined"], "inductionPlan": {"summary": string, "steps": string[]}, "maintenancePlan": {"summary": string, "steps": string[]}, "emergencePlan": {"summary": string, "steps": string[]}, "postopDisposition": string},
  "airwayPlan": {"primaryAirway": string, "backupAirwayOptions": string[], "difficultAirwayStrategy": string},
  "ventilationPlan": {"ventilationMode": string, "tidalVolume": string, "respiratoryRate": string, "peep": string, "fio2": string, "specialConsiderations": string[], "procedureSpecificVentilation": string},
  "regionalAnesthesiaPlan": {"recommended": boolean, "techniques": string[], "rationale": string},
  "monitoringPlan": {"standardMonitors": string[], "advancedMonitors": string[], "rationale": string},
  "linesAndAccessPlan": {"ivAccess": string, "arterialLine": string, "centralLine": string, "otherAccess": string},
  "fluidAndBloodPlan": {"maintenanceFluids": string, "bolusPlan": string, "estimatedBloodLossRisk": "Low"|"Moderate"|"High", "bloodProductsPlan": string},
  "medicationsPlan": {"premedications": [{"name": string, "dose": string, "route": string, "timing": string, "reason": string}], "inductionMeds": [{"name": string, "dose": string, "route": string, "timing": string, "reason": string}], "maintenanceMeds": [{"name": string, "dose": string, "route": string, "timing": string, "reason": string}], "procedureSpecificMeds": [{"name": string, "dose": string, "route": string, "timing": string, "reason": string}], "postoperativeMeds": [{"name": string, "dose": string, "route": string, "timing": string, "reason": string}], "ponvProphylaxis": [{"name": string, "dose": string, "route": string, "timing": string, "reason": string}], "adjunctAnalgesics": [{"name": string, "dose": string, "route": string, "timing": string, "reason": string}], "painManagementStrategy": string},
  "specialConsiderations": {"positioningConcerns": string[], "nerveInjuryPrevention": string[], "infectionPrevention": string[], "temperatureManagement": string[], "mhPreparedness": string},
  "checklist": [{"label": string, "category": "Preop"|"Intraop"|"Postop", "isCritical": boolean}],
  "rationales": [{"title": string, "detail": string, "linkedSection": string}],
  "preoperativeRecommendations": {"recommendedConsults": [{"specialty": string, "reason": string, "urgency": "Required"|"Recommended"}], "recommendedLabs": [{"test": string, "reason": string, "urgency": "Required"|"Recommended"}], "recommendedImaging": [{"study": string, "reason": string, "urgency": "Required"|"Recommended"}], "rationale": string}
}

IMPORTANT GUIDELINES:
- Use realistic clinical data based on the specific procedure and patient
- Always prefer hydromorphone over morphine for postop analgesia
- Include detailed, procedure-specific ventilation plans
- Consider regional anesthesia options for all appropriate cases
- Include procedure-specific medications when relevant (antibiotics, local anesthetics, etc.)
- Make "majorAnesthesiaConcerns" comprehensive and procedure-specific
- Provide detailed rationales linking decisions to patient and procedural factors`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { caseDescription } = await req.json();

    if (!caseDescription || typeof caseDescription !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid request: caseDescription is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Generating care plan for case:', caseDescription.substring(0, 100));

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Generate a comprehensive anesthesia care plan for:\n\n${caseDescription}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error (${openAIResponse.status}): ${error}`);
    }

    const data = await openAIResponse.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const carePlan = JSON.parse(content);
    console.log('Care plan generated successfully');

    return new Response(JSON.stringify(carePlan), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error generating care plan:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate care plan',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});