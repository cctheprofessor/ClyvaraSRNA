import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, ChevronDown, Stethoscope, Square, SquareCheck as CheckSquare } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { CRNA_SCHOOLS, ROLES, PROGRAM_TRACKS } from '@/constants/crna-schools';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [institution, setInstitution] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState('');
  const [expectedGraduation, setExpectedGraduation] = useState('');
  const [programTrack, setProgramTrack] = useState('Full-time');
  const [role, setRole] = useState('');
  const [specialtyInterest, setSpecialtyInterest] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [showProgramTrackPicker, setShowProgramTrackPicker] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showGraduationDatePicker, setShowGraduationDatePicker] = useState(false);

  const generateDateOptions = () => {
    const dates = [];
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 5;
    const endYear = currentYear + 5;

    for (let year = startYear; year <= endYear; year++) {
      for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString().padStart(2, '0');
        dates.push(`${year}-${monthStr}`);
      }
    }
    return dates.reverse();
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month] = dateStr.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const handleSignup = async () => {
    if (!fullName || !email || !password || !confirmPassword || !institution || !enrollmentDate || !role || !specialtyInterest) {
      setError('Please fill in all required fields');
      return;
    }

    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy to continue');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    const { error } = await signUp(
      email.trim(),
      password,
      fullName.trim(),
      institution.trim(),
      `${enrollmentDate}-01`,
      expectedGraduation ? `${expectedGraduation}-01` : null,
      programTrack,
      role,
      specialtyInterest.trim(),
      phone.trim() || null
    );

    if (error) {
      setError(error.message || 'Failed to create account');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={Colors.primary} size={24} />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join thousands of nurse anesthesia residents</Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.inputStandalone}
              placeholder="John Doe"
              placeholderTextColor={Colors.text.tertiary}
              value={fullName}
              onChangeText={setFullName}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.inputStandalone}
              placeholder="student@university.edu"
              placeholderTextColor={Colors.text.tertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.inputStandalone}
              placeholder="At least 6 characters"
              placeholderTextColor={Colors.text.tertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.inputStandalone}
              placeholder="Re-enter your password"
              placeholderTextColor={Colors.text.tertiary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Institution *</Text>
            <Pressable
              style={styles.dropdownButton}
              onPress={() => setShowSchoolPicker(true)}
              disabled={loading}
            >
              <Text style={[styles.dropdownText, !institution && styles.placeholderText]}>
                {institution || 'Select your institution'}
              </Text>
              <ChevronDown color={Colors.text.tertiary} size={20} />
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Program Start Date *</Text>
            <Pressable
              style={styles.dropdownButton}
              onPress={() => setShowStartDatePicker(true)}
              disabled={loading}
            >
              <Text style={[styles.dropdownText, !enrollmentDate && styles.placeholderText]}>
                {enrollmentDate ? formatDateDisplay(enrollmentDate) : 'Select program start date'}
              </Text>
              <ChevronDown color={Colors.text.tertiary} size={20} />
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Expected Graduation (Optional)</Text>
            <Pressable
              style={styles.dropdownButton}
              onPress={() => setShowGraduationDatePicker(true)}
              disabled={loading}
            >
              <Text style={[styles.dropdownText, !expectedGraduation && styles.placeholderText]}>
                {expectedGraduation ? formatDateDisplay(expectedGraduation) : 'Select expected graduation'}
              </Text>
              <ChevronDown color={Colors.text.tertiary} size={20} />
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Program Track</Text>
            <Pressable
              style={styles.dropdownButton}
              onPress={() => setShowProgramTrackPicker(true)}
              disabled={loading}
            >
              <Text style={[styles.dropdownText, !programTrack && styles.placeholderText]}>
                {programTrack || 'Select program track'}
              </Text>
              <ChevronDown color={Colors.text.tertiary} size={20} />
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Role</Text>
            <Pressable
              style={styles.dropdownButton}
              onPress={() => setShowRolePicker(true)}
              disabled={loading}
            >
              <Text style={[styles.dropdownText, !role && styles.placeholderText]}>
                {role || 'Select your role'}
              </Text>
              <ChevronDown color={Colors.text.tertiary} size={20} />
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Specialty Interest</Text>
            <View style={styles.inputContainer}>
              <Stethoscope color={Colors.text.tertiary} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Cardiac, Regional, etc."
                placeholderTextColor={Colors.text.tertiary}
                value={specialtyInterest}
                onChangeText={setSpecialtyInterest}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number (Optional)</Text>
            <TextInput
              style={styles.inputStandalone}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor={Colors.text.tertiary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </View>

          <View style={styles.termsRow}>
            <Pressable onPress={() => setAgreedToTerms(!agreedToTerms)} style={styles.termsCheckbox}>
              {agreedToTerms
                ? <CheckSquare color={Colors.primary} size={20} />
                : <Square color={Colors.text.tertiary} size={20} />
              }
            </Pressable>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/(legal)/terms-of-service' as any)}>
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/(legal)/privacy-policy' as any)}>
                Privacy Policy
              </Text>
              . I understand this app is for educational purposes only and that certain AI-powered features (care plan generation and practice questions) send data I enter to{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/(legal)/privacy-policy' as any)}>
                OpenAI, Inc.
              </Text>
              {' '} and 
              <Text style={styles.termsLink} onPress={() => router.push('/(legal)/privacy-policy' as any)}>
                 Clyvara Analytica
              </Text>for processing. I will be asked for explicit permission before any data is sent to OpenAI or Clyvara Analytica.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showSchoolPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select School</Text>
              <Pressable onPress={() => setShowSchoolPicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
            </View>
            <FlatList
              data={CRNA_SCHOOLS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.pickerItem}
                  onPress={() => {
                    setInstitution(item);
                    setShowSchoolPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showProgramTrackPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Program Track</Text>
              <Pressable onPress={() => setShowProgramTrackPicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
            </View>
            {PROGRAM_TRACKS.map((item) => (
              <Pressable
                key={item}
                style={styles.pickerItem}
                onPress={() => {
                  setProgramTrack(item);
                  setShowProgramTrackPicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={showRolePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Role</Text>
              <Pressable onPress={() => setShowRolePicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
            </View>
            {ROLES.map((item) => (
              <Pressable
                key={item}
                style={styles.pickerItem}
                onPress={() => {
                  setRole(item);
                  setShowRolePicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={showStartDatePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Program Start Date</Text>
              <Pressable onPress={() => setShowStartDatePicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
            </View>
            <FlatList
              data={generateDateOptions()}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.pickerItem}
                  onPress={() => {
                    setEnrollmentDate(item);
                    setShowStartDatePicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{formatDateDisplay(item)}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showGraduationDatePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Expected Graduation</Text>
              <Pressable onPress={() => setShowGraduationDatePicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.pickerItem, styles.clearOption]}
              onPress={() => {
                setExpectedGraduation('');
                setShowGraduationDatePicker(false);
              }}
            >
              <Text style={[styles.pickerItemText, styles.clearText]}>Clear Selection</Text>
            </Pressable>
            <FlatList
              data={generateDateOptions()}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.pickerItem}
                  onPress={() => {
                    setExpectedGraduation(item);
                    setShowGraduationDatePicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{formatDateDisplay(item)}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.dark,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.xs,
  },
  inputStandalone: {
    borderWidth: 1,
    borderColor: Colors.border.dark,
    borderRadius: BorderRadius.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.background,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.text.light,
    ...Typography.bodyBold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  footerText: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  footerLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    backgroundColor: Colors.error + '20',
    padding: 12,
    borderRadius: BorderRadius.sm,
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: Colors.border.dark,
    borderRadius: BorderRadius.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  placeholderText: {
    color: Colors.text.tertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '70%',
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalClose: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  pickerItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  pickerItemText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  clearOption: {
    backgroundColor: Colors.background,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border.dark,
  },
  clearText: {
    color: Colors.error,
    fontWeight: '600',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  termsCheckbox: {
    paddingTop: 1,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
