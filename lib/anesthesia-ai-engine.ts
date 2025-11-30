// ================================
// CRNA AI OUTPUT ENGINE
// ================================

import { AnesthesiaCarePlan } from '@/types/anesthesia-care-plan';

export class CarePlanValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'CarePlanValidationError';
  }
}

/**
 * Parse and validate JSON output from LLM into AnesthesiaCarePlan
 */
export function parseAnesthesiaCarePlanJson(raw: string): AnesthesiaCarePlan {
  let parsed: any;

  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new CarePlanValidationError('Invalid JSON from LLM', { raw, err });
  }

  // Validate required top-level fields
  if (!parsed.patient) {
    throw new CarePlanValidationError('Missing required field: patient');
  }
  if (!parsed.procedure) {
    throw new CarePlanValidationError('Missing required field: procedure');
  }
  if (!parsed.anestheticPlan) {
    throw new CarePlanValidationError('Missing required field: anestheticPlan');
  }

  // Validate patient fields
  if (typeof parsed.patient.age !== 'number' || parsed.patient.age <= 0) {
    throw new CarePlanValidationError('Invalid patient.age');
  }
  if (typeof parsed.patient.weightKg !== 'number' || parsed.patient.weightKg <= 0) {
    throw new CarePlanValidationError('Invalid patient.weightKg');
  }
  if (!['Male', 'Female', 'Other'].includes(parsed.patient.sex)) {
    throw new CarePlanValidationError('Invalid patient.sex');
  }
  if (!['I', 'II', 'III', 'IV', 'V', 'VI', 'E'].includes(parsed.patient.asaClass)) {
    throw new CarePlanValidationError('Invalid patient.asaClass');
  }

  // Validate procedure fields
  if (!parsed.procedure.primaryProcedure || typeof parsed.procedure.primaryProcedure !== 'string') {
    throw new CarePlanValidationError('Invalid procedure.primaryProcedure');
  }
  if (!['Elective', 'Urgent', 'Emergent'].includes(parsed.procedure.urgency)) {
    throw new CarePlanValidationError('Invalid procedure.urgency');
  }

  // Apply defaults for optional fields
  const carePlan: AnesthesiaCarePlan = {
    patient: {
      mrn: parsed.patient.mrn || undefined,
      name: parsed.patient.name || undefined,
      age: parsed.patient.age,
      sex: parsed.patient.sex,
      weightKg: parsed.patient.weightKg,
      heightCm: parsed.patient.heightCm || undefined,
      asaClass: parsed.patient.asaClass,
    },
    procedure: {
      primaryProcedure: parsed.procedure.primaryProcedure,
      procedureDescription: parsed.procedure.procedureDescription || 'Not provided',
      majorAnesthesiaConcerns: Array.isArray(parsed.procedure.majorAnesthesiaConcerns)
        ? parsed.procedure.majorAnesthesiaConcerns
        : [],
      surgicalService: parsed.procedure.surgicalService || 'Not specified',
      urgency: parsed.procedure.urgency,
      position: parsed.procedure.position || 'Not specified',
    },
    history: {
      pmh: Array.isArray(parsed.history?.pmh) ? parsed.history.pmh : [],
      psh: Array.isArray(parsed.history?.psh) ? parsed.history.psh : [],
      medications: Array.isArray(parsed.history?.medications) ? parsed.history.medications : [],
      allergies: Array.isArray(parsed.history?.allergies) ? parsed.history.allergies : [],
      familyAnestheticHistory: parsed.history?.familyAnestheticHistory || 'None reported',
      socialHistorySummary: parsed.history?.socialHistorySummary || 'Not provided',
    },
    exam: {
      airway: {
        mallampati: parsed.exam?.airway?.mallampati || 'II',
        tmDistanceCm: parsed.exam?.airway?.tmDistanceCm || undefined,
        neckMobility: parsed.exam?.airway?.neckMobility || 'Full',
        dentition: parsed.exam?.airway?.dentition || 'Normal',
        anticipatedDifficultAirway: parsed.exam?.airway?.anticipatedDifficultAirway || false,
        airwayConcerns: parsed.exam?.airway?.airwayConcerns || 'None identified',
      },
      cardiacSummary: parsed.exam?.cardiacSummary || 'Not provided',
      pulmonarySummary: parsed.exam?.pulmonarySummary || 'Not provided',
      neuroSummary: parsed.exam?.neuroSummary || 'Not provided',
      renalHepaticEndocrineSummary: parsed.exam?.renalHepaticEndocrineSummary || 'Not provided',
      otherFindings: parsed.exam?.otherFindings || 'None',
    },
    labsAndImaging: {
      relevantLabs: Array.isArray(parsed.labsAndImaging?.relevantLabs)
        ? parsed.labsAndImaging.relevantLabs
        : [],
      ekgSummary: parsed.labsAndImaging?.ekgSummary || undefined,
      echoSummary: parsed.labsAndImaging?.echoSummary || undefined,
      otherImagingSummary: parsed.labsAndImaging?.otherImagingSummary || undefined,
    },
    riskAssessment: {
      primaryRisks: Array.isArray(parsed.riskAssessment?.primaryRisks)
        ? parsed.riskAssessment.primaryRisks
        : [],
      mhRisk: parsed.riskAssessment?.mhRisk || 'Low',
      aspirationRisk: parsed.riskAssessment?.aspirationRisk || 'Low',
      postopNauseaVomitingRisk: parsed.riskAssessment?.postopNauseaVomitingRisk || 'Low',
      obstructiveSleepApneaRisk: parsed.riskAssessment?.obstructiveSleepApneaRisk || 'Low',
      cardiovascularRiskSummary: parsed.riskAssessment?.cardiovascularRiskSummary || 'Not assessed',
      pulmonaryRiskSummary: parsed.riskAssessment?.pulmonaryRiskSummary || 'Not assessed',
    },
    anestheticPlan: {
      anestheticTechnique: Array.isArray(parsed.anestheticPlan?.anestheticTechnique)
        ? parsed.anestheticPlan.anestheticTechnique
        : ['General'],
      inductionPlan: {
        summary: parsed.anestheticPlan?.inductionPlan?.summary || 'Not specified',
        steps: Array.isArray(parsed.anestheticPlan?.inductionPlan?.steps)
          ? parsed.anestheticPlan.inductionPlan.steps
          : [],
      },
      maintenancePlan: {
        summary: parsed.anestheticPlan?.maintenancePlan?.summary || 'Not specified',
        steps: Array.isArray(parsed.anestheticPlan?.maintenancePlan?.steps)
          ? parsed.anestheticPlan.maintenancePlan.steps
          : [],
      },
      emergencePlan: {
        summary: parsed.anestheticPlan?.emergencePlan?.summary || 'Not specified',
        steps: Array.isArray(parsed.anestheticPlan?.emergencePlan?.steps)
          ? parsed.anestheticPlan.emergencePlan.steps
          : [],
      },
      postopDisposition: parsed.anestheticPlan?.postopDisposition || 'PACU',
    },
    airwayPlan: {
      primaryAirway: parsed.airwayPlan?.primaryAirway || 'ETT',
      backupAirwayOptions: Array.isArray(parsed.airwayPlan?.backupAirwayOptions)
        ? parsed.airwayPlan.backupAirwayOptions
        : [],
      difficultAirwayStrategy: parsed.airwayPlan?.difficultAirwayStrategy || 'Not specified',
    },
    ventilationPlan: {
      ventilationMode: parsed.ventilationPlan?.ventilationMode || 'Volume control',
      tidalVolume: parsed.ventilationPlan?.tidalVolume || '6-8 mL/kg IBW',
      respiratoryRate: parsed.ventilationPlan?.respiratoryRate || '10-12 bpm',
      peep: parsed.ventilationPlan?.peep || '5 cmH2O',
      fio2: parsed.ventilationPlan?.fio2 || '100% initially, titrate to SpO2 >95%',
      specialConsiderations: Array.isArray(parsed.ventilationPlan?.specialConsiderations)
        ? parsed.ventilationPlan.specialConsiderations
        : [],
      procedureSpecificVentilation: parsed.ventilationPlan?.procedureSpecificVentilation || 'Standard ventilation',
    },
    regionalAnesthesiaPlan: {
      recommended: parsed.regionalAnesthesiaPlan?.recommended || false,
      techniques: Array.isArray(parsed.regionalAnesthesiaPlan?.techniques)
        ? parsed.regionalAnesthesiaPlan.techniques
        : [],
      rationale: parsed.regionalAnesthesiaPlan?.rationale || 'Not applicable',
    },
    monitoringPlan: {
      standardMonitors: Array.isArray(parsed.monitoringPlan?.standardMonitors)
        ? parsed.monitoringPlan.standardMonitors
        : ['ASA Standard Monitors'],
      advancedMonitors: Array.isArray(parsed.monitoringPlan?.advancedMonitors)
        ? parsed.monitoringPlan.advancedMonitors
        : [],
      rationale: parsed.monitoringPlan?.rationale || 'Standard monitoring',
    },
    linesAndAccessPlan: {
      ivAccess: parsed.linesAndAccessPlan?.ivAccess || 'PIV x1',
      arterialLine: parsed.linesAndAccessPlan?.arterialLine || 'Not indicated',
      centralLine: parsed.linesAndAccessPlan?.centralLine || 'Not indicated',
      otherAccess: parsed.linesAndAccessPlan?.otherAccess || 'None',
    },
    fluidAndBloodPlan: {
      maintenanceFluids: parsed.fluidAndBloodPlan?.maintenanceFluids || 'LR at maintenance rate',
      bolusPlan: parsed.fluidAndBloodPlan?.bolusPlan || 'PRN for hypotension',
      estimatedBloodLossRisk: parsed.fluidAndBloodPlan?.estimatedBloodLossRisk || 'Low',
      bloodProductsPlan: parsed.fluidAndBloodPlan?.bloodProductsPlan || 'Type and screen',
    },
    medicationsPlan: {
      premedications: Array.isArray(parsed.medicationsPlan?.premedications)
        ? parsed.medicationsPlan.premedications
        : [],
      inductionMeds: Array.isArray(parsed.medicationsPlan?.inductionMeds)
        ? parsed.medicationsPlan.inductionMeds
        : [],
      maintenanceMeds: Array.isArray(parsed.medicationsPlan?.maintenanceMeds)
        ? parsed.medicationsPlan.maintenanceMeds
        : [],
      procedureSpecificMeds: Array.isArray(parsed.medicationsPlan?.procedureSpecificMeds)
        ? parsed.medicationsPlan.procedureSpecificMeds
        : [],
      postoperativeMeds: Array.isArray(parsed.medicationsPlan?.postoperativeMeds)
        ? parsed.medicationsPlan.postoperativeMeds
        : [],
      ponvProphylaxis: Array.isArray(parsed.medicationsPlan?.ponvProphylaxis)
        ? parsed.medicationsPlan.ponvProphylaxis
        : [],
      adjunctAnalgesics: Array.isArray(parsed.medicationsPlan?.adjunctAnalgesics)
        ? parsed.medicationsPlan.adjunctAnalgesics
        : [],
      painManagementStrategy: parsed.medicationsPlan?.painManagementStrategy || 'Multimodal analgesia',
    },
    specialConsiderations: {
      positioningConcerns: Array.isArray(parsed.specialConsiderations?.positioningConcerns)
        ? parsed.specialConsiderations.positioningConcerns
        : [],
      nerveInjuryPrevention: Array.isArray(parsed.specialConsiderations?.nerveInjuryPrevention)
        ? parsed.specialConsiderations.nerveInjuryPrevention
        : [],
      infectionPrevention: Array.isArray(parsed.specialConsiderations?.infectionPrevention)
        ? parsed.specialConsiderations.infectionPrevention
        : [],
      temperatureManagement: Array.isArray(parsed.specialConsiderations?.temperatureManagement)
        ? parsed.specialConsiderations.temperatureManagement
        : [],
      mhPreparedness: parsed.specialConsiderations?.mhPreparedness || 'MH cart available',
    },
    checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [],
    rationales: Array.isArray(parsed.rationales) ? parsed.rationales : [],
    preoperativeRecommendations: {
      recommendedConsults: Array.isArray(parsed.preoperativeRecommendations?.recommendedConsults)
        ? parsed.preoperativeRecommendations.recommendedConsults
        : [],
      recommendedLabs: Array.isArray(parsed.preoperativeRecommendations?.recommendedLabs)
        ? parsed.preoperativeRecommendations.recommendedLabs
        : [],
      recommendedImaging: Array.isArray(parsed.preoperativeRecommendations?.recommendedImaging)
        ? parsed.preoperativeRecommendations.recommendedImaging
        : [],
      rationale: parsed.preoperativeRecommendations?.rationale || '',
    },
  };

  return carePlan;
}

