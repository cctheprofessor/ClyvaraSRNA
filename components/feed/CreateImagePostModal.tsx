import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { X, Camera, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { FeedPrompt } from '@/types/social-feed';

interface CreateImagePostModalProps {
  visible: boolean;
  prompt: FeedPrompt | null;
  onClose: () => void;
  onPostCreated: () => void;
}

export default function CreateImagePostModal({
  visible,
  prompt,
  onClose,
  onPostCreated,
}: CreateImagePostModalProps) {
  const { session } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need camera and photo library permissions to upload images.'
        );
        return false;
      }
    }
    return true;
  };

  const pickImageFromLibrary = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const uploadImage = async () => {
    if (!selectedImage || !session?.user || !prompt) return;

    setUploading(true);

    try {
      const fileExt = selectedImage.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

      let imageData: Blob | File;

      if (Platform.OS === 'web') {
        const response = await fetch(selectedImage);
        imageData = await response.blob();
      } else {
        const response = await fetch(selectedImage);
        imageData = await response.blob();
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('feed-images')
        .upload(fileName, imageData, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('feed-images').getPublicUrl(fileName);

      const { error: insertError } = await supabase.from('feed_posts').insert({
        user_id: session.user.id,
        prompt_id: prompt.id,
        post_type: 'image',
        image_url: publicUrl,
      });

      if (insertError) throw insertError;

      setSelectedImage(null);
      onPostCreated();
      onClose();
    } catch (error: any) {
      if (__DEV__) { console.error('Error uploading image:', error); }
      Alert.alert('Upload Failed', error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedImage(null);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Upload Image</Text>
            <Pressable onPress={handleClose} disabled={uploading}>
              <X color={Colors.text.secondary} size={24} />
            </Pressable>
          </View>

          {prompt && (
            <View style={styles.promptContainer}>
              <Text style={styles.promptLabel}>Responding to:</Text>
              <Text style={styles.promptText}>{prompt.prompt_text}</Text>
            </View>
          )}

          {!selectedImage ? (
            <View style={styles.uploadOptions}>
              <Pressable
                style={styles.uploadButton}
                onPress={takePhoto}
                disabled={uploading}
              >
                <Camera color={Colors.primary} size={32} />
                <Text style={styles.uploadButtonText}>Take Photo</Text>
              </Pressable>

              <Pressable
                style={styles.uploadButton}
                onPress={pickImageFromLibrary}
                disabled={uploading}
              >
                <ImageIcon color={Colors.secondary} size={32} />
                <Text style={styles.uploadButtonText}>Choose from Library</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              <View style={styles.actionButtons}>
                <Pressable
                  style={styles.changeImageButton}
                  onPress={() => setSelectedImage(null)}
                  disabled={uploading}
                >
                  <Text style={styles.changeImageButtonText}>Change Image</Text>
                </Pressable>
                <Pressable
                  style={styles.postButton}
                  onPress={uploadImage}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color={Colors.text.light} />
                  ) : (
                    <Text style={styles.postButtonText}>Post</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  promptContainer: {
    backgroundColor: Colors.primaryLight + '20',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  promptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  promptText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  uploadOptions: {
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border.light,
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  imagePreviewContainer: {
    gap: Spacing.md,
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundTertiary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  changeImageButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    alignItems: 'center',
  },
  changeImageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  postButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.light,
  },
});
