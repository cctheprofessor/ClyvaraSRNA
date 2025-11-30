export interface FeedPrompt {
  id: string;
  prompt_text: string;
  prompt_type: 'image' | 'storytime';
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface FeedPost {
  id: string;
  user_id: string;
  prompt_id: string | null;
  post_type: 'image' | 'text';
  content_text: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    id: string;
  };
  feed_prompts?: {
    prompt_text: string;
    prompt_type: string;
  };
  like_count?: number;
  comment_count?: number;
  user_has_liked?: boolean;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    id: string;
  };
}

export interface FeedPostWithDetails extends FeedPost {
  like_count: number;
  comment_count: number;
  user_has_liked: boolean;
  comments?: PostComment[];
}
