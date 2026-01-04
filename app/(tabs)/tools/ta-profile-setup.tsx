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
  const [baseRate, setBaseRate] = useState('25.00');
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
        setBaseRate(data.base_rate_30min.toString());
        setSelectedSpecialties(data.specialties || []);
        setIsActive(data.is_active);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
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

    const rateNum = parseFloat(baseRate);
    if (isNaN(rateNum) || rateNum < 0) {
      Alert.alert('Error', 'Please enter a valid rate');
      return;
    }

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
        base_rate_30min: rateNum,
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
      console.error('Error saving profile:', error);
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

  const rate60 = (parseFloat(baseRate) * 1.8).toFixed(2);
  const rate90 = (parseFloat(baseRate) * 2.5).toFixed(2);

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
          Add your Google Meet or Zoom link. This will be shared with students after payment.
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

        <Text style={styles.sectionTitle}>Base Rate (30 minutes)</Text>
        <View style={styles.rateContainer}>
          <Text style={styles.dollarSign}>$</Text>
          <TextInput
            style={styles.rateInput}
            value={baseRate}
            onChangeText={setBaseRate}
            keyboardType="decimal-pad"
            placeholder="25.00"
            placeholderTextColor={Colors.text.tertiary}
          />
        </View>

        <View style={styles.rateBreakdown}>
          <Text style={styles.breakdownText}>30 min: ${baseRate}</Text>
          <Text style={styles.breakdownText}>60 min: ${rate60}</Text>
          <Text style={styles.breakdownText}>90 min: ${rate90}</Text>
        </View>

        <View style={styles.serviceChargeNote}>
          <Text style={styles.noteText}>
            A $2.50 service charge will be added to each booking
          </Text>
        </View>

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
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  dollarSign: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginRight: 8,
  },
  rateInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    paddingVertical: 16,
  },
  rateBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  breakdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  serviceChargeNote: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  noteText: {
    fontSize: 13,
    color: Colors.text.primary,
    fontWeight: '500',
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
