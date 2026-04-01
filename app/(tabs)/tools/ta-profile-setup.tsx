import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { TAProfile } from '../../../types/ta-booking';
import { Colors } from '../../../constants/theme';
import PageHeader from '../../../components/PageHeader';

const SPECIALTY_OPTIONS = [
  'Pharmacology',
  'Anatomy & Physiology',
  'Chemistry',
  'Pathophysiology',
  'Clinical Procedures',
  'Airway Management',
  'Regional Anesthesia',
  'Cardiac Anesthesia',
  'Pediatric Anesthesia',
  'Obstetric Anesthesia',
  'Pain Management',
  'Critical Care',
];

export default function TAProfileSetup() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<TAProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ta_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setMeetingLink(data.meeting_link || '');
        setSelectedSpecialties(data.specialties || []);
        setIsActive(data.is_active);
      }
    } catch (error: any) {
      if (__DEV__) { console.error('Error loading profile:', error); }
    } finally {
      setLoading(false);
    }
  }

  function toggleSpecialty(specialty: string) {
    if (selectedSpecialties.includes(specialty)) {
      setSelectedSpecialties(selectedSpecialties.filter(s => s !== specialty));
    } else {
      setSelectedSpecialties([...selectedSpecialties, specialty]);
    }
  }

  async function saveProfile() {
    if (!user) return;

    if (selectedSpecialties.length === 0) {
      Alert.alert('Error', 'Please select at least one specialty');
      return;
    }

    setSaving(true);

    try {
      const profileData = {
        user_id: user.id,
        display_name: displayName.trim(),
        bio: bio.trim(),
        meeting_link: meetingLink.trim() || null,
        specialties: selectedSpecialties,
        is_active: isActive,
      };

      if (profile) {
        const { error } = await supabase
          .from('ta_profiles')
          .update(profileData)
          .eq('id', profile.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ta_profiles')
          .insert(profileData);

        if (error) throw error;
      }

      router.replace('/(tabs)/tools/ta-dashboard');
    } catch (error: any) {
      if (__DEV__) { console.error('Error saving profile:', error); }
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHeader title="TA Profile Setup" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title="TA Profile Setup" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, styles.firstSection]}>Display Name</Text>
        <TextInput
          style={styles.nameInput}
          placeholder="Enter your name (e.g., John Smith)"
          value={displayName}
          onChangeText={setDisplayName}
          placeholderTextColor={Colors.text.tertiary}
        />

        <Text style={styles.sectionTitle}>About You</Text>
        <TextInput
          style={styles.bioInput}
          placeholder="Write a brief bio about your expertise and teaching style..."
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          placeholderTextColor={Colors.text.tertiary}
        />

        <Text style={styles.sectionTitle}>Meeting Link</Text>
        <Text style={styles.subtitle}>
          Add your Google Meet or Zoom link. This will be shared with students once their session is approved.
        </Text>
        <TextInput
          style={styles.nameInput}
          placeholder="https://meet.google.com/xxx-xxxx-xxx"
          value={meetingLink}
          onChangeText={setMeetingLink}
          placeholderTextColor={Colors.text.tertiary}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.sectionTitle}>Specialties</Text>
        <Text style={styles.subtitle}>Select your areas of expertise</Text>

        <View style={styles.specialtiesGrid}>
          {SPECIALTY_OPTIONS.map((specialty) => (
            <TouchableOpacity
              key={specialty}
              style={[
                styles.specialtyChip,
                selectedSpecialties.includes(specialty) && styles.specialtyChipSelected,
              ]}
              onPress={() => toggleSpecialty(specialty)}
            >
              <Text
                style={[
                  styles.specialtyText,
                  selectedSpecialties.includes(specialty) && styles.specialtyTextSelected,
                ]}
              >
                {specialty}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.activeContainer}>
          <View>
            <Text style={styles.activeTitle}>Profile Status</Text>
            <Text style={styles.activeSubtitle}>
              {isActive ? 'Accepting bookings' : 'Not accepting bookings'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggle, isActive && styles.toggleActive]}
            onPress={() => setIsActive(!isActive)}
          >
            <View style={[styles.toggleCircle, isActive && styles.toggleCircleActive]} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {profile ? 'Update Profile' : 'Create Profile'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 20,
    marginBottom: 12,
  },
  firstSection: {
    marginTop: 0,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.tertiary,
    marginBottom: 12,
  },
  nameInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
  },
  bioInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  specialtiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specialtyChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  specialtyChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  specialtyText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  specialtyTextSelected: {
    color: '#fff',
  },
  activeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  activeSubtitle: {
    fontSize: 14,
    color: Colors.text.tertiary,
    marginTop: 4,
  },
  toggle: {
    width: 56,
    height: 32,
    backgroundColor: '#ccc',
    borderRadius: 16,
    padding: 3,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleCircle: {
    width: 26,
    height: 26,
    backgroundColor: '#fff',
    borderRadius: 13,
  },
  toggleCircleActive: {
    transform: [{ translateX: 24 }],
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
