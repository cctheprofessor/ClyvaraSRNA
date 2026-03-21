import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Colors } from '../../../constants/theme';
import PageHeader from '../../../components/PageHeader';
import { Star } from 'lucide-react-native';

export default function LeaveReview() {
  const router = useRouter();
  const { user } = useAuth();
  const { booking_id, ta_id } = useLocalSearchParams<{ booking_id: string; ta_id: string }>();

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitReview() {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    if (!user || !booking_id || !ta_id) {
      Alert.alert('Error', 'Missing required information');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('booking_reviews').insert({
        booking_id: booking_id,
        ta_id: ta_id,
        student_id: user.id,
        rating: rating,
        review_text: reviewText.trim() || null,
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error('You have already reviewed this session');
        }
        throw error;
      }

      Alert.alert('Success', 'Review submitted successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      if (__DEV__) { console.error('Review error:', error); }
      Alert.alert('Error', error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Leave a Review" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>How was your session?</Text>

        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              style={styles.starButton}
              onPress={() => setRating(star)}
            >
              <Star
                size={48}
                color={star <= rating ? '#FFD700' : '#ccc'}
                fill={star <= rating ? '#FFD700' : 'transparent'}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.ratingLabel}>
          {rating === 0 && 'Tap to rate'}
          {rating === 1 && 'Poor'}
          {rating === 2 && 'Fair'}
          {rating === 3 && 'Good'}
          {rating === 4 && 'Very Good'}
          {rating === 5 && 'Excellent'}
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Your Review (optional)</Text>
          <TextInput
            style={styles.reviewInput}
            placeholder="Share your experience with this TA..."
            value={reviewText}
            onChangeText={setReviewText}
            multiline
            numberOfLines={6}
            placeholderTextColor={Colors.text.tertiary}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (rating === 0 || submitting) && styles.submitButtonDisabled]}
          onPress={submitReview}
          disabled={rating === 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Review</Text>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 32,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  reviewInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
