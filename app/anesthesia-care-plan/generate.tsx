import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { generateCarePlanWithOpenAI, CarePlanValidationError } from '@/lib/anesthesia-ai-engine';
import { ArrowLeft, Hop as Home, FileText, GraduationCap, Stethoscope, User } from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';

export default function GenerateCarePlanScreen() {
  const [caseDescription, setCaseDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  const handleGenerate = async () => {
    if (!caseDescription.trim()) {
      Alert.alert('Error', 'Please enter a case description');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

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

      const { data, error } = await supabase
        .from('comprehensive_care_plans')
        .insert({
          user_id: session.user.id,
          case_description: caseDescription.trim(),
          care_plan_data: carePlan,
        })
        .select()
        .single();

      if (error) throw error;

      router.push(`/care-plan/comprehensive/${data.id}` as any);
    } catch (error: any) {
      if (__DEV__) { console.error('Error generating care plan:', error); }
      if (error instanceof CarePlanValidationError) {
        Alert.alert('Validation Error', error.message);
      } else {
        Alert.alert('Error', error.message || 'Failed to generate care plan');
      }
    } finally {
      setLoading(false);
    }
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
        title="Care Plan Generator"
        subtitle="AI-powered comprehensive anesthesia care plans"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Case Description</Text>
          <Text style={styles.hint}>
            Include: patient demographics, procedure, medical history, physical exam findings, labs, etc.
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
          onPress={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Generate Care Plan</Text>
          )}
        </TouchableOpacity>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This tool uses AI to generate educational care plans. Always follow institutional
            protocols and consult with experienced practitioners. Not for actual clinical use.
          </Text>
        </View>

        <View style={styles.navigationContainer}>
          <TouchableOpacity style={styles.navButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={Colors.primary} />
            <Text style={styles.navButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navButton, styles.navButtonPrimary]} onPress={handleGoHome}>
            <Home size={20} color="#fff" />
            <Text style={styles.navButtonTextPrimary}>Home</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This care plan is generated for educational purposes. Always follow institutional protocols
            and consult with experienced practitioners.
          </Text>
        </View>
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
    fontStyle: 'italic',
  },
  textArea: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 280,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...Typography.bodyBold,
    color: '#fff',
    fontSize: 16,
  },
  disclaimer: {
    backgroundColor: Colors.warning + '20',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 18,
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
  footer: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  footerText: {
    fontSize: 11,
    color: Colors.text.tertiary,
    lineHeight: 16,
    textAlign: 'center',
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
