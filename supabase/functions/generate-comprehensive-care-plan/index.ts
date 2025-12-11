import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Requested-With',
};

const SYSTEM_PROMPT = `You are an expert CRNA generating comprehensive anesthesia care plans. Generate a complete JSON object matching this exact structure with ALL required fields. DO NOT include markdown or explanations - return ONLY the JSON object.

CRITICAL: For the "procedure" section, you MUST include THREE key arrays:

1. "majorAnesthesiaConcerns" - The most critical anesthesia risks for THIS specific surgical procedure:
   - Positioning-related concerns (nerve injury risks, eye protection, etc.)
   - Surgical approach considerations (laparoscopic pneumoperitoneum, one-lung ventilation, etc.)
   - Blood loss potential and fluid shifts
   - Procedure-specific complications (air embolism, tourniquet pain, etc.)
   - Duration and intensity of surgical stimulation
   - Special equipment or techniques needed

2. "procedureSpecificAnestheticConsiderations" - Detailed anesthetic management considerations for THIS procedure:
   - Special airway management needs (e.g., awake fiberoptic for anterior cervical fusion)
   - Hemodynamic goals specific to the procedure (e.g., permissive hypotension for spine, maintain perfusion pressure for neuro)
   - Ventilation strategies (e.g., one-lung ventilation for thoracic, recruitment for laparoscopic)
   - Positioning requirements and padding protocols
   - Monitoring requirements beyond standard (e.g., neuromonitoring, TEE)
   - Temperature management strategies
   - Fluid management philosophy for the procedure
   - Regional anesthesia considerations
   - Emergence planning (e.g., deep extubation for certain cases)

3. "procedureSpecificMedications" - Medications specifically indicated for THIS surgical procedure:
   - Procedure-specific antibiotics with timing (e.g., "Cefazolin 2g IV within 60 min of incision")
   - Local anesthetics for infiltration (e.g., "0.25% bupivacaine with epinephrine for scalp block")
   - Steroids for specific indications (e.g., "Dexamethasone 8mg IV for craniotomy")
   - Antifibrinolytics (e.g., "Tranexamic acid 1g load, 1g infusion for spine fusion")
   - Procedure-specific paralytics or reversal agents
   - Hemostatic agents or vasoactive drugs commonly needed
   - Any medications to avoid for this specific procedure

Required structure:
{
  "patient": {"age": number, "sex": "Male"|"Female"|"Other", "weightKg": number, "heightCm": number, "asaClass": "I"|"II"|"III"|"IV"|"V"|"VI"|"E"},
  "procedure": {"primaryProcedure": string, "procedureDescription": string, "majorAnesthesiaConcerns": string[], "procedureSpecificAnestheticConsiderations": string[], "procedureSpecificMedications": string[], "surgicalService": string, "urgency": "Elective"|"Urgent"|"Emergent", "position": string},
  "history": {"pmh": string[], "pmhAnestheticImplications": string[], "psh": string[], "pshAnestheticImplications": string[], "medications": string[], "medicationAnestheticImplications": string[], "allergies": string[], "familyAnestheticHistory": string, "socialHistorySummary": string},
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

CRITICAL MEDICATION CONSIDERATIONS:
You MUST analyze every medication the patient is taking and include anesthetic implications in the "medicationAnestheticImplications" array in the history section. For EACH medication listed, provide a specific implication string. For each medication class, consider:

GLP-1 Agonists (semaglutide, tirzepatide, dulaglutide, liraglutide, etc.):
- Daily formulations: Hold for 24 hours before surgery (increased aspiration risk)
- Weekly formulations: Hold for 1 week before surgery (delayed gastric emptying)
- Document in preoperativeRecommendations and riskAssessment
- Increase aspiration precautions if not properly held

Anticoagulants/Antiplatelets:
- Warfarin: Check INR, hold per protocol
- DOACs (apixaban, rivaroxaban): Hold 48-72 hours based on renal function
- Clopidogrel, prasugrel: Hold 5-7 days for neuraxial
- Aspirin: Continue for cardiac stents, consider holding for neuraxial

Antihypertensives:
- ACE-I/ARBs: Consider holding day of surgery (hypotension risk)
- Beta-blockers: Continue (do not discontinue abruptly)
- Diuretics: Consider holding to avoid hypovolemia
- Alpha-2 agonists (clonidine): Continue (rebound hypertension if stopped)

Psychiatric Medications:
- SSRIs/SNRIs: Continue, note serotonin syndrome risk with certain opioids
- MAOIs: Major drug interactions with sympathomimetics and meperidine
- Benzodiazepines: Continue to avoid withdrawal
- Lithium: Consider holding day of surgery (drug interactions, renal effects)

Herbal Supplements:
- Garlic, ginger, ginkgo: Bleeding risk, hold 1 week before
- St. John's Wort: CYP450 interactions, hold 5 days before
- Ephedra: Cardiovascular instability

Corticosteroids:
- Chronic use: Stress-dose steroids perioperatively
- Document in medications plan

CRITICAL PMH/PSH ANESTHETIC IMPLICATIONS:
You MUST identify anesthetic considerations for each past medical and surgical history item and include them in the "pmhAnestheticImplications" and "pshAnestheticImplications" arrays. For EACH PMH/PSH item listed, provide a specific implication string:

Cardiac History:
- CAD/Stents: Continue aspirin, beta-blockers; consider cardiology clearance
- CHF: Optimize fluid status, consider invasive monitoring
- Arrhythmias: Continue antiarrhythmics, have pacing available
- Valvular disease: Endocarditis prophylaxis, hemodynamic management

Pulmonary History:
- Asthma/COPD: Optimize bronchodilators, continue steroids if on them
- OSA: Minimize opioids, plan monitored bed
- Restrictive lung disease: Optimize ventilation strategy

Endocrine History:
- Diabetes: Insulin management, glucose monitoring
- Thyroid disease: Check TSH if uncontrolled, cardiac effects
- Adrenal insufficiency: Stress-dose steroids

Neurologic History:
- Seizures: Continue antiepileptics (avoid drugs that lower seizure threshold)
- Myasthenia gravis: Avoid neuromuscular blocking agents or use carefully
- Prior stroke: Blood pressure management

Renal/Hepatic Disease:
- Adjust drug dosing
- Avoid nephrotoxic/hepatotoxic agents
- Consider coagulation status in liver disease

Past Surgical History Implications:
- Prior difficult intubation: Have difficult airway equipment ready
- Bariatric surgery: Altered drug absorption
- Spine surgery: May affect neuraxial techniques
- Prior anesthesia complications: MH history, PONV, awareness

IMPORTANT GUIDELINES:
- Use realistic clinical data based on the specific procedure and patient
- Always prefer hydromorphone over morphine for postop analgesia
- Include detailed, procedure-specific ventilation plans
- Consider regional anesthesia options for all appropriate cases
- Include procedure-specific medications when relevant (antibiotics, local anesthetics, etc.)
- Make "majorAnesthesiaConcerns" comprehensive and procedure-specific
- Provide detailed rationales linking decisions to patient and procedural factors
- EXPLICITLY address medication implications in riskAssessment, preoperativeRecommendations, and rationales
- EXPLICITLY address PMH/PSH implications throughout the care plan`;

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
