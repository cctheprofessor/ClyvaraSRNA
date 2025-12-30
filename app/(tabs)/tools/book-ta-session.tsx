import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import {
  TAProfile,
  DURATION_OPTIONS,
  calculateSessionRate,
  calculateTotalAmount,
  SERVICE_CHARGE,
  DAY_NAMES,
} from '../../../types/ta-booking';
import { Colors } from '../../../constants/theme';
import PageHeader from '../../../components/PageHeader';
import { Star, Calendar, Clock } from 'lucide-react-native';

type Step = 'select-ta' | 'select-time' | 'select-duration' | 'confirm';

export default function BookTASession() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('select-ta');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [tas, setTas] = useState<TAProfile[]>([]);
  const [selectedTA, setSelectedTA] = useState<TAProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<30 | 60 | 90>(30);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadTAs();
  }, []);

  async function loadTAs() {
    try {
      const { data, error } = await supabase
        .from('ta_profiles')
        .select('*')
        .eq('is_active', true)
        .order('average_rating', { ascending: false });

      if (error) throw error;

      setTas(data || []);
    } catch (error: any) {
      console.error('Error loading TAs:', error);
      Alert.alert('Error', 'Failed to load TAs');
    } finally {
      setLoading(false);
    }
  }

  async function proceedToCheckout() {
    if (!selectedTA || !selectedDate || !selectedTime || !user) return;

    setBooking(true);

    try {
      const sessionRate = calculateSessionRate(selectedTA.base_rate_30min, selectedDuration);
      const totalAmount = calculateTotalAmount(selectedTA.base_rate_30min, selectedDuration);

      const { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } = process.env;
      const apiUrl = `${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ta-booking-checkout`;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ta_id: selectedTA.id,
          session_date: selectedDate,
          start_time: selectedTime,
          duration_minutes: selectedDuration,
          notes: notes.trim() || null,
          success_url: `${EXPO_PUBLIC_SUPABASE_URL}`,
          cancel_url: `${EXPO_PUBLIC_SUPABASE_URL}`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout');
      }

      const { url } = await response.json();

      Alert.alert(
        'Proceed to Payment',
        'You will be redirected to Stripe to complete your booking.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              Alert.alert('Success', 'Booking created! Check your email for payment link.');
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Booking error:', error);
      Alert.alert('Error', error.message || 'Failed to create booking');
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHeader title="Book TA Session" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Book TA Session" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 'select-ta' && (
          <>
            <Text style={styles.stepTitle}>Select a Teaching Assistant</Text>

            {tas.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No TAs available at the moment</Text>
              </View>
            ) : (
              tas.map((ta) => (
                <TouchableOpacity
                  key={ta.id}
                  style={[
                    styles.taCard,
                    selectedTA?.id === ta.id && styles.taCardSelected,
                  ]}
                  onPress={() => {
                    setSelectedTA(ta);
                    setStep('select-time');
                  }}
                >
                  <View style={styles.taHeader}>
                    <View style={styles.taInfo}>
                      <View style={styles.ratingBadge}>
                        <Star size={14} color="#FFD700" fill="#FFD700" />
                        <Text style={styles.ratingText}>
                          {ta.average_rating > 0 ? ta.average_rating.toFixed(1) : 'New'}
                        </Text>
                      </View>
                      <Text style={styles.sessionCount}>
                        {ta.total_sessions} sessions
                      </Text>
                    </View>
                    <Text style={styles.taRate}>${ta.base_rate_30min}/30min</Text>
                  </View>

                  {ta.bio && (
                    <Text style={styles.taBio} numberOfLines={2}>
                      {ta.bio}
                    </Text>
                  )}

                  {ta.specialties && ta.specialties.length > 0 && (
                    <View style={styles.specialtiesRow}>
                      {ta.specialties.slice(0, 3).map((specialty, index) => (
                        <View key={index} style={styles.specialtyTag}>
                          <Text style={styles.specialtyTagText}>{specialty}</Text>
                        </View>
                      ))}
                      {ta.specialties.length > 3 && (
                        <Text style={styles.moreSpecialties}>
                          +{ta.specialties.length - 3} more
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {step === 'select-time' && selectedTA && (
          <>
            <TouchableOpacity style={styles.backButton} onPress={() => setStep('select-ta')}>
              <Text style={styles.backButtonText}>← Back to TAs</Text>
            </TouchableOpacity>

            <Text style={styles.stepTitle}>Select Date & Time</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={selectedDate}
                onChangeText={setSelectedDate}
                placeholderTextColor={Colors.text.tertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Time</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM (e.g., 14:30)"
                value={selectedTime}
                onChangeText={setSelectedTime}
                placeholderTextColor={Colors.text.tertiary}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.continueButton,
                (!selectedDate || !selectedTime) && styles.continueButtonDisabled,
              ]}
              disabled={!selectedDate || !selectedTime}
              onPress={() => setStep('select-duration')}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'select-duration' && selectedTA && (
          <>
            <TouchableOpacity style={styles.backButton} onPress={() => setStep('select-time')}>
              <Text style={styles.backButtonText}>← Back to Time</Text>
            </TouchableOpacity>

            <Text style={styles.stepTitle}>Select Duration</Text>

            {DURATION_OPTIONS.map((option) => {
              const sessionRate = calculateSessionRate(selectedTA.base_rate_30min, option.minutes);
              const total = sessionRate + SERVICE_CHARGE;

              return (
                <TouchableOpacity
                  key={option.minutes}
                  style={[
                    styles.durationCard,
                    selectedDuration === option.minutes && styles.durationCardSelected,
                  ]}
                  onPress={() => setSelectedDuration(option.minutes)}
                >
                  <View style={styles.durationInfo}>
                    <Text style={styles.durationLabel}>{option.label}</Text>
                    <View style={styles.priceBreakdown}>
                      <Text style={styles.priceText}>
                        Session: ${sessionRate.toFixed(2)}
                      </Text>
                      <Text style={styles.priceText}>
                        Service charge: ${SERVICE_CHARGE.toFixed(2)}
                      </Text>
                      <Text style={styles.totalText}>
                        Total: ${total.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => setStep('confirm')}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'confirm' && selectedTA && (
          <>
            <TouchableOpacity style={styles.backButton} onPress={() => setStep('select-duration')}>
              <Text style={styles.backButtonText}>← Back to Duration</Text>
            </TouchableOpacity>

            <Text style={styles.stepTitle}>Confirm Booking</Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Date:</Text>
                <Text style={styles.summaryValue}>{selectedDate}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Time:</Text>
                <Text style={styles.summaryValue}>{selectedTime}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Duration:</Text>
                <Text style={styles.summaryValue}>{selectedDuration} minutes</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Session Rate:</Text>
                <Text style={styles.summaryValue}>
                  ${calculateSessionRate(selectedTA.base_rate_30min, selectedDuration).toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service Charge:</Text>
                <Text style={styles.summaryValue}>${SERVICE_CHARGE.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotal}>Total:</Text>
                <Text style={styles.summaryTotalValue}>
                  ${calculateTotalAmount(selectedTA.base_rate_30min, selectedDuration).toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Any questions or topics you'd like to cover?"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                placeholderTextColor={Colors.text.tertiary}
              />
            </View>

            <TouchableOpacity
              style={[styles.bookButton, booking && styles.bookButtonDisabled]}
              onPress={proceedToCheckout}
              disabled={booking}
            >
              {booking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.bookButtonText}>Proceed to Payment</Text>
              )}
            </TouchableOpacity>
          </>
        )}

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
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  taCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  taCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f8ff',
  },
  taHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  sessionCount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  taRate: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  taBio: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  specialtiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  specialtyTag: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  specialtyTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  moreSpecialties: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  durationCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  durationCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f8ff',
  },
  durationInfo: {
    gap: 8,
  },
  durationLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  priceBreakdown: {
    gap: 4,
  },
  priceText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  bookButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
