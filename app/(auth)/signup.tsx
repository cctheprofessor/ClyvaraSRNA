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
import { ArrowLeft, ChevronDown, Stethoscope } from 'lucide-react-native';
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
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [showProgramTrackPicker, setShowProgramTrackPicker] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);

  const handleSignup = async () => {
    if (!fullName || !email || !password || !confirmPassword || !institution || !enrollmentDate || !role || !specialtyInterest) {
      setError('Please fill in all required fields');
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
      enrollmentDate,
      expectedGraduation || null,
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
            <TextInput
              style={styles.inputStandalone}
              placeholder="Your university name (e.g., Duke University)"
              placeholderTextColor={Colors.text.tertiary}
              value={institution}
              onChangeText={setInstitution}
              editable={!loading}
            />
            <Pressable
              style={{marginTop: 4}}
              onPress={() => setShowSchoolPicker(true)}
            >
              <Text style={{fontSize: 12, color: Colors.primary}}>Or select from CRNA schools list</Text>
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Program Start Date *</Text>
            <TextInput
              style={styles.inputStandalone}
              placeholder="YYYY-MM (e.g., 2024-08)"
              placeholderTextColor={Colors.text.tertiary}
              value={enrollmentDate}
              onChangeText={setEnrollmentDate}
              editable={!loading}
            />
            <Text style={{fontSize: 12, color: Colors.text.tertiary, marginTop: 4}}>When did you start your program?</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Expected Graduation (Optional)</Text>
            <TextInput
              style={styles.inputStandalone}
              placeholder="YYYY-MM (Auto-calculated if blank)"
              placeholderTextColor={Colors.text.tertiary}
              value={expectedGraduation}
              onChangeText={setExpectedGraduation}
              editable={!loading}
            />
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

          <Text style={styles.disclaimer}>
            By creating an account, you agree that this tool is for educational purposes only.
          </Text>
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
});
