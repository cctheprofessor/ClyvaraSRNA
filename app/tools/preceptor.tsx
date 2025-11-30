import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { ChevronDown, Plus, ArrowLeft } from 'lucide-react-native';
import { US_STATES, MAJOR_HOSPITALS_BY_STATE } from '@/constants/clinical-data';

export default function PreceptorScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedState, setSelectedState] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [selectedPreceptor, setSelectedPreceptor] = useState('');
  const [hospitalsList, setHospitalsList] = useState<string[]>([]);
  const [preceptors, setPreceptors] = useState<any[]>([]);
  const [preceptorTips, setPreceptorTips] = useState<any[]>([]);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showHospitalPicker, setShowHospitalPicker] = useState(false);
  const [showPreceptorPicker, setShowPreceptorPicker] = useState(false);
  const [showAddHospital, setShowAddHospital] = useState(false);
  const [showAddPreceptor, setShowAddPreceptor] = useState(false);
  const [showAddTip, setShowAddTip] = useState(false);
  const [newHospitalName, setNewHospitalName] = useState('');
  const [newPreceptorName, setNewPreceptorName] = useState('');
  const [newTip, setNewTip] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedState) {
      loadHospitals();
    }
  }, [selectedState]);

  useEffect(() => {
    if (selectedHospital && selectedState) {
      loadPreceptors();
    }
  }, [selectedHospital]);

  useEffect(() => {
    if (selectedPreceptor) {
      loadPreceptorTips();
    }
  }, [selectedPreceptor]);

  const loadHospitals = async () => {
    const stateHospitals = MAJOR_HOSPITALS_BY_STATE[selectedState] || [];

    const { data, error } = await supabase
      .from('clinical_sites')
      .select('hospital_name')
      .eq('state', selectedState);

    if (!error && data) {
      const userHospitals = data.map(d => d.hospital_name);
      const combined = [...new Set([...stateHospitals, ...userHospitals])].sort();
      setHospitalsList(combined);
    } else {
      setHospitalsList(stateHospitals);
    }
  };

  const loadPreceptors = async () =>{
    const { data: siteData } = await supabase
      .from('clinical_sites')
      .select('id')
      .eq('state', selectedState)
      .eq('hospital_name', selectedHospital)
      .maybeSingle();

    if (siteData) {
      const { data: precs } = await supabase
        .from('preceptors')
        .select('*')
        .eq('clinical_site_id', siteData.id)
        .order('preceptor_name');

      setPreceptors(precs || []);
    }
  };

  const loadPreceptorTips = async () => {
    const preceptor = preceptors.find(p => p.preceptor_name === selectedPreceptor);
    if (preceptor) {
      const { data: tips } = await supabase
        .from('preceptor_tips')
        .select('*')
        .eq('preceptor_id', preceptor.id)
        .order('created_at', { ascending: false });

      setPreceptorTips(tips || []);
    }
  };

  const handleAddHospital = async () => {
    if (!newHospitalName.trim() || !user) return;

    setLoading(true);
    const { error } = await supabase
      .from('clinical_sites')
      .insert({
        state: selectedState,
        hospital_name: newHospitalName.trim(),
        created_by: user.id,
      });

    if (!error) {
      setShowAddHospital(false);
      setNewHospitalName('');
      await loadHospitals();
    }
    setLoading(false);
  };

  const handleAddPreceptor = async () => {
    if (!newPreceptorName.trim() || !user) return;

    setLoading(true);
    const { data: siteData } = await supabase
      .from('clinical_sites')
      .select('id')
      .eq('state', selectedState)
      .eq('hospital_name', selectedHospital)
      .maybeSingle();

    let siteId = siteData?.id;

    if (!siteId) {
      const { data: newSite } = await supabase
        .from('clinical_sites')
        .insert({
          state: selectedState,
          hospital_name: selectedHospital,
          created_by: user.id,
        })
        .select()
        .single();
      siteId = newSite?.id;
    }

    if (siteId) {
      await supabase
        .from('preceptors')
        .insert({
          clinical_site_id: siteId,
          preceptor_name: newPreceptorName.trim(),
          created_by: user.id,
        });

      setShowAddPreceptor(false);
      setNewPreceptorName('');
      await loadPreceptors();
    }
    setLoading(false);
  };

  const handleAddTip = async () => {
    if (!newTip.trim() || !user) return;

    setLoading(true);
    const preceptor = preceptors.find(p => p.preceptor_name === selectedPreceptor);

    if (preceptor) {
      await supabase
        .from('preceptor_tips')
        .insert({
          preceptor_id: preceptor.id,
          tip_text: newTip.trim(),
          created_by: user.id,
        });

      setShowAddTip(false);
      setNewTip('');
      await loadPreceptorTips();
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <PageHeader title="Preceptor" subtitle="Maximize your learning environment!" />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.dropdownSection}>
          <Text style={styles.label}>State</Text>
          <Pressable
            style={styles.dropdown}
            onPress={() => setShowStatePicker(true)}
          >
            <Text style={[styles.dropdownText, !selectedState && styles.placeholderText]}>
              {selectedState || 'Select a state'}
            </Text>
            <ChevronDown color={Colors.text.tertiary} size={20} />
          </Pressable>
        </View>

        {selectedState && (
          <View style={styles.dropdownSection}>
            <Text style={styles.label}>Hospital</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => setShowHospitalPicker(true)}
            >
              <Text style={[styles.dropdownText, !selectedHospital && styles.placeholderText]}>
                {selectedHospital || 'Select a hospital'}
              </Text>
              <ChevronDown color={Colors.text.tertiary} size={20} />
            </Pressable>
            <Pressable
              style={styles.addButton}
              onPress={() => setShowAddHospital(true)}
            >
              <Plus color={Colors.primary} size={18} />
              <Text style={styles.addButtonText}>Site not listed? Add it!</Text>
            </Pressable>
          </View>
        )}

        {selectedHospital && (
          <View style={styles.dropdownSection}>
            <Text style={styles.label}>Preceptor</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => setShowPreceptorPicker(true)}
            >
              <Text style={[styles.dropdownText, !selectedPreceptor && styles.placeholderText]}>
                {selectedPreceptor || 'Select a preceptor'}
              </Text>
              <ChevronDown color={Colors.text.tertiary} size={20} />
            </Pressable>
            <Pressable
              style={styles.addButton}
              onPress={() => setShowAddPreceptor(true)}
            >
              <Plus color={Colors.primary} size={18} />
              <Text style={styles.addButtonText}>Preceptor not listed? Add it!</Text>
            </Pressable>
          </View>
        )}

        {selectedPreceptor && (
          <View style={styles.tipsSection}>
            <View style={styles.tipsHeader}>
              <Text style={styles.tipsTitle}>Preceptor Tips: {selectedPreceptor}</Text>
              <Pressable
                style={styles.primaryButton}
                onPress={() => setShowAddTip(true)}
              >
                <Plus color={Colors.text.light} size={18} />
                <Text style={styles.primaryButtonText}>Leave a Preceptor tip!</Text>
              </Pressable>
            </View>

            {preceptorTips.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No tips yet. Be the first to add one!</Text>
              </View>
            ) : (
              preceptorTips.map((tip) => (
                <View key={tip.id} style={styles.tipCard}>
                  <Text style={styles.tipText}>{tip.tip_text}</Text>
                  <Text style={styles.tipDate}>
                    {new Date(tip.created_at).toLocaleDateString()}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={showStatePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <Pressable onPress={() => setShowStatePicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
            </View>
            <FlatList
              data={US_STATES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedState(item);
                    setSelectedHospital('');
                    setSelectedCaseType('');
                    setShowStatePicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showHospitalPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Hospital</Text>
              <Pressable onPress={() => setShowHospitalPicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
            </View>
            <FlatList
              data={hospitalsList}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedHospital(item);
                    setSelectedCaseType('');
                    setShowHospitalPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showPreceptorPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Preceptor</Text>
              <Pressable onPress={() => setShowPreceptorPicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
            </View>
            {preceptors.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No preceptors yet. Add one!</Text>
              </View>
            ) : (
              <FlatList
                data={preceptors}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedPreceptor(item.preceptor_name);
                      setShowPreceptorPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{item.preceptor_name}</Text>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showAddHospital} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Hospital</Text>
              <Pressable onPress={() => setShowAddHospital(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={styles.input}
                placeholder="Hospital name"
                value={newHospitalName}
                onChangeText={setNewHospitalName}
              />
              <Pressable
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleAddHospital}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Adding...' : 'Add Hospital'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAddPreceptor} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Preceptor</Text>
              <Pressable onPress={() => setShowAddPreceptor(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={styles.input}
                placeholder="Preceptor name (e.g., Christian Cansino, CRNA)"
                value={newPreceptorName}
                onChangeText={setNewPreceptorName}
              />
              <Pressable
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleAddPreceptor}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Adding...' : 'Add Preceptor'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAddTip} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Leave a Preceptor Tip</Text>
              <Pressable onPress={() => setShowAddTip(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Share your tip to help others get in sync with their preceptors!"
                value={newTip}
                onChangeText={setNewTip}
                multiline
                numberOfLines={4}
              />
              <Pressable
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleAddTip}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Submitting...' : 'Submit Tip'}
                </Text>
              </Pressable>
            </View>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  dropdownSection: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border.dark,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  placeholderText: {
    color: Colors.text.tertiary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  addButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  tipsSection: {
    gap: Spacing.md,
  },
  tipsHeader: {
    gap: Spacing.sm,
  },
  tipsTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  primaryButtonText: {
    color: Colors.text.light,
    fontWeight: '600',
  },
  tipCard: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  tipText: {
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  tipDate: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
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
  modalBody: {
    padding: Spacing.lg,
    gap: Spacing.md,
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
  input: {
    borderWidth: 1,
    borderColor: Colors.border.dark,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 16,
    backgroundColor: Colors.background,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.text.light,
    fontWeight: '600',
    fontSize: 16,
  },
});
