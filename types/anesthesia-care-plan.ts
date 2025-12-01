// ================================
// ANESTHESIA CARE PLAN SCHEMA
// ================================

export interface PatientInfo {
  mrn?: string;
  name?: string;
  age: number;
  sex: "Male" | "Female" | "Other";
  weightKg: number;
  heightCm?: number;
  asaClass: "I" | "II" | "III" | "IV" | "V" | "VI" | "E";
}

export interface ProcedureInfo {
  primaryProcedure: string;
  procedureDescription?: string;
  majorAnesthesiaConcerns?: string[];
  surgicalService: string;
  urgency: "Elective" | "Urgent" | "Emergent";
  position: string;
}

export interface HistoryInfo {
  pmh: string[];
  pmhAnestheticImplications?: string[];
  psh: string[];
  pshAnestheticImplications?: string[];
  medications: string[];
  medicationAnestheticImplications?: string[];
  allergies: string[];
  familyAnestheticHistory: string;
  socialHistorySummary: string;
}

export interface AirwayExam {
  mallampati: "I" | "II" | "III" | "IV";
  tmDistanceCm?: number;
  neckMobility: "Full" | "Limited";
  dentition: string;
  anticipatedDifficultAirway: boolean;
  airwayConcerns: string;
}

export interface ExamInfo {
  airway: AirwayExam;
  cardiacSummary: string;
  pulmonarySummary: string;
  neuroSummary: string;
  renalHepaticEndocrineSummary: string;
  otherFindings: string;
}

export interface LabsAndImagingInfo {
  relevantLabs: string[];
  ekgSummary?: string;
  echoSummary?: string;
  otherImagingSummary?: string;
}

export type RiskLevel = "Low" | "Moderate" | "High";

export interface RiskAssessment {
  primaryRisks: string[];
  mhRisk: RiskLevel;
  aspirationRisk: RiskLevel;
  postopNauseaVomitingRisk: RiskLevel;
  obstructiveSleepApneaRisk: RiskLevel;
  cardiovascularRiskSummary: string;
  pulmonaryRiskSummary: string;
}

export interface PlanSection {
  summary: string;
  steps: string[];
}

export interface AnestheticPlan {
  anestheticTechnique: ("General" | "Regional" | "MAC" | "Combined")[];
  inductionPlan: PlanSection;
  maintenancePlan: PlanSection;
  emergencePlan: PlanSection;
  postopDisposition: string;
}

export interface AirwayPlan {
  primaryAirway: string;
  backupAirwayOptions: string[];
  difficultAirwayStrategy: string;
}

export interface VentilationPlan {
  ventilationMode: string;
  tidalVolume: string;
  respiratoryRate: string;
  peep: string;
  fio2: string;
  specialConsiderations: string[];
  procedureSpecificVentilation: string;
}

export interface RegionalAnesthesiaPlan {
  recommended: boolean;
  techniques: string[];
  rationale: string;
}

export interface MonitoringPlan {
  standardMonitors: string[];
  advancedMonitors: string[];
  rationale: string;
}

export interface LinesPlan {
  ivAccess: string;
  arterialLine: string;
  centralLine: string;
  otherAccess: string;
}

export interface FluidPlan {
  maintenanceFluids: string;
  bolusPlan: string;
  estimatedBloodLossRisk: RiskLevel;
  bloodProductsPlan: string;
}

export interface MedicationItem {
  name: string;
  dose: string;
  route: string;
  timing: string;
  reason: string;
}

export interface MedicationsPlan {
  premedications: MedicationItem[];
  inductionMeds: MedicationItem[];
  maintenanceMeds: MedicationItem[];
  procedureSpecificMeds?: MedicationItem[];
  postoperativeMeds: MedicationItem[];
  ponvProphylaxis: MedicationItem[];
  adjunctAnalgesics: MedicationItem[];
  painManagementStrategy: string;
}

export interface SpecialConsiderations {
  positioningConcerns: string[];
  nerveInjuryPrevention: string[];
  infectionPrevention: string[];
  temperatureManagement: string[];
  mhPreparedness: string;
}

export interface ChecklistItem {
  label: string;
  category: "Preop" | "Intraop" | "Postop";
  isCritical: boolean;
}

export interface RationaleItem {
  title: string;
  detail: string;
  linkedSection?: string;
}

export interface RecommendationItem {
  specialty?: string;
  test?: string;
  study?: string;
  reason: string;
  urgency: "Required" | "Recommended";
}

export interface PreoperativeRecommendations {
  recommendedConsults: RecommendationItem[];
  recommendedLabs: RecommendationItem[];
  recommendedImaging: RecommendationItem[];
  rationale: string;
}

export interface AnesthesiaCarePlan {
  patient: PatientInfo;
  procedure: ProcedureInfo;
  history: HistoryInfo;
  exam: ExamInfo;
  labsAndImaging: LabsAndImagingInfo;
  riskAssessment: RiskAssessment;
  anestheticPlan: AnestheticPlan;
  airwayPlan: AirwayPlan;
  ventilationPlan: VentilationPlan;
  regionalAnesthesiaPlan: RegionalAnesthesiaPlan;
  monitoringPlan: MonitoringPlan;
  linesAndAccessPlan: LinesPlan;
  fluidAndBloodPlan: FluidPlan;
  medicationsPlan: MedicationsPlan;
  specialConsiderations: SpecialConsiderations;
  checklist: ChecklistItem[];
  rationales: RationaleItem[];
  preoperativeRecommendations: PreoperativeRecommendations;
}
