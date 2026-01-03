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
import { Calendar, Clock, Star, XCircle, Bell, CheckCircle, CreditCard } from 'lucide-react-native';

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

  async function handleCancelAwaitingBooking(bookingId: string) {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this booking request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              console.log('Attempting to cancel booking:', bookingId);
              const { data, error } = await supabase
                .from('ta_bookings')
                .update({
                  status: 'cancelled',
                  cancellation_reason: 'Cancelled by student before approval'
                })
                .eq('id', bookingId)
                .select();

              console.log('Update result:', { data, error });

              if (error) {
                console.error('Database error:', error);
                throw error;
              }

              Alert.alert('Success', 'Booking request cancelled successfully');
              loadBookings();
            } catch (error: any) {
              console.error('Cancel error full:', JSON.stringify(error, null, 2));
              Alert.alert('Error', `Failed to cancel: ${error.message}\n\nDetails: ${error.details || 'none'}\nHint: ${error.hint || 'none'}`);
            }
          },
        },
      ]
    );
  }

  async function proceedToPayment(bookingId: string) {
    try {
      const { EXPO_PUBLIC_SUPABASE_URL } = process.env;
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
          booking_id: bookingId,
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
        'You will be redirected to complete your payment.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              Alert.alert('Success', 'Check your email for payment link.');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Error', error.message || 'Failed to process payment');
    }
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

  const awaitingApprovalBookings = bookings.filter(b => b.status === 'awaiting_approval');
  const approvedBookings = bookings.filter(b => b.status === 'approved');
  const rejectedBookings = bookings.filter(b => b.status === 'rejected');

  const upcomingBookings = bookings.filter(
    b => b.status === 'confirmed' && new Date(`${b.session_date}T${b.start_time}`) > new Date()
  );

  const pastBookings = bookings.filter(
    b => b.status === 'completed' || b.status === 'cancelled' || b.status === 'refunded' ||
      (b.status === 'confirmed' && new Date(`${b.session_date}T${b.start_time}`) <= new Date())
  );

  return (
    <View style={styles.container}>
      <PageHeader title="My Bookings" />

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
        {awaitingApprovalBookings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Awaiting TA Approval</Text>

            {awaitingApprovalBookings.map((booking) => (
              <View key={booking.id} style={[styles.bookingCard, styles.awaitingCard]}>
                {booking.ta_profiles?.display_name && (
                  <View style={styles.headerRow}>
                    <Text style={styles.bookingTAName}>{booking.ta_profiles.display_name}</Text>
                    <View style={styles.statusBadge}>
                      <Bell size={12} color="#fff" />
                      <Text style={styles.statusText}>Pending</Text>
                    </View>
                  </View>
                )}

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

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    Waiting for TA approval. You'll be notified when they respond.
                  </Text>
                </View>

                <View style={styles.bookingFooter}>
                  <Text style={styles.bookingTotal}>${booking.total_amount}</Text>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelAwaitingBooking(booking.id)}
                  >
                    <XCircle size={16} color="#ff4444" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {approvedBookings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Ready for Payment</Text>

            {approvedBookings.map((booking) => (
              <View key={booking.id} style={[styles.bookingCard, styles.approvedCard]}>
                {booking.ta_profiles?.display_name && (
                  <View style={styles.headerRow}>
                    <Text style={styles.bookingTAName}>{booking.ta_profiles.display_name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
                      <CheckCircle size={12} color="#fff" />
                      <Text style={styles.statusText}>Approved</Text>
                    </View>
                  </View>
                )}

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

                <View style={[styles.infoBox, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={styles.infoText}>
                    TA approved! Complete payment to confirm your session.
                  </Text>
                </View>

                <View style={styles.bookingFooter}>
                  <Text style={styles.bookingTotal}>${booking.total_amount}</Text>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => handleCancelAwaitingBooking(booking.id)}
                    >
                      <XCircle size={16} color="#ff4444" />
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.payButton}
                      onPress={() => proceedToPayment(booking.id)}
                    >
                      <CreditCard size={16} color="#fff" />
                      <Text style={styles.payButtonText}>Pay Now</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {rejectedBookings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Declined Requests</Text>

            {rejectedBookings.map((booking) => (
              <View key={booking.id} style={[styles.bookingCard, styles.rejectedCard]}>
                {booking.ta_profiles?.display_name && (
                  <View style={styles.headerRow}>
                    <Text style={styles.bookingTAName}>{booking.ta_profiles.display_name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: '#ff4444' }]}>
                      <XCircle size={12} color="#fff" />
                      <Text style={styles.statusText}>Declined</Text>
                    </View>
                  </View>
                )}

                <View style={styles.bookingHeader}>
                  <View style={styles.dateTime}>
                    <Calendar size={16} color={Colors.text.tertiary} />
                    <Text style={styles.bookingDate}>{booking.session_date}</Text>
                  </View>
                  <View style={styles.dateTime}>
                    <Clock size={16} color={Colors.text.tertiary} />
                    <Text style={styles.bookingTime}>{booking.start_time}</Text>
                  </View>
                </View>

                {booking.rejection_reason && (
                  <View style={[styles.infoBox, { backgroundColor: '#FFEBEE' }]}>
                    <Text style={styles.infoLabel}>Reason:</Text>
                    <Text style={styles.infoText}>{booking.rejection_reason}</Text>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

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
              {booking.ta_profiles?.display_name && (
                <Text style={styles.bookingTAName}>{booking.ta_profiles.display_name}</Text>
              )}

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
              {booking.ta_profiles?.display_name && (
                <Text style={styles.bookingTAName}>{booking.ta_profiles.display_name}</Text>
              )}

              <View style={styles.bookingHeader}>
                <View style={styles.dateTime}>
                  <Calendar size={16} color={Colors.text.tertiary} />
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
    color: Colors.text.primary,
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
    color: Colors.text.tertiary,
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
  bookingTAName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
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
    color: Colors.text.primary,
  },
  bookingTime: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  bookingDuration: {
    fontSize: 13,
    color: Colors.text.tertiary,
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
    color: Colors.text.primary,
  },
  taSpecialties: {
    fontSize: 13,
    color: Colors.text.tertiary,
    flex: 1,
  },
  bookingNotes: {
    fontSize: 14,
    color: Colors.text.primary,
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
    color: Colors.text.primary,
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
    color: Colors.text.primary,
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
  statusawaiting_approval: {
    backgroundColor: '#FFA500',
  },
  statusapproved: {
    backgroundColor: '#4CAF50',
  },
  statusrejected: {
    backgroundColor: '#ff4444',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  awaitingCard: {
    borderColor: '#FFA500',
    backgroundColor: '#FFFAF0',
  },
  approvedCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8F4',
  },
  rejectedCard: {
    borderColor: '#ff4444',
    backgroundColor: '#FFF5F5',
    opacity: 0.9,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoBox: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: Colors.text.primary,
    lineHeight: 18,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
});
