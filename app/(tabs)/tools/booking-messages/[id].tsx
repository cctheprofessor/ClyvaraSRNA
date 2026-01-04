import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { BookingMessage } from '../../../../types/ta-booking';
import { Colors } from '../../../../constants/theme';
import PageHeader from '../../../../components/PageHeader';
import { Send } from 'lucide-react-native';

interface BookingDetails {
  id: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  student_id: string;
  ta_id: string;
  ta_profiles?: {
    display_name: string;
    user_id: string;
  };
  student?: {
    id: string;
    full_name?: string;
  };
}

export default function BookingMessages() {
  const router = useRouter();
  const { id: bookingId } = useLocalSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [messageText, setMessageText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (bookingId && user) {
      loadBookingAndMessages();
      subscribeToMessages();
    }
  }, [bookingId, user]);

  async function loadBookingAndMessages() {
    if (!bookingId || !user) return;

    try {
      const { data: bookingData, error: bookingError } = await supabase
        .from('ta_bookings')
        .select(`
          *,
          ta_profiles!ta_bookings_ta_id_fkey(display_name, user_id),
          student:profiles!ta_bookings_student_id_fkey(id, full_name)
        `)
        .eq('id', bookingId)
        .maybeSingle();

      if (bookingError) throw bookingError;

      if (!bookingData) {
        console.error('Booking not found');
        router.back();
        return;
      }

      setBooking(bookingData);

      const { data: messagesData, error: messagesError } = await supabase
        .from('booking_messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      setMessages(messagesData || []);

      await markMessagesAsRead();
    } catch (error: any) {
      console.error('[BookingMessages] Error loading:', error);
    } finally {
      setLoading(false);
    }
  }

  function subscribeToMessages() {
    const channel = supabase
      .channel(`booking-messages-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const newMessage = payload.new as BookingMessage;
          setMessages((prev) => [...prev, newMessage]);

          if (newMessage.sender_id !== user?.id) {
            markMessagesAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async function markMessagesAsRead() {
    if (!user || !bookingId) return;

    const unreadMessages = messages.filter(
      (msg) => msg.sender_id !== user.id && !msg.read_at
    );

    if (unreadMessages.length === 0) return;

    await supabase
      .from('booking_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('booking_id', bookingId)
      .neq('sender_id', user.id)
      .is('read_at', null);
  }

  async function sendMessage() {
    if (!messageText.trim() || !user || !bookingId) return;

    setSending(true);

    try {
      const { error } = await supabase.from('booking_messages').insert({
        booking_id: bookingId as string,
        sender_id: user.id,
        message_text: messageText.trim(),
      });

      if (error) throw error;

      setMessageText('');

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('[BookingMessages] Send error:', error);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHeader title="Messages" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.container}>
        <PageHeader title="Messages" />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Booking not found</Text>
        </View>
      </View>
    );
  }

  const isTA = booking.ta_profiles?.user_id === user?.id;
  const otherPersonName = isTA
    ? booking.student?.full_name || 'Student'
    : booking.ta_profiles?.display_name || 'TA';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <PageHeader title={`Chat with ${otherPersonName}`} />

      <View style={styles.bookingInfo}>
        <Text style={styles.bookingInfoText}>
          Session: {booking.session_date} at {booking.start_time} ({booking.duration_minutes} min)
        </Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Send a message to start the conversation</Text>
          </View>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === user?.id;
            const messageDate = new Date(message.created_at);
            const timeString = messageDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            return (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  isOwnMessage ? styles.ownMessage : styles.otherMessage,
                ]}
              >
                <Text style={[
                  styles.messageText,
                  isOwnMessage && { color: '#fff' }
                ]}>
                  {message.message_text}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
                  ]}
                >
                  {timeString}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
          placeholderTextColor={Colors.text.tertiary}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!messageText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 15,
    color: Colors.text.tertiary,
  },
  bookingInfo: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  bookingInfoText: {
    fontSize: 13,
    color: Colors.text.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 120,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 4,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
    color: Colors.text.primary,
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: Colors.text.tertiary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: Colors.text.primary,
  },
  sendButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.primary,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
