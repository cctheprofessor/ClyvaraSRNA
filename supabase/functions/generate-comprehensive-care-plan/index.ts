import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SCHEMA_EXAMPLE = `{
  "patient": {
    "age": 65,
    "sex": "Male",
    "weightKg": 85,
    "heightCm": 175,
    "asaClass": "III"
  },
  "procedure": {
    "primaryProcedure": "Coronary Artery Bypass Graft x3",
    "surgicalService": "Cardiothoracic Surgery",
    "urgency": "Elective",
    "position": "Supine"
  },
  "history": {
    "pmh": ["Coronary artery disease", "Hypertension", "Type 2 Diabetes"],
    "psh": ["Appendectomy 1995"],
    "medications": ["Metformin 1000mg BID", "Lisinopril 20mg daily", "ASA 81mg daily"],
    "allergies": ["Penicillin - rash"],
    "familyAnestheticHistory": "None reported",
    "socialHistorySummary": "Former smoker, quit 5 years ago. No alcohol use."
  },
  "exam": {
    "airway": {
      "mallampati": "II",
      "tmDistanceCm": 6.5,
      "neckMobility": "Full",
      "dentition": "Full dentures upper",
      "anticipatedDifficultAirway": false,
      "airwayConcerns": "None identified"
    },
    "cardiacSummary": "Regular rate and rhythm, no murmurs",
    "pulmonarySummary": "Clear bilaterally, no wheezes",
    "neuroSummary": "Alert and oriented x3, no focal deficits",
    "renalHepaticEndocrineSummary": "Glucose controlled on metformin, Cr 1.1",
    "otherFindings": "None"
  },
  "labsAndImaging": {
    "relevantLabs": ["Hgb 13.2", "Plt 245k", "Cr 1.1", "K 4.2", "Glucose 112"],
    "ekgSummary": "Sinus rhythm, old inferior Q waves",
    "echoSummary": "EF 45%, moderate MR, no AS"
  },
  "riskAssessment": {
    "primaryRisks": ["Myocardial ischemia", "Bleeding", "Stroke", "Renal injury"],
    "mhRisk": "Low",
    "aspirationRisk": "Low",
    "postopNauseaVomitingRisk": "Moderate",
    "obstructiveSleepApneaRisk": "Low",
    "cardiovascularRiskSummary": "High risk given CAD and reduced EF",
    "pulmonaryRiskSummary": "Low risk, no active lung disease"
  },
  "anestheticPlan": {
    "anestheticTechnique": ["General", "Combined"],
    "inductionPlan": {
      "summary": "Slow IV induction with hemodynamic stability focus",
      "steps": ["Preoxygenate with 100% O2", "Fentanyl 5 mcg/kg", "Propofol 1-1.5 mg/kg titrated", "Rocuronium 0.6 mg/kg", "ETT 8.0 with video laryngoscopy"]
    },
    "maintenancePlan": {
      "summary": "Balanced anesthesia with volatile agent and opioid",
      "steps": ["Sevoflurane 0.5-1.5% MAC", "Fentanyl infusion 1-2 mcg/kg/hr", "Rocuronium PRN", "BIS monitoring 40-60"]
    },
    "emergencePlan": {
      "summary": "Smooth emergence with extubation in ICU",
      "steps": ["Taper volatile agent", "Reverse neuromuscular blockade", "Transport intubated to ICU", "Extubate when hemodynamically stable and warm"]
    },
    "postopDisposition": "CVICU intubated"
  },
  "airwayPlan": {
    "primaryAirway": "ETT 8.0 with video laryngoscopy",
    "backupAirwayOptions": ["Direct laryngoscopy", "LMA", "Fiberoptic intubation"],
    "difficultAirwayStrategy": "Awake fiberoptic if difficulty anticipated"
  },
  "ventilationPlan": {
    "ventilationMode": "Volume control",
    "tidalVolume": "6-8 mL/kg IBW",
    "respiratoryRate": "10-12 bpm",
    "peep": "5 cmH2O",
    "fio2": "Start at 100%, titrate to SpO2 >95%",
    "specialConsiderations": ["Lung protective ventilation", "Monitor plateau pressures <30 cmH2O"],
    "procedureSpecificVentilation": "Standard two-lung ventilation for cardiac surgery. If thoracotomy required, prepare for one-lung ventilation with double-lumen tube or bronchial blocker."
  },
  "regionalAnesthesiaPlan": {
    "recommended": false,
    "techniques": [],
    "rationale": "Patient anticoagulated for cardiac surgery - neuraxial anesthesia contraindicated"
  },
  "monitoringPlan": {
    "standardMonitors": ["ECG", "NIBP", "SpO2", "EtCO2", "Temperature"],
    "advancedMonitors": ["Arterial line", "Central line", "PA catheter", "TEE", "BIS"],
    "rationale": "Cardiac surgery requires invasive hemodynamic monitoring and TEE for cardiac function assessment"
  },
  "linesAndAccessPlan": {
    "ivAccess": "2x 16G peripheral IVs",
    "arterialLine": "Right radial arterial line",
    "centralLine": "Right IJ triple lumen catheter and PA catheter introducer",
    "otherAccess": "Foley catheter"
  },
  "fluidAndBloodPlan": {
    "maintenanceFluids": "Plasmalyte at 100 mL/hr",
    "bolusPlan": "500 mL crystalloid or colloid boluses for hypotension",
    "estimatedBloodLossRisk": "High",
    "bloodProductsPlan": "Type and cross 4 units PRBCs, 4 FFP available. Transfuse if Hgb <8 on bypass"
  },
  "medicationsPlan": {
    "premedications": [
      {"name": "Midazolam", "dose": "2 mg", "route": "IV", "timing": "In holding area", "reason": "Anxiolysis"}
    ],
    "inductionMeds": [
      {"name": "Fentanyl", "dose": "425 mcg", "route": "IV", "timing": "Induction", "reason": "Analgesia and blunt hemodynamic response"},
      {"name": "Propofol", "dose": "100-150 mg", "route": "IV", "timing": "Induction", "reason": "Hypnosis"},
      {"name": "Rocuronium", "dose": "50 mg", "route": "IV", "timing": "Induction", "reason": "Neuromuscular blockade"}
    ],
    "maintenanceMeds": [
      {"name": "Sevoflurane", "dose": "0.5-1.5 MAC", "route": "Inhalation", "timing": "Maintenance", "reason": "Hypnosis"},
      {"name": "Fentanyl", "dose": "100-200 mcg/hr", "route": "IV infusion", "timing": "Maintenance", "reason": "Analgesia"}
    ],
    "postoperativeMeds": [
      {"name": "Hydromorphone", "dose": "0.2-0.4 mg", "route": "IV", "timing": "PACU PRN", "reason": "Pain control"}
    ],
    "ponvProphylaxis": [
      {"name": "Ondansetron", "dose": "4 mg", "route": "IV", "timing": "End of case", "reason": "PONV prophylaxis"}
    ],
    "adjunctAnalgesics": [
      {"name": "Acetaminophen", "dose": "1000 mg", "route": "IV", "timing": "End of case", "reason": "Multimodal analgesia, opioid-sparing"},
      {"name": "Ketorolac", "dose": "30 mg", "route": "IV", "timing": "End of case if no contraindication", "reason": "NSAID for multimodal analgesia"}
    ],
    "painManagementStrategy": "Multimodal analgesia with opioids (prefer hydromorphone), acetaminophen, NSAIDs if not contraindicated, and regional techniques when feasible"
  },
  "specialConsiderations": {
    "positioningConcerns": ["Supine with arms tucked", "Pad all pressure points", "Ensure neutral head position"],
    "nerveInjuryPrevention": ["Pad ulnar nerves", "Avoid excessive arm abduction", "Secure arms safely"],
    "infectionPrevention": ["Cefazolin 2g within 60 min of incision", "Maintain normothermia", "Chlorhexidine prep"],
    "temperatureManagement": ["Forced air warmer", "Warm fluids", "Monitor core temp continuously"],
    "mhPreparedness": "MH cart available, dantrolene stocked in OR"
  },
  "checklist": [
    {"label": "Verify patient identity and consent", "category": "Preop", "isCritical": true},
    {"label": "Confirm NPO status", "category": "Preop", "isCritical": true},
    {"label": "Review imaging and labs", "category": "Preop", "isCritical": false},
    {"label": "Ensure blood products available", "category": "Intraop", "isCritical": true},
    {"label": "Confirm antibiotic prophylaxis given", "category": "Intraop", "isCritical": true},
    {"label": "Check all monitoring functioning", "category": "Intraop", "isCritical": true},
    {"label": "ICU bed confirmed", "category": "Postop", "isCritical": true},
    {"label": "Handoff to ICU team complete", "category": "Postop", "isCritical": true}
  ],
  "rationales": [
    {"title": "High-dose opioid induction", "detail": "Cardiac surgery requires blunting of sympathetic response to laryngoscopy and sternotomy to prevent myocardial ischemia", "linkedSection": "inductionPlan"},
    {"title": "TEE monitoring", "detail": "Essential for assessing cardiac function, volume status, and surgical result in cardiac surgery", "linkedSection": "monitoringPlan"}
  ],
  "preoperativeRecommendations": {
    "recommendedConsults": [
      {"specialty": "Cardiology", "reason": "Pre-op cardiac optimization and clearance", "urgency": "Required"}
    ],
    "recommendedLabs": [
      {"test": "Troponin", "reason": "Baseline cardiac biomarkers", "urgency": "Recommended"}
    ],
    "recommendedImaging": [
      {"study": "Carotid ultrasound", "reason": "Screen for carotid stenosis prior to cardiac surgery", "urgency": "Recommended"}
    ],
    "rationale": "These studies help optimize perioperative risk and surgical planning"
  }
}`;

