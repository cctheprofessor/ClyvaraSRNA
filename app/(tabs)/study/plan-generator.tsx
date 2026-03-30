import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { generateStudyPlan } from '@/lib/openai';
import { ArrowLeft, Calendar, Clock, Target, Sparkles, Info } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import AIConsentModal from '@/components/AIConsentModal';

export default function StudyPlanGenerator() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingGenerate, setPendingGenerate] = useState(false);
  const [formData, setFormData] = useState({
    examDate: '',
    studyHoursPerWeek: '10',
    currentLevel: 'Intermediate',
    focusAreas: '',
    weakAreas: '',
    goals: '',
  });

  const knowledgeLevels = ['Beginner', 'Intermediate', 'Advanced'];

  useEffect(() => {
    checkConsent();
  }, []);

  const checkConsent = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('ai_study_plan_consent_given')
      .eq('id', user.id)
      .maybeSingle();
    setConsentGiven(data?.ai_study_plan_consent_given ?? false);
  };

  const recordConsent = async () => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({
        ai_study_plan_consent_given: true,
        ai_study_plan_consent_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    setConsentGiven(true);
  };

  const handleGenerate = async () => {
    if (!formData.examDate || !formData.studyHoursPerWeek) {
      Alert.alert('Missing Information', 'Please fill in exam date and study hours');
      return;
    }

    const examDate = new Date(formData.examDate);
    if (isNaN(examDate.getTime()) || examDate <= new Date()) {
      Alert.alert('Invalid Date', 'Please enter a valid future date (YYYY-MM-DD)');
      return;
    }

    if (!consentGiven) {
      setPendingGenerate(true);
      setShowConsentModal(true);
      return;
    }

    await runGenerate();
  };

  const handleConsentAccept = async () => {
    setShowConsentModal(false);
    await recordConsent();
    if (pendingGenerate) {
      setPendingGenerate(false);
      await runGenerate();
    }
  };

  const handleConsentDecline = () => {
    setShowConsentModal(false);
    setPendingGenerate(false);
  };

  const runGenerate = async () => {
    setLoading(true);

    try {
      const focusAreasArray = formData.focusAreas
        .split(',')
        .map((area) => area.trim())
        .filter((area) => area);

      const result = await generateStudyPlan({
        examDate: formData.examDate,
        currentLevel: formData.currentLevel,
        studyHoursPerWeek: parseInt(formData.studyHoursPerWeek),
        focusAreas: focusAreasArray.length > 0 ? focusAreasArray : ['All NBCRNA Topics'],
        weakAreas: formData.weakAreas,
        goals: formData.goals,
      });

      const { data, error } = await supabase
        .from('study_plans')
        .insert({
          user_id: user!.id,
          title: result.title,
          description: result.description,
          exam_date: formData.examDate,
          study_hours_per_week: parseInt(formData.studyHoursPerWeek),
          current_knowledge_level: formData.currentLevel,
          focus_areas: focusAreasArray,
          weekly_schedule: result.weeklySchedule,
          milestones: result.milestones,
          generated_content: result.fullPlan,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert('Success', 'Your personalized study plan has been created!', [
        {
          text: 'View Plan',
          onPress: () => router.push(`/study/plan/${data.id}` as any),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate study plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AIConsentModal
        visible={showConsentModal}
        variant="study-plan"
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />

      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={Colors.primary} size={24} />
        </Pressable>
        <Image
          source={require('@/assets/images/Clyvara.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Study Plan Generator</Text>
        <Text style={styles.subtitle}>Create your personalized NBCRNA prep plan</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>

        <View style={styles.aiNotice}>
          <Info color={Colors.secondary} size={16} />
          <Text style={styles.aiNoticeText}>
            This feature sends your study preferences to{' '}
            <Text style={styles.aiNoticeBold}>OpenAI, Inc.</Text>
            {' '}to generate a personalized plan. You will be asked to consent before any data is sent.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Calendar color={Colors.secondary} size={20} />
              <Text style={styles.label}>
                Exam Date <Text style={styles.required}>*</Text>
              </Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (e.g., 2025-06-15)"
              value={formData.examDate}
              onChangeText={(text) => setFormData({ ...formData, examDate: text })}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Clock color={Colors.secondary} size={20} />
              <Text style={styles.label}>
                Study Hours Per Week <Text style={styles.required}>*</Text>
              </Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="e.g., 10"
              value={formData.studyHoursPerWeek}
              onChangeText={(text) => setFormData({ ...formData, studyHoursPerWeek: text })}
              keyboardType="numeric"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Target color={Colors.secondary} size={20} />
              <Text style={styles.label}>Current Knowledge Level</Text>
            </View>
            <View style={styles.levelButtons}>
              {knowledgeLevels.map((level) => (
                <Pressable
                  key={level}
                  style={[
                    styles.levelButton,
                    formData.currentLevel === level && styles.levelButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, currentLevel: level })}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.levelButtonText,
                      formData.currentLevel === level && styles.levelButtonTextActive,
                    ]}
                  >
                    {level}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Focus Areas</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., Pharmacology, Anatomy, Regional Anesthesia (comma separated)"
              value={formData.focusAreas}
              onChangeText={(text) => setFormData({ ...formData, focusAreas: text })}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Weak Areas (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Topics you need to strengthen..."
              value={formData.weakAreas}
              onChangeText={(text) => setFormData({ ...formData, weakAreas: text })}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Goals (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What do you want to achieve with this study plan?"
              value={formData.goals}
              onChangeText={(text) => setFormData({ ...formData, goals: text })}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.infoCard}>
          <Sparkles color={Colors.warning} size={20} />
          <Text style={styles.infoText}>
            AI will create a personalized study schedule based on your exam date, available time,
            and focus areas. The plan includes weekly breakdowns, milestones, and progress
            tracking.
          </Text>
        </View>

        <Pressable
          style={[styles.generateButton, loading && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <>
              <ActivityIndicator color="#ffffff" />
              <Text style={styles.generateButtonText}>Generating Your Plan...</Text>
            </>
          ) : (
            <>
              <Sparkles color="#ffffff" size={20} />
              <Text style={styles.generateButtonText}>Generate Study Plan</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  header: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logo: {
    width: 100,
    height: 35,
    marginBottom: Spacing.sm,
    alignSelf: 'center',
  },
  title: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  aiNotice: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.secondaryLight + '40',
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
    padding: Spacing.sm,
    alignItems: 'flex-start',
  },
  aiNoticeText: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 20,
    flex: 1,
  },
  aiNoticeBold: {
    fontWeight: '700',
    color: Colors.text.primary,
  },
  form: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  required: {
    color: Colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border.dark,
    borderRadius: BorderRadius.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    backgroundColor: Colors.background,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  levelButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  levelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border.dark,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  levelButtonActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  levelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  levelButtonTextActive: {
    color: Colors.text.light,
  },
  infoCard: {
    backgroundColor: Colors.secondaryLight + '50',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  generateButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.light,
  },
});