/**
 * System prompt for LLM
 */
export const ANESTHESIA_CARE_PLAN_SYSTEM_PROMPT = `You are an expert CRNA (Certified Registered Nurse Anesthetist) anesthesia planning assistant. Your role is to generate comprehensive, clinically accurate anesthesia care plans based on patient case descriptions.

CRITICAL INSTRUCTIONS:
1. You MUST respond with ONLY valid JSON. No markdown, no explanations, no extra text.
2. The JSON MUST match the AnesthesiaCarePlan schema exactly.
3. Use CRNA-level clinical reasoning and evidence-based practice.
4. Be thorough but concise in your clinical summaries.
5. Include appropriate risk assessments, medication dosing, and monitoring plans.
6. Consider patient-specific factors like age, weight, ASA class, and comorbidities.
7. If information is not provided, make clinically reasonable inferences and note them.
8. Use realistic medication names, doses, and routes.
9. Include appropriate safety checklists and rationales for key decisions.

COMPREHENSIVE CARE PLAN REQUIREMENTS:
10. PROCEDURE DESCRIPTION: Provide a clear, detailed description of what the surgery/procedure entails in the "procedureDescription" field. Include surgical approach, key steps, and what makes this procedure unique.
11. MAJOR ANESTHESIA CONCERNS: List the primary anesthesia concerns specific to THIS procedure in "majorAnesthesiaConcerns" array. These should be procedure-specific risks and challenges (e.g., for CABG: hemodynamic instability, myocardial ischemia, coagulopathy, hypothermia).
12. PROCEDURE-SPECIFIC MEDICATIONS: In "procedureSpecificMeds" array, include medications that are specifically required or commonly used for THIS procedure (e.g., heparin and protamine for cardiac surgery, glucagon for pheochromocytoma, vasopressors for neuraxial anesthesia, antibiotics for orthopedic hardware, sugammadex for rapid reversal). Include full medication details: name, dose, route, timing, and reason.
13. VENTILATION MANAGEMENT: Include procedure-specific ventilation strategies. For thoracic surgery, specify one-lung ventilation technique, double-lumen tube size and management, strategies for hypoxemia during OLV.
14. SURGICAL CONSIDERATIONS: Detail the specific surgical concerns, anticipated complications, and key anesthetic management points for the exact procedure being performed.
15. REGIONAL ANESTHESIA: Recommend appropriate regional techniques (peripheral nerve blocks, neuraxial anesthesia) when applicable. Include adjunct analgesics beyond opioids.
16. PREOPERATIVE RECOMMENDATIONS: If labs, imaging, or consults are not provided but would be clinically indicated, list them in preoperativeRecommendations with clear rationale and urgency level.
17. DISEASE-SPECIFIC CONSIDERATIONS: Address anesthetic implications of pre-existing conditions, current medications, and abnormal labs/imaging provided.

Your output will be parsed by a TypeScript application, so strict JSON formatting is essential.`;

