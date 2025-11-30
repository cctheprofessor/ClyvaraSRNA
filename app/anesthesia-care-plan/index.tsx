import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Sparkles, FileText, GraduationCap, Stethoscope, User, Home } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';

export default function AnesthesiaCarePlanGenerator() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patientAge: '',
    patientSex: 'Male',
    patientWeight: '',
    patientHeight: '',
    procedureType: '',
    surgicalService: '',
    urgency: 'Elective',
    position: '',
    asaClassification: 'I',
    pmh: '',
    psh: '',
    medications: '',
    allergies: '',
    familyHx: '',
    socialHx: '',
    airwayNotes: '',
    cardiacNotes: '',
    pulmonaryNotes: '',
    labs: '',
    imaging: '',
  });

  const asaOptions = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const sexOptions = ['Male', 'Female', 'Other'];
  const urgencyOptions = ['Elective', 'Urgent', 'Emergent'];

  const handleGenerate = async () => {
    if (
      !formData.patientAge ||
      !formData.patientWeight ||
      !formData.procedureType
    ) {
      Alert.alert('Missing Information', 'Please fill in all required fields (age, weight, procedure)');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please log in to generate care plans');
      }

      const caseDescription = `
PATIENT DEMOGRAPHICS:
- Age: ${formData.patientAge} years
- Sex: ${formData.patientSex}
- Weight: ${formData.patientWeight} kg
${formData.patientHeight ? `- Height: ${formData.patientHeight} cm` : ''}

PROCEDURE INFORMATION:
- Primary Procedure: ${formData.procedureType}
${formData.surgicalService ? `- Surgical Service: ${formData.surgicalService}` : ''}
- Urgency: ${formData.urgency}
${formData.position ? `- Position: ${formData.position}` : ''}

ASA CLASSIFICATION: ${formData.asaClassification}

HISTORY:
${formData.pmh ? `Past Medical History: ${formData.pmh}` : ''}
${formData.psh ? `Past Surgical History: ${formData.psh}` : ''}
${formData.medications ? `Current Medications: ${formData.medications}` : ''}
${formData.allergies ? `Allergies: ${formData.allergies}` : 'No known allergies'}
${formData.familyHx ? `Family History: ${formData.familyHx}` : ''}
${formData.socialHx ? `Social History: ${formData.socialHx}` : ''}

PHYSICAL EXAM:
${formData.airwayNotes ? `Airway: ${formData.airwayNotes}` : ''}
${formData.cardiacNotes ? `Cardiac: ${formData.cardiacNotes}` : ''}
${formData.pulmonaryNotes ? `Pulmonary: ${formData.pulmonaryNotes}` : ''}

LABS & IMAGING:
${formData.labs ? `Labs: ${formData.labs}` : ''}
${formData.imaging ? `Imaging: ${formData.imaging}` : ''}
      `.trim();

      const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-comprehensive-care-plan`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          caseDescription,
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
          user_id: user!.id,
          case_description: caseDescription,
          care_plan_data: carePlan,
        })
        .select()
        .single();

      if (error) throw error;

      router.push(`/care-plan/comprehensive/${data.id}` as any);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate care plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.headerContainer}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={Colors.primary} size={24} />
        </Pressable>
      </View>

      <PageHeader
        title="Anesthesia Care Plan"
        subtitle="Efficient x Comprehensive"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Patient Demographics */}
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Patient Demographics</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>
                Age (years) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="45"
                value={formData.patientAge}
                onChangeText={(text) => setFormData({ ...formData, patientAge: text })}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>
                Sex <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.buttonRow}>
                {sexOptions.map((sex) => (
                  <Pressable
                    key={sex}
                    style={[
                      styles.optionButton,
                      formData.patientSex === sex && styles.optionButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, patientSex: sex })}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        formData.patientSex === sex && styles.optionButtonTextActive,
                      ]}
                    >
                      {sex}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>
                Weight (kg) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="70"
                value={formData.patientWeight}
                onChangeText={(text) => setFormData({ ...formData, patientWeight: text })}
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="170"
                value={formData.patientHeight}
                onChangeText={(text) => setFormData({ ...formData, patientHeight: text })}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              ASA Classification <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.asaButtons}>
              {asaOptions.map((asa) => (
                <Pressable
                  key={asa}
                  style={[
                    styles.asaButton,
                    formData.asaClassification === asa && styles.asaButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, asaClassification: asa })}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.asaButtonText,
                      formData.asaClassification === asa && styles.asaButtonTextActive,
                    ]}
                  >
                    {asa}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Procedure Information */}
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Procedure Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Primary Procedure <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Laparoscopic cholecystectomy"
              value={formData.procedureType}
              onChangeText={(text) => setFormData({ ...formData, procedureType: text })}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Surgical Service</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., General Surgery, Orthopedics"
              value={formData.surgicalService}
              onChangeText={(text) => setFormData({ ...formData, surgicalService: text })}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Urgency</Text>
            <View style={styles.buttonRow}>
              {urgencyOptions.map((urgency) => (
                <Pressable
                  key={urgency}
                  style={[
                    styles.optionButton,
                    formData.urgency === urgency && styles.optionButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, urgency })}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.urgency === urgency && styles.optionButtonTextActive,
                    ]}
                  >
                    {urgency}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Patient Position</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Supine, Prone, Lateral"
              value={formData.position}
              onChangeText={(text) => setFormData({ ...formData, position: text })}
              editable={!loading}
            />
          </View>
        </View>

        {/* Medical History */}
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Medical History</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Past Medical History (PMH)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., HTN, DM2, CAD, COPD..."
              value={formData.pmh}
              onChangeText={(text) => setFormData({ ...formData, pmh: text })}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Past Surgical History (PSH)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Previous surgeries and dates..."
              value={formData.psh}
              onChangeText={(text) => setFormData({ ...formData, psh: text })}
              multiline
              numberOfLines={2}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Medications</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="List medications and dosages..."
              value={formData.medications}
              onChangeText={(text) => setFormData({ ...formData, medications: text })}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Allergies</Text>
            <TextInput
              style={styles.input}
              placeholder="Drug allergies, reactions..."
              value={formData.allergies}
              onChangeText={(text) => setFormData({ ...formData, allergies: text })}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Family Anesthetic History</Text>
            <TextInput
              style={styles.input}
              placeholder="MH, difficult intubation, etc."
              value={formData.familyHx}
              onChangeText={(text) => setFormData({ ...formData, familyHx: text })}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Social History</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Smoking, alcohol, drug use..."
              value={formData.socialHx}
              onChangeText={(text) => setFormData({ ...formData, socialHx: text })}
              multiline
              numberOfLines={2}
              editable={!loading}
            />
          </View>
        </View>

        {/* Physical Exam */}
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Physical Examination</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Airway Assessment</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Mallampati, dentition, neck mobility, TM distance..."
              value={formData.airwayNotes}
              onChangeText={(text) => setFormData({ ...formData, airwayNotes: text })}
              multiline
              numberOfLines={2}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cardiac Exam</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Heart sounds, murmurs, edema..."
              value={formData.cardiacNotes}
              onChangeText={(text) => setFormData({ ...formData, cardiacNotes: text })}
              multiline
              numberOfLines={2}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pulmonary Exam</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Breath sounds, wheezes, rales..."
              value={formData.pulmonaryNotes}
              onChangeText={(text) => setFormData({ ...formData, pulmonaryNotes: text })}
              multiline
              numberOfLines={2}
              editable={!loading}
            />
          </View>
        </View>

        {/* Labs & Imaging */}
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Labs & Imaging</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lab Results</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="CBC, BMP, coags, etc..."
              value={formData.labs}
              onChangeText={(text) => setFormData({ ...formData, labs: text })}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Imaging Results</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="EKG, CXR, Echo findings..."
              value={formData.imaging}
              onChangeText={(text) => setFormData({ ...formData, imaging: text })}
              multiline
              numberOfLines={2}
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.infoCard}>
          <Sparkles color={Colors.warning} size={20} />
          <Text style={styles.infoText}>
            This AI tool generates evidence-based anesthesia care plans for educational purposes.
            Always verify with current clinical guidelines.
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
              <Text style={styles.generateButtonText}>Generating...</Text>
            </>
          ) : (
            <>
              <Sparkles color="#ffffff" size={20} />
              <Text style={styles.generateButtonText}>Generate Care Plan</Text>
            </>
          )}
        </Pressable>
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
    </KeyboardAvoidingView>
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
    padding: 16,
    gap: 16,
  },
  form: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary + '30',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
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
    color: Colors.text.primary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border.dark,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  optionButtonActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  optionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  optionButtonTextActive: {
    color: Colors.text.light,
  },
  asaButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  asaButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border.dark,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  asaButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  asaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  asaButtonTextActive: {
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
    backgroundColor: Colors.primary,
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