const ANESTHESIA_CARE_PLAN_SYSTEM_PROMPT = `You are an expert CRNA (Certified Registered Nurse Anesthetist) anesthesia planning assistant with access to the latest 2024-2025 clinical guidelines and evidence-based practices. Your role is to generate comprehensive, clinically accurate anesthesia care plans based on patient case descriptions.

CRITICAL INSTRUCTIONS:
1. You MUST respond with ONLY valid JSON. No markdown, no explanations, no extra text.
2. The JSON MUST match this EXACT structure:

${SCHEMA_EXAMPLE}

3. Use CRNA-level clinical reasoning and the MOST CURRENT evidence-based practice (2024-2025 guidelines).
4. Be thorough but concise in your clinical summaries.
5. Include appropriate risk assessments, medication dosing, and monitoring plans.
6. Consider patient-specific factors like age, weight, ASA class, and comorbidities.
7. DO NOT ASSUME OR FABRICATE DATA: If labs, imaging, or exam findings are not provided, do NOT include them in the output. Only include data explicitly provided by the user.
8. Use realistic medication names, doses, and routes based on current guidelines.
9. Include appropriate safety checklists and rationales for key decisions.
10. ALWAYS prefer hydromorphone over morphine for postoperative analgesia.
11. MALIGNANT HYPERTHERMIA AWARENESS: If patient has family history of MH, personal history of MH, or any MH susceptibility, you MUST:
    - AVOID all volatile anesthetics (sevoflurane, desflurane, isoflurane)
    - AVOID succinylcholine
    - Use TIVA (total intravenous anesthesia) with propofol and non-depolarizing muscle relaxants
    - Have dantrolene immediately available
    - Include detailed MH preparedness in plan

LATEST CLINICAL GUIDELINES (2024-2025):
- GLP-1 Receptor Agonists: Per updated ASA/multi-society consensus (Oct 2024), most patients may CONTINUE GLP-1s perioperatively with 24-hour solid food fasting. Only HIGH-RISK patients (dose escalation, GI symptoms, gastroparesis) should hold: daily dose on day of surgery, weekly dose 1 week prior (or 2 weeks for high-risk orthopedic surgery). Emphasize aspiration risk mitigation with gastric ultrasound when available.
- SGLT-2 Inhibitors: Continue up to day of surgery for most patients; hold on day of surgery to reduce DKA risk in major surgery.
- ACE-I/ARBs: Current evidence supports holding on day of surgery to prevent intraoperative hypotension.
- Anticoagulation: Follow ASRA guidelines for neuraxial anesthesia timing.
- Enhanced Recovery After Surgery (ERAS) protocols: Include multimodal analgesia, goal-directed fluid therapy, early mobilization.
- Use latest drug formulations and dosing recommendations from 2024-2025 literature.
11. PROVIDE DETAILED VENTILATION MANAGEMENT including:
    - Specific ventilator settings (mode, TV, RR, PEEP, FiO2)
    - Procedure-specific ventilation strategies (e.g., one-lung ventilation with DLT for thoracic surgery, protective ventilation, etc.)
    - Special techniques like recruitment maneuvers, hypercapnia management
    - PHYSIOLOGIC CONCERNS: Explain how ventilation affects the specific surgery (e.g., laparoscopy pneumoperitoneum causing decreased compliance, thoracic surgery V/Q mismatch, prone positioning effects, increased ICP with high PEEP in neurosurgery)
    - ANESTHETIC CONCERNS: How ventilator changes affect anesthetic depth, CO2 elimination, hemodynamics
12. PROVIDE DETAILED REGIONAL ANESTHESIA CONSIDERATIONS:
    - Recommend appropriate regional techniques for the procedure (epidural, spinal, nerve blocks, etc.)
    - Include contraindications if present (anticoagulation, infection, patient refusal)
    - Detail benefits and rationale for regional anesthesia
13. PROVIDE DETAILED ADJUNCT ANALGESIA:
    - Multimodal approach with acetaminophen, NSAIDs, gabapentinoids, ketamine, lidocaine infusions, etc.
    - Dosing and contraindications for each agent
14. PROVIDE DETAILED CLINICAL ANESTHETIC CONSIDERATIONS specific to the surgical procedure, including:
    - Procedure-specific physiologic changes and their anesthetic implications (e.g., increased ICP in neurosurgery, V/Q mismatch in thoracic surgery, decreased venous return in laparoscopy, hypothermia in long cases)
    - Critical perioperative events and how to manage them (e.g., VAE risk in sitting craniotomy, bronchospasm during OLV, hemorrhage risk)
    - Procedure-specific complications and prevention strategies
    - POSITIONING CONCERNS: Detailed analysis of patient position and risks:
      * Supine: occiput pressure, heel pressure, arm positioning for ulnar/radial/brachial plexus injury
      * Lithotomy: common peroneal nerve at fibular head, sciatic nerve stretch, compartment syndrome
      * Prone: eye pressure and vision loss, chest/abdomen compression affecting ventilation, brachial plexus stretch, genitalia pressure
      * Lateral: axillary roll for brachial plexus protection, dependent ear, peroneal nerve at lower leg
      * Sitting: VAE risk, pneumocephalus, hemodynamic instability
    - NERVE AND ORGAN INJURY PREVENTION: Specific nerves at risk and protective measures:
      * Ulnar nerve: padding at elbow, avoid flexion >90°
      * Brachial plexus: avoid arm abduction >90°, head rotation, shoulder braces
      * Common peroneal nerve: padding at fibular head in lithotomy
      * Eye injury: avoid direct pressure, lubrication, taping in prone
      * Ear: padding in lateral position
      * Renal injury: adequate perfusion, avoid prolonged hypotension
      * Hepatic injury: consider coagulopathy risk
    - Surgical considerations that impact anesthetic management (blood loss, duration, access to airway, patient movement restrictions)
15. PROVIDE DETAILED DISEASE-SPECIFIC ANESTHETIC CONSIDERATIONS for all patient comorbidities:
    - How each disease affects anesthetic management and drug choices
    - Organ-specific considerations (cardiac, pulmonary, renal, hepatic, endocrine, neurologic)
    - Drug interactions with anesthetic agents
    - Perioperative optimization strategies for each condition
    - Disease-specific monitoring requirements
    - Complications related to the disease process
16. PROVIDE DETAILED MEDICATION CONSIDERATIONS for all current medications:
    - How each medication interacts with anesthetic drugs
    - Whether medications should be continued or held perioperatively and why
    - Drug-drug interactions that affect anesthetic plan
    - Effects on anesthetic depth, hemodynamics, or coagulation
    - Withdrawal risks if medications are stopped
17. PROVIDE PREOPERATIVE RECOMMENDATIONS for missing but important data:
    - Recommend consults, labs, or imaging that would optimize care but were not provided
    - Explain rationale for each recommendation
    - Indicate urgency (Required vs Recommended)
18. The "rationales" section should include extensive educational content about WHY specific anesthetic choices are made for THIS procedure AND this patient's comorbidities.

Your output will be parsed by a TypeScript application, so strict JSON formatting matching the schema above is essential.`;

