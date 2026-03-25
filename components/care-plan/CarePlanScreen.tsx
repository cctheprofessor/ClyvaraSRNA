import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Pressable, Platform, Image, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { AnesthesiaCarePlan } from '@/types/anesthesia-care-plan';
import { SectionCard } from './SectionCard';
import { RiskTag } from './RiskTag';
import { KeyValueRow } from './KeyValueRow';
import { MedicationList } from './MedicationList';
import { ChecklistSection } from './ChecklistSection';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { ArrowLeft, FileText, GraduationCap, Stethoscope, User, ExternalLink, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';

interface CarePlanScreenProps {
  carePlan: AnesthesiaCarePlan;
  caseDescription?: string;
  carePlanId?: string;
}

export function CarePlanScreen({ carePlan, caseDescription, carePlanId }: CarePlanScreenProps) {
  const router = useRouter();
  const { patient, procedure, history, exam, labsAndImaging, riskAssessment } = carePlan;
  const { anestheticPlan, airwayPlan, ventilationPlan, regionalAnesthesiaPlan, monitoringPlan, linesAndAccessPlan } = carePlan;
  const { fluidAndBloodPlan, medicationsPlan, specialConsiderations, preoperativeRecommendations } = carePlan;
  const { checklist, rationales } = carePlan;

  const handleBackToCarePlanHome = () => {
    router.push('/(tabs)');
  };

  const handleEditCase = () => {
    if (caseDescription && carePlanId) {
      router.push({
        pathname: '/anesthesia-care-plan/edit/[id]',
        params: { id: carePlanId, caseDescription }
      } as any);
    }
  };

  const handleGoHome = () => {
    router.replace('/(tabs)/home');
  };

  const handleOpenCitation = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const { citations } = carePlan;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Pressable style={styles.backButton} onPress={handleBackToCarePlanHome}>
          <ArrowLeft color={Colors.primary} size={24} />
        </Pressable>
      </View>

      <PageHeader
        title="Anesthesia Care Plan"
        subtitle="Efficient x Comprehensive"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>

        {/* Disclaimer Banner */}
        <View style={styles.disclaimerBanner}>
          <AlertTriangle color={Colors.warning} size={16} />
          <Text style={styles.disclaimerBannerText}>
            This plan is AI-generated for educational and planning purposes only. It is not a substitute for clinical judgment. All recommendations are based on published clinical guidelines — see References at the bottom of this plan.
          </Text>
        </View>
        {/* Patient & Procedure */}
        <SectionCard title="Patient & Procedure Information">
        <View style={styles.infoGrid}>
          <KeyValueRow label="Age" value={`${patient.age} years`} />
          <KeyValueRow label="Sex" value={patient.sex} />
          <KeyValueRow label="Weight" value={`${patient.weightKg} kg`} />
          {patient.heightCm && <KeyValueRow label="Height" value={`${patient.heightCm} cm`} />}
          <KeyValueRow label="ASA Class" value={patient.asaClass} />
        </View>

        <View style={styles.divider} />

        <KeyValueRow label="Procedure" value={procedure.primaryProcedure} vertical />
        {procedure.procedureDescription && (
          <KeyValueRow label="Description" value={procedure.procedureDescription} vertical />
        )}

        {procedure.majorAnesthesiaConcerns && procedure.majorAnesthesiaConcerns.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Major Anesthesia Concerns</Text>
            {procedure.majorAnesthesiaConcerns.map((concern, index) => (
              <View key={index} style={styles.concernBox}>
                <Text style={styles.concernText}>• {concern}</Text>
              </View>
            ))}
          </View>
        )}

        {procedure.procedureSpecificAnestheticConsiderations && procedure.procedureSpecificAnestheticConsiderations.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Procedure-Specific Anesthetic Considerations</Text>
            {procedure.procedureSpecificAnestheticConsiderations.map((consideration, index) => (
              <View key={index} style={styles.implicationBox}>
                <Text style={styles.implicationText}>• {consideration}</Text>
              </View>
            ))}
          </View>
        )}

        {procedure.procedureSpecificMedications && procedure.procedureSpecificMedications.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Procedure-Specific Medications</Text>
            {procedure.procedureSpecificMedications.map((medication, index) => (
              <View key={index} style={styles.medicationBox}>
                <Text style={styles.medicationText}>• {medication}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.divider} />

        <KeyValueRow label="Service" value={procedure.surgicalService} />
        <KeyValueRow label="Urgency" value={procedure.urgency} />
        <KeyValueRow label="Position" value={procedure.position} />
      </SectionCard>

      {/* History */}
      <SectionCard title="History & Background">
        {history.pmh.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Past Medical History</Text>
            {history.pmh.map((item, index) => (
              <Text key={index} style={styles.bulletText}>
                • {item}
              </Text>
            ))}
            {history.pmhAnestheticImplications && history.pmhAnestheticImplications.length > 0 && (
              <View style={styles.implicationBox}>
                <Text style={styles.implicationTitle}>Anesthetic Implications:</Text>
                {history.pmhAnestheticImplications.map((implication, index) => (
                  <Text key={index} style={styles.implicationText}>
                    • {implication}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {history.psh.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Past Surgical History</Text>
            {history.psh.map((item, index) => (
              <Text key={index} style={styles.bulletText}>
                • {item}
              </Text>
            ))}
            {history.pshAnestheticImplications && history.pshAnestheticImplications.length > 0 && (
              <View style={styles.implicationBox}>
                <Text style={styles.implicationTitle}>Anesthetic Implications:</Text>
                {history.pshAnestheticImplications.map((implication, index) => (
                  <Text key={index} style={styles.implicationText}>
                    • {implication}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {history.medications.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Medications</Text>
            {history.medications.map((item, index) => (
              <Text key={index} style={styles.bulletText}>
                • {item}
              </Text>
            ))}
            {history.medicationAnestheticImplications && history.medicationAnestheticImplications.length > 0 && (
              <View style={styles.implicationBox}>
                <Text style={styles.implicationTitle}>Anesthetic Implications:</Text>
                {history.medicationAnestheticImplications.map((implication, index) => (
                  <Text key={index} style={styles.implicationText}>
                    • {implication}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {history.allergies.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Allergies</Text>
            {history.allergies.map((item, index) => (
              <Text key={index} style={[styles.bulletText, styles.allergyText]}>
                • {item}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.subsection}>
          <KeyValueRow label="Family Anesthetic History" value={history.familyAnestheticHistory} vertical />
          <KeyValueRow label="Social History" value={history.socialHistorySummary} vertical />
        </View>
      </SectionCard>

      {/* Physical Exam */}
      <SectionCard title="Physical Examination">
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Airway Assessment</Text>
          <KeyValueRow label="Mallampati" value={exam.airway.mallampati} />
          {exam.airway.tmDistanceCm && (
            <KeyValueRow label="TM Distance" value={`${exam.airway.tmDistanceCm} cm`} />
          )}
          <KeyValueRow label="Neck Mobility" value={exam.airway.neckMobility} />
          <KeyValueRow label="Dentition" value={exam.airway.dentition} />
          <KeyValueRow
            label="Difficult Airway"
            value={exam.airway.anticipatedDifficultAirway ? 'Yes' : 'No'}
          />
          {exam.airway.airwayConcerns !== 'None identified' && (
            <View style={styles.concernBox}>
              <Text style={styles.concernText}>{exam.airway.airwayConcerns}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Systems Review</Text>
          <KeyValueRow label="Cardiac" value={exam.cardiacSummary} vertical />
          <KeyValueRow label="Pulmonary" value={exam.pulmonarySummary} vertical />
          <KeyValueRow label="Neurological" value={exam.neuroSummary} vertical />
          <KeyValueRow
            label="Renal/Hepatic/Endocrine"
            value={exam.renalHepaticEndocrineSummary}
            vertical
          />
          {exam.otherFindings !== 'None' && (
            <KeyValueRow label="Other Findings" value={exam.otherFindings} vertical />
          )}
        </View>
      </SectionCard>

      {/* Labs & Imaging */}
      {labsAndImaging.relevantLabs.length > 0 && (
        <SectionCard title="Labs & Imaging">
          {labsAndImaging.relevantLabs.map((lab, index) => (
            <Text key={index} style={styles.bulletText}>
              • {lab}
            </Text>
          ))}
          {labsAndImaging.ekgSummary && (
            <View style={styles.subsection}>
              <KeyValueRow label="EKG" value={labsAndImaging.ekgSummary} vertical />
            </View>
          )}
          {labsAndImaging.echoSummary && (
            <View style={styles.subsection}>
              <KeyValueRow label="Echo" value={labsAndImaging.echoSummary} vertical />
            </View>
          )}
          {labsAndImaging.otherImagingSummary && (
            <View style={styles.subsection}>
              <KeyValueRow label="Other Imaging" value={labsAndImaging.otherImagingSummary} vertical />
            </View>
          )}
        </SectionCard>
      )}

      {/* Risk Assessment */}
      <SectionCard title="Risk Assessment" headerColor={Colors.secondary}>
        <View style={styles.riskTagContainer}>
          <RiskTag level={riskAssessment.mhRisk} label="MH Risk" />
          <RiskTag level={riskAssessment.aspirationRisk} label="Aspiration" />
          <RiskTag level={riskAssessment.postopNauseaVomitingRisk} label="PONV" />
          <RiskTag level={riskAssessment.obstructiveSleepApneaRisk} label="OSA" />
        </View>

        {riskAssessment.primaryRisks.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Primary Risks</Text>
            {riskAssessment.primaryRisks.map((risk, index) => (
              <Text key={index} style={styles.bulletText}>
                • {risk}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.divider} />

        <KeyValueRow
          label="Cardiovascular Risk"
          value={riskAssessment.cardiovascularRiskSummary}
          vertical
        />
        <KeyValueRow label="Pulmonary Risk" value={riskAssessment.pulmonaryRiskSummary} vertical />
      </SectionCard>

      {/* Anesthetic Plan */}
      <SectionCard title="Anesthetic Plan" headerColor={Colors.primary}>
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Technique</Text>
          <View style={styles.techniqueContainer}>
            {anestheticPlan.anestheticTechnique.map((tech, index) => (
              <View key={index} style={styles.techniquePill}>
                <Text style={styles.techniquePillText}>{tech}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Induction</Text>
          <Text style={styles.planSummary}>{anestheticPlan.inductionPlan.summary}</Text>
          {anestheticPlan.inductionPlan.steps.length > 0 && (
            <View style={styles.stepsList}>
              {anestheticPlan.inductionPlan.steps.map((step, index) => (
                <Text key={index} style={styles.stepText}>
                  {index + 1}. {step}
                </Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Maintenance</Text>
          <Text style={styles.planSummary}>{anestheticPlan.maintenancePlan.summary}</Text>
          {anestheticPlan.maintenancePlan.steps.length > 0 && (
            <View style={styles.stepsList}>
              {anestheticPlan.maintenancePlan.steps.map((step, index) => (
                <Text key={index} style={styles.stepText}>
                  {index + 1}. {step}
                </Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Emergence</Text>
          <Text style={styles.planSummary}>{anestheticPlan.emergencePlan.summary}</Text>
          {anestheticPlan.emergencePlan.steps.length > 0 && (
            <View style={styles.stepsList}>
              {anestheticPlan.emergencePlan.steps.map((step, index) => (
                <Text key={index} style={styles.stepText}>
                  {index + 1}. {step}
                </Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <KeyValueRow label="Postop Disposition" value={anestheticPlan.postopDisposition} />
      </SectionCard>

      {/* Airway & Monitoring */}
      <SectionCard title="Airway & Monitoring Plan">
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Airway Management</Text>
          <KeyValueRow label="Primary Airway" value={airwayPlan.primaryAirway} />
          {airwayPlan.backupAirwayOptions.length > 0 && (
            <>
              <Text style={[styles.subsectionTitle, { marginTop: Spacing.sm }]}>Backup Options</Text>
              {airwayPlan.backupAirwayOptions.map((option, index) => (
                <Text key={index} style={styles.bulletText}>
                  • {option}
                </Text>
              ))}
            </>
          )}
          {airwayPlan.difficultAirwayStrategy !== 'Not specified' && (
            <View style={styles.strategyBox}>
              <Text style={styles.strategyTitle}>Difficult Airway Strategy</Text>
              <Text style={styles.strategyText}>{airwayPlan.difficultAirwayStrategy}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Monitoring</Text>
          {monitoringPlan.standardMonitors.length > 0 && (
            <>
              <Text style={styles.monitorLabel}>Standard Monitors</Text>
              {monitoringPlan.standardMonitors.map((monitor, index) => (
                <Text key={index} style={styles.bulletText}>
                  • {monitor}
                </Text>
              ))}
            </>
          )}
          {monitoringPlan.advancedMonitors.length > 0 && (
            <>
              <Text style={[styles.monitorLabel, { marginTop: Spacing.sm }]}>
                Advanced Monitors
              </Text>
              {monitoringPlan.advancedMonitors.map((monitor, index) => (
                <Text key={index} style={styles.bulletText}>
                  • {monitor}
                </Text>
              ))}
            </>
          )}
          <View style={styles.rationaleBox}>
            <Text style={styles.rationaleText}>{monitoringPlan.rationale}</Text>
          </View>
        </View>
      </SectionCard>

      {/* Ventilation Plan */}
      <SectionCard title="Ventilation Management" headerColor={Colors.secondary}>
        <View style={styles.subsection}>
          <KeyValueRow label="Ventilation Mode" value={ventilationPlan.ventilationMode} />
          <KeyValueRow label="Tidal Volume" value={ventilationPlan.tidalVolume} />
          <KeyValueRow label="Respiratory Rate" value={ventilationPlan.respiratoryRate} />
          <KeyValueRow label="PEEP" value={ventilationPlan.peep} />
          <KeyValueRow label="FiO2" value={ventilationPlan.fio2} />
        </View>

        {ventilationPlan.specialConsiderations.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Special Considerations</Text>
              {ventilationPlan.specialConsiderations.map((consideration, index) => (
                <Text key={index} style={styles.bulletText}>
                  • {consideration}
                </Text>
              ))}
            </View>
          </>
        )}

        {ventilationPlan.procedureSpecificVentilation !== 'Standard ventilation' && (
          <View style={styles.strategyBox}>
            <Text style={styles.strategyTitle}>Procedure-Specific Ventilation</Text>
            <Text style={styles.strategyText}>{ventilationPlan.procedureSpecificVentilation}</Text>
          </View>
        )}
      </SectionCard>

      {/* Regional Anesthesia Plan */}
      {regionalAnesthesiaPlan.recommended && (
        <SectionCard title="Regional Anesthesia" headerColor={Colors.primary}>
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Recommended Techniques</Text>
            {regionalAnesthesiaPlan.techniques.map((technique, index) => {
              const techniqueText = typeof technique === 'string' ? technique : String(technique);
              return (
                <Text key={index} style={styles.bulletText}>
                  • {techniqueText}
                </Text>
              );
            })}
          </View>

          <View style={styles.strategyBox}>
            <Text style={styles.strategyTitle}>Rationale</Text>
            <Text style={styles.strategyText}>{regionalAnesthesiaPlan.rationale}</Text>
          </View>
        </SectionCard>
      )}

      {/* Lines & Access */}
      <SectionCard title="Lines & Vascular Access">
        <KeyValueRow label="IV Access" value={linesAndAccessPlan.ivAccess} />
        <KeyValueRow label="Arterial Line" value={linesAndAccessPlan.arterialLine} />
        <KeyValueRow label="Central Line" value={linesAndAccessPlan.centralLine} />
        {linesAndAccessPlan.otherAccess !== 'None' && (
          <KeyValueRow label="Other Access" value={linesAndAccessPlan.otherAccess} />
        )}
      </SectionCard>

      {/* Fluids & Blood */}
      <SectionCard title="Fluid & Blood Management">
        <KeyValueRow label="Maintenance Fluids" value={fluidAndBloodPlan.maintenanceFluids} vertical />
        <KeyValueRow label="Bolus Plan" value={fluidAndBloodPlan.bolusPlan} vertical />

        <View style={styles.divider} />

        <View style={styles.riskTagContainer}>
          <RiskTag level={fluidAndBloodPlan.estimatedBloodLossRisk} label="EBL Risk" />
        </View>

        <KeyValueRow label="Blood Products" value={fluidAndBloodPlan.bloodProductsPlan} vertical />
      </SectionCard>

      {/* Medications */}
      <SectionCard title="Medication Plan" headerColor={Colors.secondary}>
        <MedicationList title="Premedications" meds={medicationsPlan.premedications} />
        <MedicationList title="Induction Medications" meds={medicationsPlan.inductionMeds} />
        <MedicationList title="Maintenance Medications" meds={medicationsPlan.maintenanceMeds} />
        <MedicationList title="Procedure-Specific Medications" meds={medicationsPlan.procedureSpecificMeds} highlight />
        <MedicationList title="Postoperative Medications" meds={medicationsPlan.postoperativeMeds} />
        <MedicationList title="PONV Prophylaxis" meds={medicationsPlan.ponvProphylaxis} />
        <MedicationList title="Adjunct Analgesics" meds={medicationsPlan.adjunctAnalgesics} />

        <View style={styles.divider} />

        <View style={styles.strategyBox}>
          <Text style={styles.strategyTitle}>Pain Management Strategy</Text>
          <Text style={styles.strategyText}>{medicationsPlan.painManagementStrategy}</Text>
        </View>
      </SectionCard>

      {/* Special Considerations */}
      <SectionCard title="Special Considerations">
        {specialConsiderations.positioningConcerns.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Positioning Concerns</Text>
            {specialConsiderations.positioningConcerns.map((concern, index) => (
              <Text key={index} style={styles.bulletText}>
                • {concern}
              </Text>
            ))}
          </View>
        )}

        {specialConsiderations.nerveInjuryPrevention.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Nerve Injury Prevention</Text>
            {specialConsiderations.nerveInjuryPrevention.map((item, index) => (
              <Text key={index} style={styles.bulletText}>
                • {item}
              </Text>
            ))}
          </View>
        )}

        {specialConsiderations.infectionPrevention.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Infection Prevention</Text>
            {specialConsiderations.infectionPrevention.map((item, index) => (
              <Text key={index} style={styles.bulletText}>
                • {item}
              </Text>
            ))}
          </View>
        )}

        {specialConsiderations.temperatureManagement.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Temperature Management</Text>
            {specialConsiderations.temperatureManagement.map((item, index) => (
              <Text key={index} style={styles.bulletText}>
                • {item}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.divider} />

        <KeyValueRow label="MH Preparedness" value={specialConsiderations.mhPreparedness} vertical />
      </SectionCard>

      {/* Preoperative Recommendations */}
      {(preoperativeRecommendations.recommendedConsults.length > 0 ||
        preoperativeRecommendations.recommendedLabs.length > 0 ||
        preoperativeRecommendations.recommendedImaging.length > 0) && (
        <SectionCard title="Preoperative Recommendations" headerColor={Colors.secondary}>
          {preoperativeRecommendations.recommendedConsults.length > 0 && (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Recommended Consults</Text>
              {preoperativeRecommendations.recommendedConsults.map((item, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <View style={styles.recommendationHeader}>
                    <Text style={styles.recommendationTitle}>{item.specialty}</Text>
                    <View
                      style={[
                        styles.urgencyBadge,
                        item.urgency === 'Required' ? styles.urgencyRequired : styles.urgencyRecommended,
                      ]}
                    >
                      <Text style={styles.urgencyText}>{item.urgency}</Text>
                    </View>
                  </View>
                  <Text style={styles.recommendationReason}>{item.reason}</Text>
                </View>
              ))}
            </View>
          )}

          {preoperativeRecommendations.recommendedLabs.length > 0 && (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Recommended Labs</Text>
              {preoperativeRecommendations.recommendedLabs.map((item, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <View style={styles.recommendationHeader}>
                    <Text style={styles.recommendationTitle}>{item.test}</Text>
                    <View
                      style={[
                        styles.urgencyBadge,
                        item.urgency === 'Required' ? styles.urgencyRequired : styles.urgencyRecommended,
                      ]}
                    >
                      <Text style={styles.urgencyText}>{item.urgency}</Text>
                    </View>
                  </View>
                  <Text style={styles.recommendationReason}>{item.reason}</Text>
                </View>
              ))}
            </View>
          )}

          {preoperativeRecommendations.recommendedImaging.length > 0 && (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Recommended Imaging</Text>
              {preoperativeRecommendations.recommendedImaging.map((item, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <View style={styles.recommendationHeader}>
                    <Text style={styles.recommendationTitle}>{item.study}</Text>
                    <View
                      style={[
                        styles.urgencyBadge,
                        item.urgency === 'Required' ? styles.urgencyRequired : styles.urgencyRecommended,
                      ]}
                    >
                      <Text style={styles.urgencyText}>{item.urgency}</Text>
                    </View>
                  </View>
                  <Text style={styles.recommendationReason}>{item.reason}</Text>
                </View>
              ))}
            </View>
          )}

          {preoperativeRecommendations.rationale && (
            <View style={styles.rationaleBox}>
              <Text style={styles.rationaleText}>{preoperativeRecommendations.rationale}</Text>
            </View>
          )}
        </SectionCard>
      )}

      {/* Safety Checklist */}
      {checklist.length > 0 && (
        <SectionCard title="Safety Checklist" headerColor={Colors.primary}>
          <ChecklistSection items={checklist} />
        </SectionCard>
      )}

      {/* Rationales */}
      {rationales.length > 0 && (
        <SectionCard title="Clinical Rationales">
          {rationales.map((rationale, index) => (
            <View key={index} style={styles.rationaleItem}>
              <Text style={styles.rationaleItemTitle}>{rationale.title}</Text>
              <Text style={styles.rationaleItemDetail}>{rationale.detail}</Text>
              {rationale.linkedSection && (
                <Text style={styles.linkedSection}>→ {rationale.linkedSection}</Text>
              )}
            </View>
          ))}
        </SectionCard>
      )}

      {/* References & Clinical Guidelines */}
      <SectionCard title="References & Clinical Guidelines">
        <Text style={styles.citationsIntro}>
          This care plan is informed by the following published clinical guidelines and standards. Tap any reference to view the source.
        </Text>
        {citations && citations.length > 0 ? (
          citations.map((citation, index) => (
            <TouchableOpacity
              key={index}
              style={styles.citationItem}
              onPress={() => handleOpenCitation(citation.url)}
              activeOpacity={0.7}
            >
              <View style={styles.citationContent}>
                <Text style={styles.citationTitle}>{citation.title}</Text>
                <Text style={styles.citationMeta}>{citation.organization} · {citation.year}</Text>
              </View>
              <ExternalLink color={Colors.primary} size={16} />
            </TouchableOpacity>
          ))
        ) : (
          <View>
            <TouchableOpacity style={styles.citationItem} onPress={() => handleOpenCitation('https://www.asahq.org/standards-and-practice-parameters/standards-for-basic-anesthetic-monitoring')} activeOpacity={0.7}>
              <View style={styles.citationContent}>
                <Text style={styles.citationTitle}>Standards for Basic Anesthetic Monitoring</Text>
                <Text style={styles.citationMeta}>American Society of Anesthesiologists · 2020</Text>
              </View>
              <ExternalLink color={Colors.primary} size={16} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.citationItem} onPress={() => handleOpenCitation('https://www.asahq.org/standards-and-practice-parameters/practice-guidelines-for-management-of-the-difficult-airway')} activeOpacity={0.7}>
              <View style={styles.citationContent}>
                <Text style={styles.citationTitle}>Practice Guidelines for Management of the Difficult Airway</Text>
                <Text style={styles.citationMeta}>American Society of Anesthesiologists · 2022</Text>
              </View>
              <ExternalLink color={Colors.primary} size={16} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.citationItem} onPress={() => handleOpenCitation('https://journals.lww.com/anesthesia-analgesia/fulltext/2020/02000/fourth_consensus_guidelines_for_the_management_of.29.aspx')} activeOpacity={0.7}>
              <View style={styles.citationContent}>
                <Text style={styles.citationTitle}>Fourth Consensus Guidelines for the Management of Postoperative Nausea and Vomiting</Text>
                <Text style={styles.citationMeta}>Society for Ambulatory Anesthesia (SAMBA) · 2020</Text>
              </View>
              <ExternalLink color={Colors.primary} size={16} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.citationItem} onPress={() => handleOpenCitation('https://www.aana.com/practice/clinical-practice-resources/scope-and-standards-for-nurse-anesthesia-practice')} activeOpacity={0.7}>
              <View style={styles.citationContent}>
                <Text style={styles.citationTitle}>Scope and Standards for Nurse Anesthesia Practice</Text>
                <Text style={styles.citationMeta}>American Association of Nurse Anesthesiology (AANA) · 2023</Text>
              </View>
              <ExternalLink color={Colors.primary} size={16} />
            </TouchableOpacity>
          </View>
        )}
      </SectionCard>

      </ScrollView>

      {/* Edit Case Button (for saved plans) */}
      {caseDescription && carePlanId && (
        <View style={styles.editButtonContainer}>
          <TouchableOpacity style={styles.editButton} onPress={handleEditCase}>
            <FileText color={Colors.background} size={20} />
            <Text style={styles.editButtonText}>Edit Case</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Tab Navigation */}
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tab} onPress={() => router.push('/(tabs)')}>
            <FileText color={Colors.text.tertiary} size={24} />
            <Text style={styles.tabLabel}>Plan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tab} onPress={() => router.push('/(tabs)/study')}>
            <GraduationCap color={Colors.text.tertiary} size={24} />
            <Text style={styles.tabLabel}>Study</Text>
          </TouchableOpacity>

          <View style={styles.centerButtonContainer}>
            <TouchableOpacity style={styles.centerButton} onPress={() => router.push('/(tabs)/home')}>
              <View style={styles.centerButtonCircle}>
                <Image
                  source={require('@/assets/images/brainie.png')}
                  style={styles.brainieImage}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>
            <Text style={styles.tabLabel}>Home</Text>
          </View>

          <TouchableOpacity style={styles.tab} onPress={() => router.push('/(tabs)/tools')}>
            <Stethoscope color={Colors.text.tertiary} size={24} />
            <Text style={styles.tabLabel}>Tools</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tab} onPress={() => router.push('/(tabs)/profile')}>
            <User color={Colors.text.tertiary} size={24} />
            <Text style={styles.tabLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  headerContainer: {
    position: 'absolute',
    top: 60,
    left: Spacing.lg,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background + 'CC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  infoGrid: {
    gap: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: Spacing.md,
  },
  subsection: {
    marginTop: Spacing.sm,
  },
  subsectionTitle: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  bulletText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
    lineHeight: 20,
  },
  allergyText: {
    color: Colors.error,
    fontWeight: '600',
  },
  concernBox: {
    backgroundColor: Colors.warning + '20',
    padding: Spacing.sm,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
    marginTop: Spacing.sm,
  },
  concernText: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  implicationBox: {
    backgroundColor: Colors.secondary + '15',
    padding: Spacing.sm,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
    marginTop: Spacing.sm,
  },
  implicationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 4,
  },
  implicationText: {
    fontSize: 13,
    color: Colors.text.primary,
    lineHeight: 18,
    marginBottom: 2,
  },
  medicationBox: {
    backgroundColor: Colors.primary + '15',
    padding: Spacing.sm,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginTop: Spacing.sm,
  },
  medicationText: {
    fontSize: 13,
    color: Colors.text.primary,
    lineHeight: 18,
    marginBottom: 2,
    fontWeight: '500',
  },
  riskTagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.sm,
  },
  techniqueContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  techniquePill: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
  },
  techniquePillText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  planSummary: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  stepsList: {
    marginTop: Spacing.xs,
    gap: 4,
  },
  stepText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  strategyBox: {
    backgroundColor: Colors.backgroundTertiary,
    padding: Spacing.sm + 2,
    borderRadius: 8,
    marginTop: Spacing.sm,
  },
  strategyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  strategyText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  monitorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  rationaleBox: {
    backgroundColor: Colors.secondary + '10',
    padding: Spacing.sm,
    borderRadius: 8,
    marginTop: Spacing.sm,
  },
  rationaleText: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  rationaleItem: {
    backgroundColor: Colors.backgroundTertiary,
    padding: Spacing.sm + 2,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  rationaleItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  rationaleItemDetail: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  linkedSection: {
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 4,
    fontWeight: '600',
  },
  recommendationItem: {
    backgroundColor: Colors.backgroundTertiary,
    padding: Spacing.sm,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recommendationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  urgencyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyRequired: {
    backgroundColor: Colors.error + '20',
  },
  urgencyRecommended: {
    backgroundColor: Colors.warning + '20',
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  recommendationReason: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  navigationContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  navButtonPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  navButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.warning + '18',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  disclaimerBannerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  citationsIntro: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 19,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  citationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: 8,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  citationContent: {
    flex: 1,
  },
  citationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    lineHeight: 18,
    marginBottom: 2,
  },
  citationMeta: {
    fontSize: 11,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  footer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.warning + '10',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  editButtonContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },
  tabBarContainer: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  centerButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  centerButton: {
    marginBottom: 4,
  },
  centerButtonCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  brainieImage: {
    width: 50,
    height: 50,
  },
});
