export interface TAProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio: string;
  specialties: string[];
  is_active: boolean;
  meeting_link: string | null;
  total_sessions: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
}

export interface TAAvailability {
  id: string;
  ta_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  created_at: string;
}

export type BookingStatus = 'awaiting_approval' | 'approved' | 'rejected' | 'completed' | 'cancelled';

export interface TABooking {
  id: string;
  ta_id: string;
  student_id: string;
  session_date: string;
  start_time: string;
  duration_minutes: 30 | 60 | 90;
  status: BookingStatus;
  meeting_link: string | null;
  notes: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingReview {
  id: string;
  booking_id: string;
  ta_id: string;
  student_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

export interface TAWithProfile extends TAProfile {
  user?: {
    id: string;
    email?: string;
  };
}

export interface BookingWithDetails extends TABooking {
  ta_profiles?: TAProfile;
  student?: {
    id: string;
    email?: string;
    full_name?: string;
  };
  has_review?: boolean;
}

export interface DurationOption {
  minutes: 30 | 60 | 90;
  label: string;
}

export const DURATION_OPTIONS: DurationOption[] = [
  { minutes: 30, label: '30 minutes' },
  { minutes: 60, label: '60 minutes' },
  { minutes: 90, label: '90 minutes' },
];

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export interface BookingMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  message_text: string;
  read_at: string | null;
  created_at: string;
}
