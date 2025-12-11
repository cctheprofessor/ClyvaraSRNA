import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Home, FileText, GraduationCap, Stethoscope, User } from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';

export default function EditCarePlanScreen() {
  const router = useRouter();
  const { id, caseDescription: initialCase } = useLocalSearchParams<{ id: string; caseDescription: string }>();
  const { session } = useAuth();
  const [caseDescription, setCaseDescription] = useState(initialCase || '');
  const [loading, setLoading] = useState(false);

  const handleRegenerate = async () => {
    if (!caseDescription.trim()) {
      Alert.alert('Error', 'Please enter a case description');
      return;
    }

    if (!session) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-comprehensive-care-plan`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          caseDescription: caseDescription.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to generate care plan');
      }

      const carePlan = await response.json();

      const { error } = await supabase
        .from('comprehensive_care_plans')
        .update({
          case_description: caseDescription.trim(),
          care_plan_data: carePlan,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      router.replace(`/care-plan/comprehensive/${id}` as any);
    } catch (error: any) {
      console.error('Error regenerating care plan:', error);
      Alert.alert('Error', error.message || 'Failed to regenerate care plan');
    } finally {
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    router.replace('/(tabs)/home');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.headerContainer}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={Colors.primary} size={24} />
        </Pressable>
      </View>

      <PageHeader
        title="Anesthesia Care Plan"
        subtitle="Modify the Case and Regenerate Care Plan"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Case Description</Text>
          <Text style={styles.hint}>
            Update patient demographics, procedure, medical history, physical exam findings, labs, etc.
          </Text>

          <TextInput
            style={styles.textArea}
            value={caseDescription}
            onChangeText={setCaseDescription}
            placeholder="Example: 65 yo male, 85kg, scheduled for elective CABG x3. PMH: HTN, DM2, CAD. Meds: Metformin, Lisinopril, ASA. EF 45% on recent echo..."
            multiline
            numberOfLines={12}
            textAlignVertical="top"
            placeholderTextColor={Colors.text.tertiary}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegenerate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Regenerate Care Plan</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

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
            <TouchableOpacity style={styles.centerButton} onPress={handleGoHome}>
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
  content: {
    padding: Spacing.md,
  },
  inputSection: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  hint: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  textArea: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 280,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md + 2,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...Typography.bodyBold,
    color: Colors.text.light,
    fontSize: 17,
  },
  disclaimer: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.warning + '10',
    borderRadius: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  navigationContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  navButtonPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  navButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
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
