import { View, Text, StyleSheet, Image, Pressable, Alert } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Heart, MessageCircle, Trash2, Flag } from 'lucide-react-native';
import { FeedPostWithDetails } from '@/types/social-feed';

interface ImagePostCardProps {
  post: FeedPostWithDetails;
  currentUserId?: string;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onReport?: (postId: string) => void;
  onImagePress?: (postId: string) => void;
}

export default function ImagePostCard({
  post,
  currentUserId,
  onLike,
  onComment,
  onDelete,
  onReport,
  onImagePress,
}: ImagePostCardProps) {
  const isOwnPost = currentUserId === post.user_id;

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(post.id),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {post.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>
              {post.profiles?.full_name?.split(' ')[0] || 'Anonymous'}
            </Text>
            <Text style={styles.timestamp}>{formatTimeAgo(post.created_at)}</Text>
          </View>
        </View>
        <View style={styles.actionButtons}>
          {!isOwnPost && onReport && (
            <Pressable onPress={() => onReport(post.id)} style={styles.reportButton}>
              <Flag color={Colors.text.secondary} size={20} />
            </Pressable>
          )}
          {isOwnPost && onDelete && (
            <Pressable onPress={handleDelete} style={styles.deleteButton}>
              <Trash2 color={Colors.error} size={20} />
            </Pressable>
          )}
        </View>
      </View>

      {post.feed_prompts && (
        <View style={styles.promptBadge}>
          <Text style={styles.promptBadgeText}>{post.feed_prompts.prompt_text}</Text>
        </View>
      )}

      <Pressable onPress={() => onImagePress?.(post.id)}>
        <Image
          source={{ uri: post.image_url! }}
          style={styles.image}
          resizeMode="cover"
        />
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          style={styles.actionButton}
          onPress={() => onLike(post.id)}
        >
          <Heart
            color={post.user_has_liked ? Colors.error : Colors.text.secondary}
            fill={post.user_has_liked ? Colors.error : 'transparent'}
            size={24}
          />
          <Text
            style={[
              styles.actionText,
              post.user_has_liked && { color: Colors.error },
            ]}
          >
            {post.like_count || 0}
          </Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={() => onComment(post.id)}
        >
          <MessageCircle color={Colors.text.secondary} size={24} />
          <Text style={styles.actionText}>{post.comment_count || 0}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.light,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  reportButton: {
    padding: Spacing.xs,
  },
  promptBadge: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.primaryLight + '20',
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  promptBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.backgroundTertiary,
  },
  actions: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
});
