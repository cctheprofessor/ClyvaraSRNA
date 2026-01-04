import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { TAProfile, BookingWithDetails } from '../../../types/ta-booking';
import { Colors } from '../../../constants/theme';
import PageHeader from '../../../components/PageHeader';
import { Calendar, DollarSign, Star, CheckCircle, XCircle, Bell } from 'lucide-react-native';

export default function TADashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<TAProfile | null>(null);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [confirmingAction, setConfirmingAction] = useState<{bookingId: string, action: 'approve' | 'reject'} | null>(null);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    upcomingCount: 0,
    completedCount: 0,
    pendingCount: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    if (!user) return;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('ta_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        console.log('[TADashboard] No TA profile found, redirecting to setup');
        router.push('/tools/ta-profile-setup');
        return;
      }

      setProfile(profileData);

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('ta_bookings')
        .select(`
          *,
          student:profiles!ta_bookings_student_id_fkey(id, email, full_name)
        `)
        .eq('ta_id', profileData.id)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (bookingsError) throw bookingsError;

      setBookings(bookingsData || []);

      const completed = bookingsData?.filter(b => b.status === 'completed') || [];
      const upcoming = bookingsData?.filter(b =>
        b.status === 'confirmed' && new Date(`${b.session_date}T${b.start_time}`) > new Date()
      ) || [];
      const pending = bookingsData?.filter(b => b.status === 'awaiting_approval') || [];
      const totalEarnings = completed.reduce((sum, b) => sum + Number(b.session_rate), 0);

      setStats({
        totalEarnings,
        upcomingCount: upcoming.length,
        completedCount: completed.length,
        pendingCount: pending.length,
      });
    } catch (error: any) {
      console.error('[TADashboard] Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function approveBooking(bookingId: string) {
    if (!user) return;

    try {
      console.log('[TADashboard] Approving booking:', bookingId);

      const { data, error } = await supabase
        .from('ta_bookings')
        .update({
          status: 'confirmed',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('[TADashboard] Approve error:', error);
        throw error;
      }

      console.log('[TADashboard] Booking approved:', data);
      setConfirmingAction(null);
      loadDashboard();
    } catch (error: any) {
      console.error('[TADashboard] Approve error:', error);
      setConfirmingAction(null);
    }
  }

  async function rejectBooking(bookingId: string, reason: string) {
    try {
      console.log('[TADashboard] Rejecting booking:', bookingId, 'reason:', reason);

      const { data, error } = await supabase
        .from('ta_bookings')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('[TADashboard] Reject error:', error);
        throw error;
      }

      console.log('[TADashboard] Booking rejected:', data);
      setConfirmingAction(null);
      loadDashboard();
    } catch (error: any) {
      console.error('[TADashboard] Reject error:', error);
      setConfirmingAction(null);
    }
  }

  async function markComplete(bookingId: string) {
    try {
      const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ta-booking-management`;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete',
          booking_id: bookingId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete booking');
      }

      console.log('[TADashboard] Session marked as completed');
      loadDashboard();
    } catch (error: any) {
      console.error('[TADashboard] Complete error:', error);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHeader title="TA Dashboard" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <PageHeader title="TA Dashboard" />
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Profile not found</Text>
        </View>
      </View>
    );
  }

  const pendingBookings = bookings.filter(b => b.status === 'awaiting_approval');

  const upcomingBookings = bookings.filter(
    b => b.status === 'confirmed' && new Date(`${b.session_date}T${b.start_time}`) > new Date()
  );

  const pastBookings = bookings.filter(
    b => b.status === 'completed' || new Date(`${b.session_date}T${b.start_time}`) <= new Date()
  );

  function getStatusBadgeColor(status: string) {
    const colorMap: Record<string, string> = {
      'completed': '#4CAF50',
      'cancelled': '#ff4444',
      'refunded': '#ff9800',
      'confirmed': Colors.primary,
      'pending': '#FFA500',
      'awaiting_approval': '#FFA500',
      'approved': '#4CAF50',
      'rejected': '#ff4444',
    };
    return colorMap[status] || '#FFA500';
  }

  return (
    <View style={styles.container}>
      <PageHeader title="TA Dashboard" />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadDashboard();
          }} />
        }
      >
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Bell size={24} color="#FFA500" />
            <Text style={styles.statValue}>{stats.pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={styles.statCard}>
            <Calendar size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{stats.upcomingCount}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>

          <View style={styles.statCard}>
            <CheckCircle size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{stats.completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <View style={styles.statCard}>
            <DollarSign size={24} color="#4CAF50" />
            <Text style={styles.statValue}>${stats.totalEarnings.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/tools/ta-profile-setup')}
          >
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/tools/ta-availability')}
          >
            <Text style={styles.actionButtonText}>Manage Availability</Text>
          </TouchableOpacity>
        </View>

        {pendingBookings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Pending Approval Requests</Text>

            {pendingBookings.map((booking) => {
              const isConfirming = confirmingAction?.bookingId === booking.id;
              return (
                <View key={booking.id} style={[styles.bookingCard, styles.pendingCard]}>
                  <View style={styles.bookingHeader}>
                    <View style={styles.dateTime}>
                      <Bell size={16} color="#FFA500" />
                      <Text style={styles.bookingDate}>{booking.session_date}</Text>
                      <Text style={styles.bookingTime}>{booking.start_time}</Text>
                    </View>
                    <Text style={styles.bookingDuration}>{booking.duration_minutes} min</Text>
                  </View>

                  {booking.student?.full_name && (
                    <Text style={styles.studentName}>Student: {booking.student.full_name}</Text>
                  )}

                  {booking.notes && (
                    <Text style={styles.bookingNotes} numberOfLines={3}>
                      {booking.notes}
                    </Text>
                  )}

                  <View style={styles.bookingFooter}>
                    <Text style={styles.bookingRate}>
                      You'll earn: ${booking.session_rate}
                    </Text>
                  </View>

                  {!isConfirming ? (
                    <View style={styles.approvalActions}>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => setConfirmingAction({bookingId: booking.id, action: 'reject'})}
                      >
                        <XCircle size={16} color="#fff" />
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => setConfirmingAction({bookingId: booking.id, action: 'approve'})}
                      >
                        <CheckCircle size={16} color="#fff" />
                        <Text style={styles.approveButtonText}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.confirmationBox}>
                      <Text style={styles.confirmationText}>
                        {confirmingAction.action === 'approve'
                          ? 'Approve this session request?'
                          : 'Reject this session request?'}
                      </Text>
                      <View style={styles.confirmationActions}>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => setConfirmingAction(null)}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.confirmButton,
                            confirmingAction.action === 'reject' && styles.confirmButtonReject
                          ]}
                          onPress={() => {
                            if (confirmingAction.action === 'approve') {
                              approveBooking(booking.id);
                            } else {
                              rejectBooking(booking.id, 'Time slot no longer available');
                            }
                          }}
                        >
                          <Text style={styles.confirmButtonText}>
                            {confirmingAction.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        <Text style={styles.sectionTitle}>Upcoming Sessions</Text>

        {upcomingBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No upcoming sessions</Text>
          </View>
        ) : (
          upcomingBookings.map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View style={styles.dateTime}>
                  <Calendar size={16} color={Colors.text.tertiary} />
                  <Text style={styles.bookingDate}>{booking.session_date}</Text>
                  <Text style={styles.bookingTime}>{booking.start_time}</Text>
                </View>
                <Text style={styles.bookingDuration}>{booking.duration_minutes} min</Text>
              </View>

              {booking.notes && (
                <Text style={styles.bookingNotes} numberOfLines={2}>
                  {booking.notes}
                </Text>
              )}

              <View style={styles.bookingFooter}>
                <Text style={styles.bookingRate}>
                  You earn: ${booking.session_rate}
                </Text>

                {booking.status === 'confirmed' && (
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => markComplete(booking.id)}
                  >
                    <CheckCircle size={16} color="#fff" />
                    <Text style={styles.completeButtonText}>Mark Complete</Text>
                  </TouchableOpacity>
                )}
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
          pastBookings.slice(0, 5).map((booking) => (
            <View key={booking.id} style={[styles.bookingCard, styles.pastBookingCard]}>
              <View style={styles.bookingHeader}>
                <View style={styles.dateTime}>
                  <Calendar size={16} color={Colors.text.tertiary} />
                  <Text style={styles.bookingDate}>{booking.session_date}</Text>
                  <Text style={styles.bookingTime}>{booking.start_time}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(booking.status) }]}>
                  <Text style={styles.statusText}>{booking.status}</Text>
                </View>
              </View>

              <View style={styles.bookingFooter}>
                <Text style={styles.bookingRate}>
                  ${booking.session_rate}
                </Text>
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: Colors.text.tertiary,
  },
  bookingCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  pastBookingCard: {
    opacity: 0.7,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingDate: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  bookingTime: {
    fontSize: 15,
    color: Colors.text.tertiary,
  },
  bookingDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  bookingNotes: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
    marginBottom: 12,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingRate: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeButtonText: {
    color: '#fff',
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
  pendingCard: {
    borderWidth: 2,
    borderColor: '#FFA500',
    backgroundColor: '#FFFAF0',
  },
  approvalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    borderRadius: 8,
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  confirmationBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  confirmationText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonReject: {
    backgroundColor: '#ff4444',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
