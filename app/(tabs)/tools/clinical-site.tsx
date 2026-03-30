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

export default function ClinicalSiteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedState, setSelectedState] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [selectedCaseType, setSelectedCaseType] = useState('');
  const [hospitalsList, setHospitalsList] = useState<string[]>([]);
  const [caseTypes, setCaseTypes] = useState<any[]>([]);
  const [caseTips, setCaseTips] = useState<any[]>([]);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showHospitalPicker, setShowHospitalPicker] = useState(false);
  const [showCasePicker, setShowCasePicker] = useState(false);
  const [showAddHospital, setShowAddHospital] = useState(false);
  const [showAddCase, setShowAddCase] = useState(false);
  const [showAddTip, setShowAddTip] = useState(false);
  const [newHospitalName, setNewHospitalName] = useState('');
  const [newCaseName, setNewCaseName] = useState('');
  const [newTip, setNewTip] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedState) {
      loadHospitals();
    }
  }, [selectedState]);

  useEffect(() => {
    if (selectedHospital && selectedState) {
      loadCaseTypes();
    }
  }, [selectedHospital]);

  useEffect(() => {
    if (selectedCaseType) {
      loadCaseTips();
    }
  }, [selectedCaseType]);

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

  const loadCaseTypes = async () => {
    const { data: siteData } = await supabase
      .from('clinical_sites')
      .select('id')
      .eq('state', selectedState)
      .eq('hospital_name', selectedHospital)
      .maybeSingle();

    if (siteData) {
      const { data: cases } = await supabase
        .from('case_types')
        .select('*')
        .eq('clinical_site_id', siteData.id)
        .order('case_name');

      setCaseTypes(cases || []);
    }
  };

  const loadCaseTips = async () => {
    const caseType = caseTypes.find(c => c.case_name === selectedCaseType);
    if (caseType) {
      const { data: tips } = await supabase
        .from('case_tips')
        .select('*')
        .eq('case_type_id', caseType.id)
        .order('created_at', { ascending: false });

      setCaseTips(tips || []);
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

  const handleAddCase = async () => {
    if (!newCaseName.trim() || !user) return;

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
        .from('case_types')
        .insert({
          clinical_site_id: siteId,
          case_name: newCaseName.trim(),
          created_by: user.id,
        });

      setShowAddCase(false);
      setNewCaseName('');
      await loadCaseTypes();
    }
    setLoading(false);
  };

  const handleAddTip = async () => {
    if (!newTip.trim() || !user) return;

    setLoading(true);
    const caseType = caseTypes.find(c => c.case_name === selectedCaseType);

    if (caseType) {
      await supabase
        .from('case_tips')
        .insert({
          case_type_id: caseType.id,
          tip_text: newTip.trim(),
          created_by: user.id,
        });

      setShowAddTip(false);
      setNewTip('');
      await loadCaseTips();
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <PageHeader title="Clinical Site" subtitle="Hospital/clinic and cases!" />

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
            <Text style={styles.label}>Case Type</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => setShowCasePicker(true)}
            >
              <Text style={[styles.dropdownText, !selectedCaseType && styles.placeholderText]}>
                {selectedCaseType || 'Select a case type'}
              </Text>
              <ChevronDown color={Colors.text.tertiary} size={20} />
            </Pressable>
            <Pressable
              style={styles.addButton}
              onPress={() => setShowAddCase(true)}
            >
              <Plus color={Colors.primary} size={18} />
              <Text style={styles.addButtonText}>Case not listed? Add it!</Text>
            </Pressable>
          </View>
        )}

        {selectedCaseType && (
          <View style={styles.tipsSection}>
            <View style={styles.tipsHeader}>
              <Text style={styles.tipsTitle}>Preference Card: {selectedCaseType}</Text>
              <Pressable
                style={styles.primaryButton}
                onPress={() => setShowAddTip(true)}
              >
                <Plus color={Colors.text.light} size={18} />
                <Text style={styles.primaryButtonText}>Leave a case tip!</Text>
              </Pressable>
            </View>

            {caseTips.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No tips yet. Be the first to add one!</Text>
              </View>
            ) : (
              caseTips.map((tip) => (
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

      <Modal visible={showCasePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Case Type</Text>
              <Pressable onPress={() => setShowCasePicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
            </View>
            {caseTypes.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No cases yet. Add one!</Text>
              </View>
            ) : (
              <FlatList
                data={caseTypes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedCaseType(item.case_name);
                      setShowCasePicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{item.case_name}</Text>
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

      <Modal visible={showAddCase} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Case Type</Text>
              <Pressable onPress={() => setShowAddCase(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={styles.input}
                placeholder="Case type (e.g., Laparoscopic Cholecystectomy)"
                value={newCaseName}
                onChangeText={setNewCaseName}
              />
              <Pressable
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleAddCase}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Adding...' : 'Add Case'}
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
              <Text style={styles.modalTitle}>Leave a Case Tip</Text>
              <Pressable onPress={() => setShowAddTip(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Share your tip to help others succeed..."
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
