import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { FeedPrompt, FeedPostWithDetails } from '@/types/social-feed';
import PageHeader from '@/components/PageHeader';
import CallToActionHeader from '@/components/feed/CallToActionHeader';
import ImagePostCard from '@/components/feed/ImagePostCard';
import TextPostCard from '@/components/feed/TextPostCard';
import CreateImagePostModal from '@/components/feed/CreateImagePostModal';
import CreateTextPostModal from '@/components/feed/CreateTextPostModal';
import CommentsModal from '@/components/feed/CommentsModal';

const POSTS_PER_PAGE = 10;

export default function HomeScreen() {
  const { session, profile } = useAuth();
  const [prompts, setPrompts] = useState<FeedPrompt[]>([]);
  const [posts, setPosts] = useState<FeedPostWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<FeedPrompt | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      loadPrompts();
      loadPosts(true);
    }
  }, [session]);

  useEffect(() => {
    if (!session?.user) return;

    const channel = supabase
      .channel('feed_posts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feed_posts',
        },
        () => {
          loadPosts(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const loadPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('feed_prompts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
    }
  };

  const loadPosts = async (reset: boolean = false) => {
    if (!session?.user) return;

    const currentPage = reset ? 0 : page;
    const from = currentPage * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const { data: reportedPostIds } = await supabase
        .from('post_reports')
        .select('post_id')
        .eq('reported_by', session.user.id);

      const reportedIds = new Set(reportedPostIds?.map(r => r.post_id) || []);

      const { data: postsData, error: postsError } = await supabase
        .from('feed_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (postsError) throw postsError;

      const filteredPosts = postsData?.filter(post => !reportedIds.has(post.id)) || [];

      const postsWithDetails: FeedPostWithDetails[] = await Promise.all(
        filteredPosts.map(async (post) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('id', post.user_id)
            .maybeSingle();

          const { data: prompt } = await supabase
            .from('feed_prompts')
            .select('prompt_text, prompt_type')
            .eq('id', post.prompt_id)
            .maybeSingle();

          const { count: likeCount } = await supabase
            .from('post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { count: commentCount } = await supabase
            .from('post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { data: userLike } = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', session.user.id)
            .maybeSingle();

          return {
            ...post,
            profiles: profile,
            feed_prompts: prompt,
            like_count: likeCount || 0,
            comment_count: commentCount || 0,
            user_has_liked: !!userLike,
          };
        })
      );

      if (reset) {
        setPosts(postsWithDetails);
        setPage(1);
      } else {
        setPosts((prev) => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = postsWithDetails.filter(p => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
        setPage((prev) => prev + 1);
      }

      setHasMore(postsWithDetails.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPosts(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadPosts(false);
    }
  };

  const handleImagePromptPress = (prompt: FeedPrompt) => {
    setSelectedPrompt(prompt);
    setImageModalVisible(true);
  };

  const handleTextPromptPress = (prompt: FeedPrompt) => {
    setSelectedPrompt(prompt);
    setTextModalVisible(true);
  };

  const handlePostCreated = () => {
    loadPosts(true);
  };

  const handleLike = async (postId: string) => {
    if (!session?.user) return;

    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      if (post.user_has_liked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', session.user.id);

        if (error) throw error;

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  like_count: Math.max(0, p.like_count - 1),
                  user_has_liked: false,
                }
              : p
          )
        );
      } else {
        const { error } = await supabase.from('post_likes').insert({
          post_id: postId,
          user_id: session.user.id,
        });

        if (error) throw error;

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  like_count: p.like_count + 1,
                  user_has_liked: true,
                }
              : p
          )
        );
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleComment = (postId: string) => {
    setSelectedPostId(postId);
    setCommentsModalVisible(true);
  };

  const handleCommentsModalClose = () => {
    setCommentsModalVisible(false);
    setSelectedPostId(null);
    loadPosts(true);
  };

  const handleDelete = async (postId: string) => {
    console.log('=== handleDelete called ===');
    console.log('Post ID:', postId);
    console.log('Session user:', session?.user?.id);

    if (!session?.user) {
      console.log('No session user, aborting');
      Alert.alert('Error', 'You must be logged in to delete posts');
      return;
    }

    const post = posts.find(p => p.id === postId);
    console.log('Post found in state:', post);
    console.log('Post user_id:', post?.user_id);
    console.log('Current user_id:', session.user.id);
    console.log('User IDs match:', post?.user_id === session.user.id);

    try {
      console.log('Starting delete operation...');
      const { data, error } = await supabase
        .from('feed_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', session.user.id)
        .select();

      console.log('Delete response:', { data, error });

      if (error) {
        console.error('Delete error:', error);
        Alert.alert('Error', `Failed to delete post: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        console.log('No data returned - post may not exist or user does not own it');
        Alert.alert('Error', 'Could not delete post. You may not own this post.');
        return;
      }

      console.log('Delete successful, updating state');
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      console.log('State updated');
      Alert.alert('Success', 'Post deleted successfully');
    } catch (error: any) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', error.message || 'Failed to delete post');
    }
  };

  const handleReport = async (postId: string) => {
    if (!session?.user) {
      if (Platform.OS === 'web') {
        alert('You must be logged in to report posts');
      } else {
        Alert.alert('Error', 'You must be logged in to report posts');
      }
      return;
    }

    const confirmReport = Platform.OS === 'web'
      ? window.confirm('Report this post? It will be immediately removed from the feed.')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Report Post',
            'Report this post? It will be immediately removed from the feed.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Report', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmReport) return;

    try {
      const { error } = await supabase
        .from('post_reports')
        .insert({
          post_id: postId,
          reported_by: session.user.id
        });

      if (error) {
        if (error.code === '23505') {
          if (Platform.OS === 'web') {
            alert('You have already reported this post');
          } else {
            Alert.alert('Info', 'You have already reported this post');
          }
        } else {
          throw error;
        }
        return;
      }

      setPosts((prev) => prev.filter((p) => p.id !== postId));

      if (Platform.OS === 'web') {
        alert('Post reported and removed from feed');
      } else {
        Alert.alert('Success', 'Post reported and removed from feed');
      }
    } catch (error: any) {
      console.error('Error reporting post:', error);
      if (Platform.OS === 'web') {
        alert(error.message || 'Failed to report post');
      } else {
        Alert.alert('Error', error.message || 'Failed to report post');
      }
    }
  };

  const renderPost = ({ item }: { item: FeedPostWithDetails }) => {
    if (item.post_type === 'image') {
      return (
        <ImagePostCard
          post={item}
          currentUserId={session?.user.id}
          onLike={handleLike}
          onComment={handleComment}
          onDelete={handleDelete}
          onReport={handleReport}
        />
      );
    } else {
      return (
        <TextPostCard
          post={item}
          currentUserId={session?.user.id}
          onLike={handleLike}
          onComment={handleComment}
          onDelete={handleDelete}
          onReport={handleReport}
        />
      );
    }
  };

  const renderHeader = () => (
    <>
      <PageHeader
        title={`Hey, ${profile?.full_name?.split(' ')[0] || 'Student'}!`}
        subtitle="Welcome to the Anesthesia Social Club (ASC)!"
      />
      <CallToActionHeader
        prompts={prompts}
        onImagePromptPress={handleImagePromptPress}
        onTextPromptPress={handleTextPromptPress}
      />
    </>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No posts yet</Text>
        <Text style={styles.emptyText}>Be the first to share something!</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={posts.length === 0 ? styles.emptyList : undefined}
      />

      <CreateImagePostModal
        visible={imageModalVisible}
        prompt={selectedPrompt}
        onClose={() => setImageModalVisible(false)}
        onPostCreated={handlePostCreated}
      />

      <CreateTextPostModal
        visible={textModalVisible}
        prompt={selectedPrompt}
        onClose={() => setTextModalVisible(false)}
        onPostCreated={handlePostCreated}
      />

      <CommentsModal
        visible={commentsModalVisible}
        postId={selectedPostId}
        onClose={handleCommentsModalClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  footerLoader: {
    padding: Spacing.md,
    alignItems: 'center',
  },
});
