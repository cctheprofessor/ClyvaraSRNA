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
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import Constants from 'expo-constants';
import { User, GraduationCap, Stethoscope, LogOut, Save, Briefcase, ChevronDown, Settings, RefreshCw, ClipboardCheck, Mail, Trash2 } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { ROLES, PROGRAM_TRACKS, CRNA_SCHOOLS } from '@/constants/crna-schools';
import PageHeader from '@/components/PageHeader';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { mlClient } from '@/lib/ml-backend-client';
import { questionCacheService } from '@/lib/question-cache-service';
import MLBackendConsentModal from '@/components/MLBackendConsentModal';

export default function ProfileScreen() {
  const { profile, user, signOut, updateProfile, isAdmin, refreshProfile, deleteAccount } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showProgramTrackPicker, setShowProgramTrackPicker] = useState(false);
  const [showStudyTimePicker, setShowStudyTimePicker] = useState(false);
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [showEnrollmentDatePicker, setShowEnrollmentDatePicker] = useState(false);
  const [showExpectedGraduationPicker, setShowExpectedGraduationPicker] = useState(false);
  const [mlSyncLoading, setMlSyncLoading] = useState(false);
  const [showMLConsentModal, setShowMLConsentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    institution: profile?.institution || '',
    enrollment_date: profile?.enrollment_date ? profile.enrollment_date.substring(0, 7) : '',
    expected_graduation: profile?.expected_graduation ? profile.expected_graduation.substring(0, 7) : '',
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
        institution: profile.institution || '',
        enrollment_date: profile.enrollment_date ? profile.enrollment_date.substring(0, 7) : '',
        expected_graduation: profile.expected_graduation ? profile.expected_graduation.substring(0, 7) : '',
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
    if (__DEV__) { console.log('[Profile] Starting profile update...'); }
    setLoading(true);

    const updates = {
      full_name: formData.full_name,
      first_name: formData.first_name || null,
      last_name: formData.last_name || null,
      institution: formData.institution || null,
      enrollment_date: formData.enrollment_date ? `${formData.enrollment_date}-01` : null,
      expected_graduation: formData.expected_graduation ? `${formData.expected_graduation}-01` : null,
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

    if (__DEV__) { console.log('[Profile] Update payload:', updates); }

    const { error } = await updateProfile(updates);

    setLoading(false);

    if (error) {
      if (__DEV__) { console.error('[Profile] Update failed:', error); }
      Alert.alert('Error', `Failed to update profile: ${error.message || 'Unknown error'}`);
    } else {
      if (__DEV__) { console.log('[Profile] Update successful!'); }
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    const { error } = await deleteAccount();
    if (error) {
      setDeleteLoading(false);
      setDeleteError('Something went wrong. Please try again.');
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || '',
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      institution: profile?.institution || '',
      enrollment_date: profile?.enrollment_date ? profile.enrollment_date.substring(0, 7) : '',
      expected_graduation: profile?.expected_graduation ? profile.expected_graduation.substring(0, 7) : '',
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

  const generateDateOptions = () => {
    const dates = [];
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 5;
    const endYear = currentYear + 10;

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

  const performMLSync = async () => {
    if (!user || !profile) return;

    setMlSyncLoading(true);

    try {
      if (__DEV__) { console.log('Starting ML sync for user:', user.id); }
      const mlData = await mlClient.syncUser({
        external_user_id: user.id,
      });

      const mlUserId = typeof mlData.user_id === 'number' ? mlData.user_id : Number(mlData.user_id);
      if (!mlUserId || isNaN(mlUserId)) {
        throw new Error('ML backend did not return a valid user ID. Please try again.');
      }

      if (__DEV__) { console.log('ML sync successful, received user_id:', mlUserId); }

      const syncTimestamp = new Date().toISOString();
      if (__DEV__) { console.log('Updating profile with ml_user_id:', mlUserId, 'at', syncTimestamp); }

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          ml_user_id: mlUserId,
          ml_last_synced_at: syncTimestamp,
        })
        .eq('id', user.id);

      if (profileUpdateError) {
        if (__DEV__) { console.error('Failed to update profile:', profileUpdateError); }
        throw new Error('Failed to update profile after sync');
      }

      if (__DEV__) { console.log('Profile updated successfully'); }

      const { error: syncStatusError } = await supabase.from('ml_sync_status').upsert(
        {
          user_id: user.id,
          sync_status: 'active',
          last_sync_at: new Date().toISOString(),
          last_sync_error: null,
        },
        {
          onConflict: 'user_id',
        }
      );

      if (syncStatusError) {
        if (__DEV__) { console.error('Failed to update sync status:', syncStatusError); }
      }

      if (__DEV__) { console.log('Refreshing profile to get updated data...'); }
      await refreshProfile();
      if (__DEV__) { console.log('Profile refreshed, new timestamp should be visible'); }

      questionCacheService.preFetchAfterSync(mlUserId);

      Alert.alert('Success', 'Successfully synced with Clyvara Analytica! You can now access practice questions.');
    } catch (error: any) {
      if (__DEV__) { console.error('ML sync error:', error); }

      const errorMessage = error.message || 'Failed to sync with ML backend';
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network');

      if (isNetworkError) {
        Alert.alert(
          'ML Backend Unavailable',
          'The ML backend service is currently unavailable. This may be because:\n\n' +
          '• The service is starting up (Replit apps sleep when inactive)\n' +
          '• Network connectivity issues\n' +
          '• API configuration needs updating\n\n' +
          'You can still use other features of the app. Practice questions will be available once the ML backend is online.'
        );
      } else {
        Alert.alert('Sync Failed', errorMessage);
      }

      const { error: syncStatusError } = await supabase.from('ml_sync_status').upsert(
        {
          user_id: user.id,
          sync_status: 'pending',
          last_sync_error: error.message || 'Unknown error',
        },
        {
          onConflict: 'user_id',
        }
      );

      if (syncStatusError) {
        if (__DEV__) { console.error('Failed to update sync status:', syncStatusError); }
      }
    } finally {
      setMlSyncLoading(false);
    }
  };

  const handleMLSync = () => {
    if (!user || !profile) {
      Alert.alert('Error', 'Profile not loaded');
      return;
    }
    if (!profile.ml_backend_consent_given) {
      setShowMLConsentModal(true);
      return;
    }
    performMLSync();
  };

  const handleMLConsentAccept = async () => {
    setShowMLConsentModal(false);
    if (!user) return;
    await supabase
      .from('profiles')
      .update({
        ml_backend_consent_given: true,
        ml_backend_consent_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    await refreshProfile();
    performMLSync();
  };

  const handleMLConsentDecline = () => {
    setShowMLConsentModal(false);
    Alert.alert(
      'Consent Required',
      'Adaptive learning features require consent to transmit anonymized performance data. You can enable this at any time from the Clyvara Analytica Sync section of your profile.'
    );
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
                <Mail color="#64748b" size={18} />
                <Text style={styles.label}>Email</Text>
              </View>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={profile?.email || user?.email || 'Not set'}
                editable={false}
              />
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
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Program Information</Text>
          </View>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Institution</Text>
              {editing ? (
                <Pressable
                  style={styles.dropdownButton}
                  onPress={() => setShowSchoolPicker(true)}
                >
                  <Text style={[styles.dropdownText, !formData.institution && styles.placeholderText]}>
                    {formData.institution || 'Select your institution'}
                  </Text>
                  <ChevronDown color={Colors.text.tertiary} size={20} />
                </Pressable>
              ) : (
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={formData.institution || 'Not set'}
                  editable={false}
                />
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Enrollment Date</Text>
              {editing ? (
                <Pressable
                  style={styles.dropdownButton}
                  onPress={() => setShowEnrollmentDatePicker(true)}
                >
                  <Text style={[styles.dropdownText, !formData.enrollment_date && styles.placeholderText]}>
                    {formData.enrollment_date ? formatDateDisplay(formData.enrollment_date) : 'Select enrollment date'}
                  </Text>
                  <ChevronDown color={Colors.text.tertiary} size={20} />
                </Pressable>
              ) : (
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={formData.enrollment_date ? formatDateDisplay(formData.enrollment_date) : 'Not set'}
                  editable={false}
                />
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Expected Graduation Date</Text>
              {editing ? (
                <Pressable
                  style={styles.dropdownButton}
                  onPress={() => setShowExpectedGraduationPicker(true)}
                >
                  <Text style={[styles.dropdownText, !formData.expected_graduation && styles.placeholderText]}>
                    {formData.expected_graduation ? formatDateDisplay(formData.expected_graduation) : 'Select expected graduation'}
                  </Text>
                  <ChevronDown color={Colors.text.tertiary} size={20} />
                </Pressable>
              ) : (
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={formData.expected_graduation ? formatDateDisplay(formData.expected_graduation) : 'Not set'}
                  editable={false}
                />
              )}
            </View>
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
          <Text style={styles.sectionTitle}>Clyvara Analytica Sync</Text>
          <View style={styles.form}>
            {profile?.ml_user_id ? (
              <>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success}} />
                  <Text style={styles.label}>Synced with Clyvara Analytica</Text>
                </View>
                {profile.ml_last_synced_at && (
                  <>
                    <Text style={{fontSize: 12, color: Colors.text.tertiary}}>
                      Last synced: {new Date(profile.ml_last_synced_at).toLocaleString()}
                    </Text>
                    <Text style={{fontSize: 10, color: Colors.text.tertiary, fontStyle: 'italic'}}>
                      User ID: {profile.ml_user_id}
                    </Text>
                  </>
                )}
                <Pressable
                  style={[styles.syncButton, mlSyncLoading && styles.syncButtonDisabled]}
                  onPress={handleMLSync}
                  disabled={mlSyncLoading}
                >
                  {mlSyncLoading ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <RefreshCw color={Colors.primary} size={18} />
                      <Text style={styles.syncButtonText}>Re-sync</Text>
                    </>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.warning}} />
                  <Text style={styles.label}>Not synced with Clyvara Analytica</Text>
                </View>
                <Text style={styles.syncWarning}>
                  You need to sync with the ML backend to access personalized practice questions and analytics.
                </Text>
                <Pressable
                  style={[styles.syncButton, styles.syncButtonPrimary, mlSyncLoading && styles.syncButtonDisabled]}
                  onPress={handleMLSync}
                  disabled={mlSyncLoading}
                >
                  {mlSyncLoading ? (
                    <ActivityIndicator size="small" color={Colors.text.light} />
                  ) : (
                    <>
                      <RefreshCw color={Colors.text.light} size={18} />
                      <Text style={styles.syncButtonTextPrimary}>Sync Now</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnostic Assessment</Text>
          <View style={styles.form}>
            {profile?.diagnostic_completed ? (
              <>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success}} />
                  <Text style={styles.label}>Diagnostic Completed</Text>
                </View>
                {profile.diagnostic_score !== null && (
                  <Text style={styles.diagnosticScore}>
                    Score: {profile.diagnostic_score}/50 ({Math.round((profile.diagnostic_score / 50) * 100)}%)
                  </Text>
                )}
                {profile.diagnostic_completed_at && (
                  <Text style={{fontSize: 12, color: Colors.text.tertiary}}>
                    Completed: {new Date(profile.diagnostic_completed_at).toLocaleDateString()}
                  </Text>
                )}
                <Pressable
                  style={styles.viewResultsButton}
                  onPress={() => router.push('/(tabs)/study/diagnostic-results')}
                >
                  <Text style={styles.viewResultsButtonText}>View Detailed Results</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.warning}} />
                  <Text style={styles.label}>Not Completed</Text>
                </View>
                <Text style={styles.diagnosticWarning}>
                  Complete the diagnostic assessment to unlock personalized practice features.
                </Text>
                <Pressable
                  style={[styles.syncButton, styles.syncButtonPrimary]}
                  onPress={() => router.push('/(tabs)/study/diagnostic-exam')}
                >
                  <Text style={styles.syncButtonTextPrimary}>Take Assessment</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

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
          <Text style={styles.sectionTitle}>Legal</Text>
          <Pressable style={styles.legalButton} onPress={() => router.push('/(legal)/terms-of-service' as any)}>
            <Text style={styles.legalButtonText}>Terms of Service</Text>
          </Pressable>
          <Pressable style={styles.legalButton} onPress={() => router.push('/(legal)/privacy-policy' as any)}>
            <Text style={styles.legalButtonText}>Privacy Policy</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut color="#dc2626" size={20} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
          <Pressable style={styles.deleteAccountButton} onPress={() => { setDeleteError(null); setShowDeleteModal(true); }}>
            <Trash2 color="#dc2626" size={20} />
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>Version {Constants.expoConfig?.version ?? '1.2.1'}</Text>
      </ScrollView>

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

      <Modal visible={showSchoolPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Institution</Text>
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
                    setFormData({ ...formData, institution: item });
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

      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalIconContainer}>
              <Trash2 color="#dc2626" size={32} />
            </View>
            <Text style={styles.deleteModalTitle}>Delete Account</Text>
            <Text style={styles.deleteModalBody}>
              This will permanently delete your account and all associated data, including your study history, practice sessions, care plans, and bookings. This action cannot be undone.
            </Text>
            {deleteError && (
              <Text style={styles.deleteModalError}>{deleteError}</Text>
            )}
            <Pressable
              style={[styles.deleteConfirmButton, deleteLoading && styles.deleteConfirmButtonDisabled]}
              onPress={handleDeleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.deleteConfirmButtonText}>Permanently Delete My Account</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.deleteCancelButton}
              onPress={() => setShowDeleteModal(false)}
              disabled={deleteLoading}
            >
              <Text style={styles.deleteCancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <MLBackendConsentModal
        visible={showMLConsentModal}
        onAccept={handleMLConsentAccept}
        onDecline={handleMLConsentDecline}
      />

      <Modal visible={showEnrollmentDatePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Enrollment Date</Text>
              <Pressable onPress={() => setShowEnrollmentDatePicker(false)}>
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
                    setFormData({ ...formData, enrollment_date: item });
                    setShowEnrollmentDatePicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{formatDateDisplay(item)}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showExpectedGraduationPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Expected Graduation</Text>
              <Pressable onPress={() => setShowExpectedGraduationPicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.pickerItem, styles.clearOption]}
              onPress={() => {
                setFormData({ ...formData, expected_graduation: '' });
                setShowExpectedGraduationPicker(false);
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
                    setFormData({ ...formData, expected_graduation: item });
                    setShowExpectedGraduationPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{formatDateDisplay(item)}</Text>
                </Pressable>
              )}
            />
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
  legalButton: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: 2,
  },
  legalButtonText: {
    fontSize: 15,
    color: Colors.text.secondary,
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
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
    marginTop: Spacing.sm,
  },
  syncButtonPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  syncButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.light,
  },
  syncWarning: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  syncRequirement: {
    fontSize: 13,
    color: Colors.warning,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  diagnosticScore: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  diagnosticWarning: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  viewResultsButton: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  viewResultsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  clearOption: {
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border.dark,
  },
  clearText: {
    color: Colors.error,
    fontWeight: '600',
  },
  deleteAccountButton: {
    backgroundColor: '#fff5f5',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteAccountText: {
    ...Typography.bodyBold,
    color: Colors.error,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  deleteModalContent: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: Spacing.md,
  },
  deleteModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  deleteModalTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  deleteModalBody: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  deleteModalError: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    fontWeight: '500',
  },
  deleteConfirmButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    backgroundColor: '#dc2626',
    marginTop: Spacing.xs,
    minHeight: 50,
    justifyContent: 'center',
  },
  deleteConfirmButtonDisabled: {
    opacity: 0.6,
  },
  deleteConfirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  deleteCancelButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
  },
  deleteCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
});
