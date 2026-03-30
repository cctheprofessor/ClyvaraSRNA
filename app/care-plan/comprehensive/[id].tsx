import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { AnesthesiaCarePlan } from '@/types/anesthesia-care-plan';
import { CarePlanScreen } from '@/components/care-plan/CarePlanScreen';
import { Colors } from '@/constants/theme';

export default function ComprehensiveCarePlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [carePlan, setCarePlan] = useState<AnesthesiaCarePlan | null>(null);
  const [caseDescription, setCaseDescription] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCarePlan();
  }, [id]);

  const loadCarePlan = async () => {
    try {
      const { data, error } = await supabase
        .from('comprehensive_care_plans')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setCarePlan(data.care_plan_data as AnesthesiaCarePlan);
      setCaseDescription(data.case_description || '');
    } catch (error: any) {
      if (__DEV__) { console.error('Error loading care plan:', error); }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Care Plan' }} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!carePlan) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Care Plan Not Found' }} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <CarePlanScreen carePlan={carePlan} caseDescription={caseDescription} carePlanId={id} />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