/**
 * Build user prompt from case description
 */
export function buildCarePlanUserPrompt(freeTextCaseDescription: string): string {
  return `Please generate a complete anesthesia care plan for the following case:

${freeTextCaseDescription}

Generate a comprehensive CRNA-level anesthesia care plan that includes:

PATIENT & PROCEDURE:
- Complete patient assessment (demographics, ASA class, vital information)
- Detailed procedure description explaining what the surgery entails
- Major anesthesia concerns specific to this procedure
- Detailed history (medical, surgical, medications, allergies, social)
- Physical examination findings (especially airway assessment)
- Relevant labs and imaging

RISK ASSESSMENT:
- Risk assessment for all major perioperative risks
- Anesthetic considerations for pre-existing diseases and their management
- Medication interactions and concerns
- Lab/imaging abnormalities and their anesthetic implications

ANESTHETIC PLAN:
- Complete anesthetic plan (induction, maintenance, emergence)
- Airway management strategy with backup plans
- Detailed medication plan with specific drugs, doses, routes, timing, and rationales
- PROCEDURE-SPECIFIC MEDICATIONS: List medications required specifically for this surgery type in the procedureSpecificMeds array (e.g., heparin/protamine for cardiac, glucagon for pheochromocytoma, norepinephrine infusion for neuraxial, antibiotics for implants, dexmedetomidine for awake craniotomy)

VENTILATION MANAGEMENT:
- Standard ventilation parameters (mode, tidal volume, rate, PEEP, FiO2)
- Procedure-specific ventilation strategies (e.g., one-lung ventilation for thoracic surgery, double-lumen tube placement and management)
- Special ventilation considerations for the specific surgery and patient comorbidities
- Lung-protective ventilation strategies when indicated

SURGICAL CONSIDERATIONS:
- Surgical concerns and anticipated challenges specific to this procedure
- Key anesthetic management points for this specific surgery
- Positioning requirements and potential complications
- Expected surgical duration and blood loss

REGIONAL ANESTHESIA & ANALGESIA:
- Regional anesthesia techniques (if applicable - blocks, epidural, spinal)
- Adjunct analgesic medications beyond standard opioids
- Multimodal pain management strategy specific to the procedure
- Regional technique rationale and expected benefits

PREOPERATIVE RECOMMENDATIONS:
- Recommended consults (if not already obtained) with specialty and rationale
- Recommended labs (if not provided) with specific tests and reasons
- Recommended imaging studies (if not provided) with modality and justification
- Urgency level for each recommendation (Required vs Recommended)
- Clinical reasoning for why each recommendation is important for safe anesthetic care

MONITORING & ACCESS:
- Monitoring plan (standard and advanced monitors as indicated)
- Lines and access requirements
- Fluid and blood management plan

SPECIAL CONSIDERATIONS:
- Special considerations (positioning, nerve injury prevention, infection control, temperature management)
- Preop/intraop/postop safety checklist items
- Clinical rationales for key decisions

Be specific about procedure-related considerations. For example:
- Thoracic surgery: Discuss double-lumen tube, one-lung ventilation, hypoxic pulmonary vasoconstriction
- Neurosurgery: Discuss ICP management, avoid increases in ICP, positioning concerns
- Cardiac surgery: Discuss hemodynamic goals, TEE monitoring, anticoagulation
- Orthopedic surgery: Discuss regional techniques, DVT prophylaxis, fat embolism risk
- Laparoscopic surgery: Discuss pneumoperitoneum effects, positioning, PONV prophylaxis

IMPORTANT: Return ONLY the JSON object. Do not include any markdown formatting, code blocks, or explanatory text. The response must start with { and end with }.`;
}

/**
 * Call OpenAI to generate care plan
 */
export async function generateCarePlanWithOpenAI(
  caseDescription: string,
  openAIKey: string
): Promise<AnesthesiaCarePlan> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAIKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
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
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const rawJson = data.choices[0].message.content;

  return parseAnesthesiaCarePlanJson(rawJson);
}
