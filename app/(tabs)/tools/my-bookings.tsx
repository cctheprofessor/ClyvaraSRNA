import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { BookingWithDetails } from '../../../types/ta-booking';
import { Colors } from '../../../constants/theme';
import PageHeader from '../../../components/PageHeader';
import { Calendar, Clock, Star, XCircle } from 'lucide-react-native';

export default function MyBookings() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ta_bookings')
        .select('*, ta_profiles(*)')
        .eq('student_id', user.id)
        .order('session_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;

      setBookings(data || []);
    } catch (error: any) {
      console.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function cancelBooking(bookingId: string) {
    Alert.prompt(
      'Cancel Booking',
      'Please provide a reason for cancellation:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async (reason?: string) => {
            try {
              const { EXPO_PUBLIC_SUPABASE_URL } = process.env;
              const apiUrl = `${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ta-booking-management`;

              const { data: sessionData } = await supabase.auth.getSession();
              const token = sessionData.session?.access_token;

              const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  action: 'cancel',
                  booking_id: bookingId,
                  cancellation_reason: reason || 'No reason provided',
                }),
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to cancel booking');
              }

              const result = await response.json();
              Alert.alert('Success', result.message);
              loadBookings();
            } catch (error: any) {
              console.error('Cancel error:', error);
              Alert.alert('Error', error.message || 'Failed to cancel booking');
            }
          },
        },
      ],
      'plain-text'
    );
  }

  function handleCancel(booking: BookingWithDetails) {
    const sessionDateTime = new Date(`${booking.session_date}T${booking.start_time}`);
    const now = new Date();
    const hoursUntil = (sessionDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const message = hoursUntil >= 24
      ? 'You will receive a full refund. Are you sure you want to cancel?'
      : 'No refund will be issued (less than 24 hours notice). Continue?';

    Alert.alert('Cancel Booking', message, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: () => cancelBooking(booking.id) },
    ]);
  }

  async function leaveReview(bookingId: string, taId: string) {
    router.push({
      pathname: '/tools/leave-review',
      params: { booking_id: bookingId, ta_id: taId },
    });
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHeader title="My Bookings" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  const upcomingBookings = bookings.filter(
    b => b.status === 'confirmed' && new Date(`${b.session_date}T${b.start_time}`) > new Date()
  );

  const pastBookings = bookings.filter(
    b => b.status === 'completed' || b.status === 'cancelled' || b.status === 'refunded' ||
      (b.status === 'confirmed' && new Date(`${b.session_date}T${b.start_time}`) <= new Date())
  );

  return (
    <View style={styles.container}>
      <PageHeader title="My Bookings" showBack />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadBookings();
          }} />
        }
      >
        <Text style={styles.sectionTitle}>Upcoming Sessions</Text>

        {upcomingBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No upcoming sessions</Text>
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => router.push('/tools/book-ta-session')}
            >
              <Text style={styles.bookButtonText}>Book a Session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          upcomingBookings.map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View style={styles.dateTime}>
                  <Calendar size={16} color={Colors.primary} />
                  <Text style={styles.bookingDate}>{booking.session_date}</Text>
                </View>
                <View style={styles.dateTime}>
                  <Clock size={16} color={Colors.primary} />
                  <Text style={styles.bookingTime}>{booking.start_time}</Text>
                  <Text style={styles.bookingDuration}>({booking.duration_minutes} min)</Text>
                </View>
              </View>

              {booking.ta_profiles && (
                <View style={styles.taInfo}>
                  <View style={styles.taRating}>
                    <Star size={14} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.ratingText}>
                      {booking.ta_profiles.average_rating.toFixed(1)}
                    </Text>
                  </View>
                  {booking.ta_profiles.specialties && booking.ta_profiles.specialties.length > 0 && (
                    <Text style={styles.taSpecialties} numberOfLines={1}>
                      {booking.ta_profiles.specialties.join(', ')}
                    </Text>
                  )}
                </View>
              )}

              {booking.notes && (
                <Text style={styles.bookingNotes} numberOfLines={2}>
                  {booking.notes}
                </Text>
              )}

              <View style={styles.bookingFooter}>
                <Text style={styles.bookingTotal}>
                  ${booking.total_amount}
                </Text>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancel(booking)}
                >
                  <XCircle size={16} color="#ff4444" />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Past Sessions</Text>

        {pastBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No past sessions</Text>
          </View>
        ) : (
          pastBookings.map((booking) => (
            <View key={booking.id} style={[styles.bookingCard, styles.pastBookingCard]}>
              <View style={styles.bookingHeader}>
                <View style={styles.dateTime}>
                  <Calendar size={16} color={Colors.textSecondary} />
                  <Text style={styles.bookingDate}>{booking.session_date}</Text>
                </View>
                <View style={[styles.statusBadge, styles[`status${booking.status}`]]}>
                  <Text style={styles.statusText}>{booking.status}</Text>
                </View>
              </View>

              <View style={styles.bookingFooter}>
                <Text style={styles.bookingTotal}>
                  ${booking.total_amount}
                </Text>

                {booking.status === 'completed' && (
                  <TouchableOpacity
                    style={styles.reviewButton}
                    onPress={() => leaveReview(booking.id, booking.ta_id)}
                  >
                    <Star size={16} color="#FFD700" />
                    <Text style={styles.reviewButtonText}>Leave Review</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    marginTop: 8,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  bookButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bookingCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  pastBookingCard: {
    borderColor: 'transparent',
    opacity: 0.8,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookingDate: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  bookingTime: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  bookingDuration: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  taInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  taRating: {
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
  taSpecialties: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  bookingNotes: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 12,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ff4444',
  },
  cancelButtonText: {
    color: '#ff4444',
    fontSize: 13,
    fontWeight: '600',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFD700',
  },
  reviewButtonText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statuscompleted: {
    backgroundColor: '#4CAF50',
  },
  statuscancelled: {
    backgroundColor: '#ff4444',
  },
  statusrefunded: {
    backgroundColor: '#ff9800',
  },
  statusconfirmed: {
    backgroundColor: Colors.primary,
  },
  statuspending: {
    backgroundColor: '#FFA500',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
