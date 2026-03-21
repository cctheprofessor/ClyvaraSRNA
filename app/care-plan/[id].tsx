import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';

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

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Generated on {new Date(carePlan.created_at).toLocaleDateString()}
        </Text>
        <Text style={styles.disclaimer}>
          This is an educational tool. Always follow institutional protocols and consult with experienced practitioners.
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
  footer: {
    padding: 20,
    marginTop: 12,
    backgroundColor: '#f5f5f5',
  },
  footerText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
});
