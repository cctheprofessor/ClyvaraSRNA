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
  TAAvailability,
  DURATION_OPTIONS,
  calculateSessionRate,
  calculateTotalAmount,
  SERVICE_CHARGE,
  DAY_NAMES,
} from '../../../types/ta-booking';
import { Colors } from '../../../constants/theme';
import PageHeader from '../../../components/PageHeader';
import { Star, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react-native';

type Step = 'select-ta' | 'select-time' | 'select-duration' | 'confirm';

interface AvailableDate {
  date: string;
  dayOfWeek: number;
  hasAvailability: boolean;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface ExistingBooking {
  session_date: string;
  start_time: string;
  duration_minutes: number;
}

export default function BookTASession() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('select-ta');
  const [loading, setLoading] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [booking, setBooking] = useState(false);
  const [tas, setTas] = useState<TAProfile[]>([]);
  const [selectedTA, setSelectedTA] = useState<TAProfile | null>(null);
  const [expandedTAId, setExpandedTAId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<30 | 60 | 90>(30);
  const [notes, setNotes] = useState('');

  const [availability, setAvailability] = useState<TAAvailability[]>([]);
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);

  useEffect(() => {
    loadTAs();
  }, []);

  useEffect(() => {
    if (selectedTA && step === 'select-time') {
      loadTAAvailability(selectedTA.id);
    }
  }, [selectedTA, step]);

  useEffect(() => {
    if (selectedDate) {
      calculateAvailableTimeSlots(selectedDate);
    }
  }, [selectedDate, selectedDuration, existingBookings]);

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

  async function loadTAAvailability(taId: string) {
    setLoadingAvailability(true);
    try {
      const { data: availData, error: availError } = await supabase
        .from('ta_availability')
        .select('*')
        .eq('ta_id', taId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (availError) throw availError;

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('ta_bookings')
        .select('session_date, start_time, duration_minutes')
        .eq('ta_id', taId)
        .in('status', ['pending', 'confirmed'])
        .gte('session_date', new Date().toISOString().split('T')[0]);

      if (bookingsError) throw bookingsError;

      setAvailability(availData || []);
      setExistingBookings(bookingsData || []);

      calculateAvailableDates(availData || []);
    } catch (error: any) {
      console.error('Error loading availability:', error);
      Alert.alert('Error', 'Failed to load availability');
    } finally {
      setLoadingAvailability(false);
    }
  }

  function calculateAvailableDates(availabilitySlots: TAAvailability[]) {
    const dates: AvailableDate[] = [];
    const today = new Date();
    const daysToShow = 60;

    const availableDaysOfWeek = new Set(availabilitySlots.map(slot => slot.day_of_week));

    for (let i = 1; i <= daysToShow; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();
      const dateString = date.toISOString().split('T')[0];

      dates.push({
        date: dateString,
        dayOfWeek,
        hasAvailability: availableDaysOfWeek.has(dayOfWeek),
      });
    }

    setAvailableDates(dates);
  }

  function calculateAvailableTimeSlots(date: string) {
    if (!selectedTA || availability.length === 0) return;

    const selectedDateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = selectedDateObj.getDay();

    const dayAvailability = availability.filter(slot => slot.day_of_week === dayOfWeek);

    if (dayAvailability.length === 0) {
      setAvailableTimeSlots([]);
      return;
    }

    const slots: TimeSlot[] = [];

    dayAvailability.forEach(avail => {
      const startParts = avail.start_time.split(':');
      const endParts = avail.end_time.split(':');
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

      for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

        const isAvailable = checkTimeSlotAvailability(date, timeString);

        slots.push({
          time: timeString,
          available: isAvailable,
        });
      }
    });

    const uniqueSlots = Array.from(
      new Map(slots.map(slot => [slot.time, slot])).values()
    ).sort((a, b) => a.time.localeCompare(b.time));

    setAvailableTimeSlots(uniqueSlots);
  }

  function checkTimeSlotAvailability(date: string, time: string): boolean {
    const now = new Date();
    const slotDateTime = new Date(`${date}T${time}:00`);

    if (slotDateTime <= now) {
      return false;
    }

    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    if (slotDateTime < twoHoursFromNow) {
      return false;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const slotStartMinutes = hours * 60 + minutes;
    const slotEndMinutes = slotStartMinutes + selectedDuration;

    for (const booking of existingBookings) {
      if (booking.session_date !== date) continue;

      const [bookingHours, bookingMinutes] = booking.start_time.split(':').map(Number);
      const bookingStartMinutes = bookingHours * 60 + bookingMinutes;
      const bookingEndMinutes = bookingStartMinutes + booking.duration_minutes;

      if (
        (slotStartMinutes >= bookingStartMinutes && slotStartMinutes < bookingEndMinutes) ||
        (slotEndMinutes > bookingStartMinutes && slotEndMinutes <= bookingEndMinutes) ||
        (slotStartMinutes <= bookingStartMinutes && slotEndMinutes >= bookingEndMinutes)
      ) {
        return false;
      }
    }

    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    const dayAvailability = availability.filter(slot => slot.day_of_week === dayOfWeek);

    for (const avail of dayAvailability) {
      const [availStartHours, availStartMinutes] = avail.start_time.split(':').map(Number);
      const [availEndHours, availEndMinutes] = avail.end_time.split(':').map(Number);
      const availStartMinutes = availStartHours * 60 + availStartMinutes;
      const availEndMinutes = availEndHours * 60 + availEndMinutes;

      if (slotStartMinutes >= availStartMinutes && slotEndMinutes <= availEndMinutes) {
        return true;
      }
    }

    return false;
  }

  async function proceedToCheckout() {
    if (!selectedTA || !selectedDate || !selectedTime || !user) return;

    const isAvailable = checkTimeSlotAvailability(selectedDate, selectedTime);
    if (!isAvailable) {
      Alert.alert(
        'Time Slot Unavailable',
        'This time slot is no longer available. Please select a different time.',
        [
          {
            text: 'OK',
            onPress: () => setStep('select-time'),
          },
        ]
      );
      return;
    }

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
              tas.map((ta) => {
                const isExpanded = expandedTAId === ta.id;

                return (
                  <View
                    key={ta.id}
                    style={[
                      styles.taCard,
                      isExpanded && styles.taCardExpanded,
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setExpandedTAId(isExpanded ? null : ta.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.taCardHeader}>
                        {ta.display_name && (
                          <Text style={styles.taName}>{ta.display_name}</Text>
                        )}

                        {isExpanded ? (
                          <ChevronUp size={20} color={Colors.primary} />
                        ) : (
                          <ChevronDown size={20} color={Colors.text.tertiary} />
                        )}
                      </View>

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
                        <Text
                          style={styles.taBio}
                          numberOfLines={isExpanded ? undefined : 2}
                        >
                          {ta.bio}
                        </Text>
                      )}

                      {ta.specialties && ta.specialties.length > 0 && (
                        <View style={styles.specialtiesRow}>
                          {(isExpanded ? ta.specialties : ta.specialties.slice(0, 3)).map((specialty, index) => (
                            <View key={index} style={styles.specialtyTag}>
                              <Text style={styles.specialtyTagText}>{specialty}</Text>
                            </View>
                          ))}
                          {!isExpanded && ta.specialties.length > 3 && (
                            <Text style={styles.moreSpecialties}>
                              +{ta.specialties.length - 3} more
                            </Text>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>

                    {isExpanded && (
                      <TouchableOpacity
                        style={styles.selectButton}
                        onPress={() => {
                          setSelectedTA(ta);
                          setStep('select-time');
                        }}
                      >
                        <Text style={styles.selectButtonText}>Select This TA</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}

        {step === 'select-time' && selectedTA && (
          <>
            <TouchableOpacity style={styles.backButton} onPress={() => setStep('select-ta')}>
              <Text style={styles.backButtonText}>← Back to TAs</Text>
            </TouchableOpacity>

            <Text style={styles.stepTitle}>Select Date & Time</Text>

            {loadingAvailability ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading availability...</Text>
              </View>
            ) : availability.length === 0 ? (
              <View style={styles.noAvailabilityContainer}>
                <Text style={styles.noAvailabilityText}>
                  This TA hasn&apos;t set their availability yet.
                </Text>
                <Text style={styles.noAvailabilitySubtext}>
                  Please select a different TA or check back later.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.availabilityInfo}>
                  <Text style={styles.availabilityInfoText}>
                    {selectedTA.display_name || 'This TA'} is available on:{' '}
                    {Array.from(new Set(availability.map(a => DAY_NAMES[a.day_of_week])))
                      .join(', ')}
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Select Date</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.dateScroller}
                  >
                    {availableDates.filter(d => d.hasAvailability).slice(0, 30).map((dateOption) => {
                      const dateObj = new Date(dateOption.date + 'T00:00:00');
                      const isSelected = selectedDate === dateOption.date;

                      return (
                        <TouchableOpacity
                          key={dateOption.date}
                          style={[
                            styles.dateCard,
                            isSelected && styles.dateCardSelected,
                            !dateOption.hasAvailability && styles.dateCardDisabled,
                          ]}
                          onPress={() => {
                            setSelectedDate(dateOption.date);
                            setSelectedTime('');
                          }}
                          disabled={!dateOption.hasAvailability}
                        >
                          <Text style={[styles.dateDayName, isSelected && styles.dateTextSelected]}>
                            {DAY_NAMES[dateOption.dayOfWeek].slice(0, 3)}
                          </Text>
                          <Text style={[styles.dateDay, isSelected && styles.dateTextSelected]}>
                            {dateObj.getDate()}
                          </Text>
                          <Text style={[styles.dateMonth, isSelected && styles.dateTextSelected]}>
                            {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {selectedDate && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Select Time</Text>
                    {availableTimeSlots.length === 0 ? (
                      <View style={styles.noSlotsContainer}>
                        <Text style={styles.noSlotsText}>
                          No time slots available for this date
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.timeSlotsGrid}>
                        {availableTimeSlots.map((slot) => {
                          const isSelected = selectedTime === slot.time;

                          return (
                            <TouchableOpacity
                              key={slot.time}
                              style={[
                                styles.timeSlotCard,
                                isSelected && styles.timeSlotCardSelected,
                                !slot.available && styles.timeSlotCardDisabled,
                              ]}
                              onPress={() => setSelectedTime(slot.time)}
                              disabled={!slot.available}
                            >
                              <Text
                                style={[
                                  styles.timeSlotText,
                                  isSelected && styles.timeSlotTextSelected,
                                  !slot.available && styles.timeSlotTextDisabled,
                                ]}
                              >
                                {slot.time}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}

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

            {selectedTA.display_name && (
              <Text style={styles.confirmTAName}>with {selectedTA.display_name}</Text>
            )}

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
  confirmTAName: {
    fontSize: 16,
    color: Colors.text.tertiary,
    marginTop: -12,
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
    color: Colors.text.tertiary,
  },
  taCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  taCardExpanded: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f8ff',
  },
  taCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f8ff',
  },
  taCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
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
    color: Colors.text.primary,
  },
  sessionCount: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  taRate: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  taBio: {
    fontSize: 14,
    color: Colors.text.primary,
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
    color: Colors.text.primary,
  },
  moreSpecialties: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
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
    color: Colors.text.primary,
    marginBottom: 8,
  },
  priceBreakdown: {
    gap: 4,
  },
  priceText: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
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
    color: Colors.text.tertiary,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
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
  selectButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  noAvailabilityContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  noAvailabilityText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  noAvailabilitySubtext: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  availabilityInfo: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  availabilityInfoText: {
    fontSize: 14,
    color: '#2e7d32',
    lineHeight: 20,
  },
  dateScroller: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  dateCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 70,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dateCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateCardDisabled: {
    opacity: 0.4,
  },
  dateDayName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginBottom: 4,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  dateTextSelected: {
    color: '#fff',
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlotCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    minWidth: '30%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeSlotCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeSlotCardDisabled: {
    opacity: 0.4,
  },
  timeSlotText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  timeSlotTextSelected: {
    color: '#fff',
  },
  timeSlotTextDisabled: {
    color: Colors.text.tertiary,
  },
  noSlotsContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  noSlotsText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
});
