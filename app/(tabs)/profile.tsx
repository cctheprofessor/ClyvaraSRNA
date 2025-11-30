import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { User, Building2, GraduationCap, Stethoscope, LogOut, Save, Briefcase, ChevronDown, Settings } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { CRNA_SCHOOLS, ROLES, PROGRAM_TRACKS } from '@/constants/crna-schools';
import PageHeader from '@/components/PageHeader';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { profile, user, signOut, updateProfile, isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showProgramTrackPicker, setShowProgramTrackPicker] = useState(false);
  const [showStudyTimePicker, setShowStudyTimePicker] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    school: profile?.school || '',
    institution: profile?.institution || '',
    phone: profile?.phone || '',
    program_track: profile?.program_track || 'Full-time',
    current_semester: profile?.current_semester || 1,
    gpa: profile?.gpa?.toString() || '',
    clinical_hours: profile?.clinical_hours || 0,
    preferred_study_time: profile?.preferred_study_time || '',
    daily_goal_minutes: profile?.daily_goal_minutes || 30,
    email_notifications: profile?.email_notifications ?? true,
    weekly_report_enabled: profile?.weekly_report_enabled ?? true,
    role: profile?.role || '',
    specialty_interest: profile?.specialty_interest || '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        school: profile.school || '',
        institution: profile.institution || '',
        phone: profile.phone || '',
        program_track: profile.program_track || 'Full-time',
        current_semester: profile.current_semester || 1,
        gpa: profile.gpa?.toString() || '',
        clinical_hours: profile.clinical_hours || 0,
        preferred_study_time: profile.preferred_study_time || '',
        daily_goal_minutes: profile.daily_goal_minutes || 30,
        email_notifications: profile.email_notifications ?? true,
        weekly_report_enabled: profile.weekly_report_enabled ?? true,
        role: profile.role || '',
        specialty_interest: profile.specialty_interest || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);

    const updates = {
      full_name: formData.full_name,
      first_name: formData.first_name || null,
      last_name: formData.last_name || null,
      school: formData.school || null,
      phone: formData.phone || null,
      program_track: formData.program_track,
      current_semester: formData.current_semester,
      gpa: formData.gpa ? parseFloat(formData.gpa) : null,
      clinical_hours: formData.clinical_hours,
      preferred_study_time: formData.preferred_study_time || null,
      daily_goal_minutes: formData.daily_goal_minutes,
      email_notifications: formData.email_notifications,
      weekly_report_enabled: formData.weekly_report_enabled,
      role: formData.role || null,
      specialty_interest: formData.specialty_interest || null,
    };

    const { error } = await updateProfile(updates);

    setLoading(false);

    if (error) {
      Alert.alert('Error', 'Failed to update profile');
    } else {
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    }
  };

  const handleSignOut = () => {
    if (confirm('Are you sure you want to sign out?')) {
      signOut();
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || '',
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      school: profile?.school || '',
      institution: profile?.institution || '',
      phone: profile?.phone || '',
      program_track: profile?.program_track || 'Full-time',
      current_semester: profile?.current_semester || 1,
      gpa: profile?.gpa?.toString() || '',
      clinical_hours: profile?.clinical_hours || 0,
      preferred_study_time: profile?.preferred_study_time || '',
      daily_goal_minutes: profile?.daily_goal_minutes || 30,
      email_notifications: profile?.email_notifications ?? true,
      weekly_report_enabled: profile?.weekly_report_enabled ?? true,
      role: profile?.role || '',
      specialty_interest: profile?.specialty_interest || '',
    });
    setEditing(false);
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="Profile"
        subtitle="Manage your account"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <User color="#ffffff" size={40} />
          </View>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            {!editing && (
              <Pressable style={styles.editButton} onPress={() => setEditing(true)}>
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <User color="#64748b" size={18} />
                <Text style={styles.label}>Full Name</Text>
              </View>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.full_name}
                onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                editable={editing}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Building2 color="#64748b" size={18} />
                <Text style={styles.label}>School</Text>
              </View>
              {editing ? (
                <Pressable
                  style={styles.dropdownButton}
                  onPress={() => setShowSchoolPicker(true)}
                >
                  <Text style={[styles.dropdownText, !formData.school && styles.placeholderText]}>
                    {formData.school || 'Select your CRNA school'}
                  </Text>
                  <ChevronDown color={Colors.text.tertiary} size={20} />
                </Pressable>
              ) : (
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={formData.school}
                  editable={false}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Briefcase color="#64748b" size={18} />
                <Text style={styles.label}>Role</Text>
              </View>
              {editing ? (
                <Pressable
                  style={styles.dropdownButton}
                  onPress={() => setShowRolePicker(true)}
                >
                  <Text style={[styles.dropdownText, !formData.role && styles.placeholderText]}>
                    {formData.role || 'Select your role'}
                  </Text>
                  <ChevronDown color={Colors.text.tertiary} size={20} />
                </Pressable>
              ) : (
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={formData.role}
                  editable={false}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputLabel}>
                <Stethoscope color="#64748b" size={18} />
                <Text style={styles.label}>Specialty Interest</Text>
              </View>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.specialty_interest}
                onChangeText={(text) => setFormData({ ...formData, specialty_interest: text })}
                placeholder="Cardiac, Regional, etc."
                editable={editing}
              />
            </View>
          </View>

          {editing && (
            <View style={styles.actionButtons}>
              <Pressable style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                <Save color="#ffffff" size={18} />
                <Text style={styles.saveButtonText}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Program Information</Text>
          </View>
          <View style={styles.form}>
            {profile?.institution && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Institution</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={profile.institution}
                  editable={false}
                />
              </View>
            )}
            {profile?.enrollment_date && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Enrollment Date</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={new Date(profile.enrollment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  editable={false}
                />
              </View>
            )}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Program Track</Text>
              {editing ? (
                <Pressable
                  style={styles.dropdownButton}
                  onPress={() => setShowProgramTrackPicker(true)}
                >
                  <Text style={[styles.dropdownText, !formData.program_track && styles.placeholderText]}>
                    {formData.program_track || 'Select program track'}
                  </Text>
                  <ChevronDown color={Colors.text.tertiary} size={20} />
                </Pressable>
              ) : (
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={formData.program_track}
                  editable={false}
                />
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Semester</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.current_semester.toString()}
                onChangeText={(text) => setFormData({ ...formData, current_semester: parseInt(text) || 1 })}
                keyboardType="number-pad"
                editable={editing}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Academic Progress</Text>
          </View>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>GPA (0.0 - 4.0)</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.gpa}
                onChangeText={(text) => setFormData({ ...formData, gpa: text })}
                keyboardType="decimal-pad"
                placeholder="3.5"
                editable={editing}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Clinical Hours Completed</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.clinical_hours.toString()}
                onChangeText={(text) => setFormData({ ...formData, clinical_hours: parseInt(text) || 0 })}
                keyboardType="number-pad"
                editable={editing}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
                placeholder="+1 (555) 123-4567"
                editable={editing}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Study Preferences</Text>
          </View>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Preferred Study Time</Text>
              {editing ? (
                <Pressable
                  style={styles.dropdownButton}
                  onPress={() => setShowStudyTimePicker(true)}
                >
                  <Text style={[styles.dropdownText, !formData.preferred_study_time && styles.placeholderText]}>
                    {formData.preferred_study_time ? formData.preferred_study_time.charAt(0).toUpperCase() + formData.preferred_study_time.slice(1) : 'Select preferred time'}
                  </Text>
                  <ChevronDown color={Colors.text.tertiary} size={20} />
                </Pressable>
              ) : (
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={formData.preferred_study_time ? formData.preferred_study_time.charAt(0).toUpperCase() + formData.preferred_study_time.slice(1) : 'Not set'}
                  editable={false}
                />
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Daily Study Goal (minutes)</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.daily_goal_minutes.toString()}
                onChangeText={(text) => setFormData({ ...formData, daily_goal_minutes: parseInt(text) || 30 })}
                keyboardType="number-pad"
                editable={editing}
              />
            </View>
          </View>
        </View>

        {profile?.ml_user_id && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ML Sync Status</Text>
            <View style={styles.form}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success}} />
                <Text style={styles.label}>Synced with ML Backend</Text>
              </View>
              {profile.ml_last_synced_at && (
                <Text style={{fontSize: 12, color: Colors.text.tertiary}}>
                  Last synced: {new Date(profile.ml_last_synced_at).toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        )}

        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin</Text>
            <Pressable style={styles.adminButton} onPress={() => router.push('/admin/prompts')}>
              <Settings color={Colors.primary} size={20} />
              <Text style={styles.adminButtonText}>Manage Prompts</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut color="#dc2626" size={20} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
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
                    setFormData({ ...formData, school: item });
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
                  setFormData({ ...formData, role: item });
                  setShowRolePicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>{item}</Text>
              </Pressable>
            ))}
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
                  setFormData({ ...formData, program_track: item });
                  setShowProgramTrackPicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={showStudyTimePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Study Time</Text>
              <Pressable onPress={() => setShowStudyTimePicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
            </View>
            {['morning', 'afternoon', 'evening', 'night'].map((item) => (
              <Pressable
                key={item}
                style={styles.pickerItem}
                onPress={() => {
                  setFormData({ ...formData, preferred_study_time: item });
                  setShowStudyTimePicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>{item.charAt(0).toUpperCase() + item.slice(1)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  avatarContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  email: {
    fontSize: 16,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  editButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primaryLight + '30',
    borderRadius: BorderRadius.sm,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  form: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
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
  inputDisabled: {
    backgroundColor: Colors.backgroundSecondary,
    color: Colors.text.tertiary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    backgroundColor: Colors.backgroundTertiary,
  },
  cancelButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.light,
  },
  adminButton: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminButtonText: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  signOutButton: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signOutText: {
    ...Typography.bodyBold,
    color: Colors.error,
  },
  version: {
    fontSize: 12,
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
    paddingBottom: 40,
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
    ...Typography.h4,
    color: Colors.text.primary,
  },
  modalClose: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  pickerItem: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  pickerItemText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
});
