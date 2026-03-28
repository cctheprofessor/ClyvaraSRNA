import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { ExternalLink, TriangleAlert as AlertTriangle } from 'lucide-react-native';

const GENERAL_CITATIONS = [
  { title: 'Standards for Basic Anesthetic Monitoring', organization: 'American Society of Anesthesiologists', year: '2020', url: 'https://www.asahq.org/standards-and-practice-parameters/standards-for-basic-anesthetic-monitoring' },
  { title: 'Practice Guidelines for Management of the Difficult Airway', organization: 'American Society of Anesthesiologists', year: '2022', url: 'https://pubmed.ncbi.nlm.nih.gov/34762729/' },
  { title: 'Fourth Consensus Guidelines for the Management of Postoperative Nausea and Vomiting', organization: 'Society for Ambulatory Anesthesia (SAMBA)', year: '2020', url: 'https://journals.lww.com/anesthesia-analgesia/abstract/2020/08000/fourth_consensus_guidelines_for_the_management_of.16.aspx' },
  { title: 'Scope and Standards for Nurse Anesthesia Practice', organization: 'American Association of Nurse Anesthesiology (AANA)', year: '2023', url: 'https://www.aana.com/practice-manual/aana-practice-manual-standards-for-nurse-anesthesia-practice/' },
  { title: '2024 ACC/AHA Guideline for Perioperative Cardiovascular Management', organization: 'American College of Cardiology / American Heart Association', year: '2024', url: 'https://www.ahajournals.org/doi/10.1161/CIR.0000000000001285' },
];

interface CarePlan {
  id: string;
  patient_age: number;
  patient_weight: number;
  procedure_type: string;
  asa_classification: string;
  medical_history: string;
  allergies: string;
  generated_plan: string;
  preoperative_assessment: string;
  anesthetic_plan: string;
  monitoring_requirements: string;
  potential_complications: string;
  created_at: string;
}

export default function CarePlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [loading, setLoading] = useState(true);

  const handleOpenCitation = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  useEffect(() => {
    loadCarePlan();
  }, [id]);

  const loadCarePlan = async () => {
    try {
      const { data, error } = await supabase
        .from('care_plans')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCarePlan(data);
    } catch (error: any) {
      if (__DEV__) { console.error('Error loading care plan:', error); }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Care Plan' }} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!carePlan) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Care Plan' }} />
        <Text style={styles.errorText}>Care plan not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'Anesthesia Care Plan' }} />

      <View style={styles.header}>
        <Text style={styles.title}>Anesthesia Care Plan</Text>
        <Text style={styles.subtitle}>
          {carePlan.procedure_type}
        </Text>
      </View>

      <View style={styles.patientInfo}>
        <Text style={styles.sectionTitle}>Patient Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Age:</Text>
          <Text style={styles.value}>{carePlan.patient_age} years</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Weight:</Text>
          <Text style={styles.value}>{carePlan.patient_weight} kg</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>ASA Classification:</Text>
          <Text style={styles.value}>{carePlan.asa_classification}</Text>
        </View>
        {carePlan.medical_history && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Medical History:</Text>
            <Text style={styles.value}>{carePlan.medical_history}</Text>
          </View>
        )}
        {carePlan.allergies && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Allergies:</Text>
            <Text style={styles.value}>{carePlan.allergies}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Preoperative Assessment</Text>
        <Text style={styles.sectionContent}>{carePlan.preoperative_assessment}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Anesthetic Plan</Text>
        <Text style={styles.sectionContent}>{carePlan.anesthetic_plan}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Monitoring Requirements</Text>
        <Text style={styles.sectionContent}>{carePlan.monitoring_requirements}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Potential Complications</Text>
        <Text style={styles.sectionContent}>{carePlan.potential_complications}</Text>
      </View>

      {/* References */}
      <View style={styles.referencesSection}>
        <View style={styles.disclaimerBanner}>
          <AlertTriangle color="#B45309" size={16} />
          <Text style={styles.disclaimerText}>
            This plan is AI-generated for educational and planning purposes only. It is not a substitute for clinical judgment. All recommendations are informed by the published clinical guidelines listed below.
          </Text>
        </View>
        <Text style={styles.referencesTitle}>References & Clinical Guidelines</Text>
        <Text style={styles.referencesIntro}>
          Tap any reference to view the source guideline.
        </Text>
        {GENERAL_CITATIONS.map((citation, index) => (
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
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Generated on {new Date(carePlan.created_at).toLocaleDateString()}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  patientInfo: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    width: 140,
  },
  value: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  section: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 12,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.text.primary,
  },
  referencesSection: {
    padding: 20,
    marginTop: 12,
    backgroundColor: '#fff',
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    padding: 12,
    marginBottom: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
  referencesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  referencesIntro: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  citationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 8,
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
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    marginTop: 12,
    backgroundColor: '#f5f5f5',
  },
  footerText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
});
