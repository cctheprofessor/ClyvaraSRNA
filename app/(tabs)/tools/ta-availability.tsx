import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { TAAvailability, DAY_NAMES } from '../../../types/ta-booking';
import { Colors } from '../../../constants/theme';
import PageHeader from '../../../components/PageHeader';
import { Plus, Trash2, X } from 'lucide-react-native';

function jsToIsoDay(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

function isoToJsDay(isoDay: number): number {
  return isoDay === 7 ? 0 : isoDay;
}

interface TimeSlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
}

const TIME_OPTIONS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00',
];

export default function TAAvailabilityScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taId, setTaId] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);

  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerType, setTimePickerType] = useState<'start' | 'end'>('start');
  const [timePickerSlotIndex, setTimePickerSlotIndex] = useState<number>(-1);

  useEffect(() => {
    loadAvailability();
  }, []);

  async function loadAvailability() {
    if (!user) return;

    try {
      const { data: profile, error: profileError } = await supabase
        .from('ta_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        Alert.alert('Error', 'Please set up your TA profile first', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      setTaId(profile.id);

      const { data: availability, error: availError } = await supabase
        .from('ta_availability')
        .select('*')
        .eq('ta_id', profile.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (availError) throw availError;

      const slotsWithJsDays = (availability || []).map(slot => ({
        ...slot,
        day_of_week: isoToJsDay(slot.day_of_week),
      }));

      setSlots(slotsWithJsDays);
    } catch (error: any) {
      if (__DEV__) { console.error('Error loading availability:', error); }
      Alert.alert('Error', 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  }

  function addSlot(dayOverride?: number) {
    const dayToUse = dayOverride !== undefined ? dayOverride : selectedDay;
    setSlots([
      ...slots,
      {
        day_of_week: dayToUse,
        start_time: '09:00',
        end_time: '10:00',
        is_recurring: true,
      },
    ]);
  }

  function updateSlot(index: number, field: keyof TimeSlot, value: any) {
    const updated = [...slots];
    updated[index] = { ...updated[index], [field]: value };
    setSlots(updated);
  }

  function removeSlot(index: number) {
    setSlots(slots.filter((_, i) => i !== index));
  }

  function openTimePicker(index: number, type: 'start' | 'end') {
    setTimePickerSlotIndex(index);
    setTimePickerType(type);
    setTimePickerVisible(true);
  }

  function selectTime(time: string) {
    if (timePickerSlotIndex >= 0) {
      updateSlot(
        timePickerSlotIndex,
        timePickerType === 'start' ? 'start_time' : 'end_time',
        time
      );
    }
    setTimePickerVisible(false);
  }

  async function saveAvailability() {
    if (!taId) return;

    for (const slot of slots) {
      if (slot.start_time >= slot.end_time) {
        Alert.alert('Error', 'End time must be after start time');
        return;
      }
    }

    setSaving(true);

    try {
      const { error: deleteError } = await supabase
        .from('ta_availability')
        .delete()
        .eq('ta_id', taId);

      if (deleteError) throw deleteError;

      if (slots.length > 0) {
        const slotsToInsert = slots.map(slot => ({
          ta_id: taId,
          day_of_week: jsToIsoDay(slot.day_of_week),
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_recurring: slot.is_recurring,
        }));

        const { error: insertError } = await supabase
          .from('ta_availability')
          .insert(slotsToInsert);

        if (insertError) throw insertError;
      }

      router.replace('/(tabs)/tools/ta-dashboard');
    } catch (error: any) {
      if (__DEV__) { console.error('Error saving availability:', error); }
      Alert.alert('Error', 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHeader title="Manage Availability" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  const slotsByDay = DAY_NAMES.map((_, index) => ({
    day: index,
    slots: slots.filter(s => s.day_of_week === index),
  }));

  return (
    <View style={styles.container}>
      <PageHeader title="Manage Availability" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>
          Set your recurring weekly availability. Students will only be able to book times when you&apos;re available.
        </Text>

        {slotsByDay.map(({ day, slots: daySlots }) => (
          <View key={day} style={styles.daySection}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>{DAY_NAMES[day]}</Text>
              {selectedDay === day && (
                <TouchableOpacity style={styles.addButton} onPress={addSlot}>
                  <Plus size={18} color="#fff" />
                  <Text style={styles.addButtonText}>Add Time</Text>
                </TouchableOpacity>
              )}
            </View>

            {daySlots.length === 0 ? (
              <TouchableOpacity
                style={styles.emptyState}
                onPress={() => {
                  setSelectedDay(day);
                  addSlot(day);
                }}
              >
                <Text style={styles.emptyText}>No availability set</Text>
                <Text style={styles.emptySubtext}>Tap to add time slots</Text>
              </TouchableOpacity>
            ) : (
              daySlots.map((slot, slotIndex) => {
                const globalIndex = slots.indexOf(slot);
                return (
                  <View key={slotIndex} style={styles.slotCard}>
                    <View style={styles.timeInputs}>
                      <View style={styles.timeField}>
                        <Text style={styles.timeLabel}>Start</Text>
                        <TouchableOpacity
                          style={styles.timeButton}
                          onPress={() => openTimePicker(globalIndex, 'start')}
                        >
                          <Text style={styles.timeText}>{slot.start_time}</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.timeSeparator}>to</Text>

                      <View style={styles.timeField}>
                        <Text style={styles.timeLabel}>End</Text>
                        <TouchableOpacity
                          style={styles.timeButton}
                          onPress={() => openTimePicker(globalIndex, 'end')}
                        >
                          <Text style={styles.timeText}>{slot.end_time}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => removeSlot(globalIndex)}
                    >
                      <Trash2 size={20} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveAvailability}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Availability</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={timePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTimePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {timePickerType === 'start' ? 'Start' : 'End'} Time
              </Text>
              <TouchableOpacity onPress={() => setTimePickerVisible(false)}>
                <X size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.timeList}>
              {TIME_OPTIONS.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={styles.timeOption}
                  onPress={() => selectTime(time)}
                >
                  <Text style={styles.timeOptionText}>{time}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  description: {
    fontSize: 14,
    color: Colors.text.tertiary,
    marginBottom: 20,
    lineHeight: 20,
  },
  daySection: {
    marginBottom: 24,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    padding: 24,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  emptySubtext: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 4,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  timeInputs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginBottom: 4,
  },
  timeButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginTop: 20,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  timeList: {
    flex: 1,
  },
  timeOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    textAlign: 'center',
  },
});