function buildCarePlanUserPrompt(caseDescription: string): string {
  return `Generate a complete anesthesia care plan for the following case:

${caseDescription}

CRITICAL REQUIREMENTS:

1. DO NOT ASSUME DATA: Only include labs, imaging, or exam findings that are explicitly provided above. If echo results are not provided, do NOT include "echoSummary". If labs are not provided, leave "relevantLabs" empty.

2. HYDROMORPHONE PREFERENCE: Always use hydromorphone (not morphine) as the preferred opioid for postoperative pain management.

3. VENTILATION MANAGEMENT: Provide detailed ventilator settings and procedure-specific strategies with PHYSIOLOGIC and ANESTHETIC concerns:
   - For thoracic surgery: Detail one-lung ventilation with double-lumen tube or bronchial blocker placement, management during OLV, V/Q mismatch, hypoxemia management, differential lung ventilation
   - For laparoscopic surgery: Address pneumoperitoneum effects (increased IAP, decreased venous return, decreased lung compliance), increased airway pressures, ventilation adjustments, CO2 absorption effects
   - For neurosurgery: Discuss hyperventilation for ICP control, PaCO2 targets, cerebral perfusion pressure, effects of PEEP on ICP
   - For prone positioning: Discuss chest/abdomen compression effects, increased airway pressures, ventilation distribution changes
   - For cardiac surgery: Discuss lung isolation needs, protective ventilation on bypass, post-bypass lung recruitment
   - For all cases: Include specific settings (mode, TV, RR, PEEP, FiO2), lung-protective strategies, and explain PHYSIOLOGIC RATIONALE

4. REGIONAL ANESTHESIA: Always evaluate and recommend appropriate regional techniques:
   - Epidural for major abdominal/thoracic surgery
   - Spinal for lower extremity/pelvic surgery
   - Nerve blocks (TAP, paravertebral, interscalene, femoral, etc.) for specific procedures
   - Address contraindications (anticoagulation, coagulopathy, infection, anatomic concerns)
   - Explain benefits: improved analgesia, reduced opioid consumption, faster recovery

5. ADJUNCT ANALGESIA: Include multimodal pain management:
   - Acetaminophen (IV or PO)
   - NSAIDs (ketorolac, ibuprofen) if not contraindicated
   - Gabapentin or pregabalin for neuropathic pain
   - Ketamine infusion for severe pain or opioid tolerance
   - Lidocaine infusion for abdominal surgery
   - Dexmedetomidine for adjunct sedation/analgesia

6. PROCEDURE-SPECIFIC CONSIDERATIONS:
   - Unique anesthetic challenges of this specific surgery
   - PHYSIOLOGIC changes during the procedure and their impact on anesthetic management
   - Critical intraoperative events and management (hemorrhage, air embolism, bronchospasm, etc.)
   - DETAILED positioning risks based on surgical position (supine/prone/lateral/lithotomy/sitting)
   - Specific NERVE INJURY risks for this position and prevention strategies
   - Specific ORGAN INJURY risks (eye, kidney, liver, etc.) and prevention
   - Surgical steps with anesthetic implications

7. COMORBIDITY-SPECIFIC CONSIDERATIONS (for EACH disease):
   - How each comorbidity affects anesthetic management
   - Pathophysiology and implications
   - Drug choice modifications
   - Organ-specific optimization
   - Disease-specific complications and monitoring

8. MEDICATION-SPECIFIC CONSIDERATIONS (for EACH medication using LATEST 2024-2025 GUIDELINES):
   - Continue vs. hold with rationale based on current evidence
   - For GLP-1 agonists (semaglutide, liraglutide, tirzepatide, dulaglutide): Apply Oct 2024 ASA multi-society consensus - continue for low-risk patients with 24hr solid food fast, consider holding for high-risk patients
   - For SGLT-2 inhibitors: Hold on day of surgery for major procedures
   - For ACE-I/ARBs: Hold on day of surgery per current evidence
   - For anticoagulants: Follow ASRA neuraxial guidelines with specific timing
   - Drug-anesthetic interactions based on latest pharmacology
   - Dosing modifications
   - Withdrawal risks
   - Timing of resumption

9. PREOPERATIVE RECOMMENDATIONS: If important data is missing, recommend:
   - Consults needed (cardiology, pulmonology, etc.)
   - Labs needed (cardiac markers, coags, renal function, etc.)
   - Imaging needed (echo, stress test, CXR, etc.)
   - Mark urgency as "Required" or "Recommended"
   - Provide clear rationale for each recommendation

10. RATIONALES SECTION: Provide 6-8+ detailed educational explanations covering:
    - Procedure-specific drug choices
    - Ventilation strategy rationale with physiologic concerns
    - Regional anesthesia benefits/contraindications
    - How comorbidities modify the plan
    - Medication management decisions
    - Positioning and nerve/organ injury prevention rationale
    - Pathophysiology and pharmacology

11. MALIGNANT HYPERTHERMIA CHECK:
    - IF patient has family history of MH, personal MH history, or any suspicion of MH susceptibility:
      * DO NOT use volatile anesthetics (sevoflurane, desflurane, isoflurane)
      * DO NOT use succinylcholine
      * Use TIVA (propofol-based) exclusively
      * Use non-depolarizing muscle relaxants (rocuronium, vecuronium, cisatracurium)
      * Emphasize dantrolene availability and MH preparedness
      * Include MH protocol in rationales

Return ONLY a JSON object matching the exact schema. Include all sections: patient, procedure, history, exam, labsAndImaging, riskAssessment, anestheticPlan, airwayPlan, ventilationPlan, regionalAnesthesiaPlan, monitoringPlan, linesAndAccessPlan, fluidAndBloodPlan, medicationsPlan, specialConsiderations, checklist, rationales, and preoperativeRecommendations.

Do not include markdown, code blocks, or explanatory text. Response must start with { and end with }.`;
}

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

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5-nano',
        messages: [
          {
            role: 'system',
            content: ANESTHESIA_CARE_PLAN_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: buildCarePlanUserPrompt(caseDescription),
          },
        ],
        max_completion_tokens: 16000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await openAIResponse.json();
    const carePlanJson = data.choices[0].message.content;

    let carePlan;
    try {
      carePlan = JSON.parse(carePlanJson);
    } catch (parseError) {
      throw new Error(`Failed to parse care plan JSON: ${parseError.message}`);
    }

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