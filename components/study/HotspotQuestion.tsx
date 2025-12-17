import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { HotspotQuestion as HotspotQuestionType } from '@/types/question';
import { Check, X } from 'lucide-react-native';

interface HotspotQuestionProps {
  question: HotspotQuestionType;
  value: string | null;
  onChange: (zoneId: string) => void;
  showResult?: boolean;
  isCorrect?: boolean;
  disabled?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_MAX_WIDTH = SCREEN_WIDTH - (Spacing.lg * 4);

export default function HotspotQuestion({
  question,
  value,
  onChange,
  showResult = false,
  isCorrect,
  disabled = false,
}: HotspotQuestionProps) {
  const [imageLayout, setImageLayout] = useState<{ width: number; height: number } | null>(null);

  const handleZonePress = (zoneId: string) => {
    if (disabled) return;
    onChange(zoneId);
  };

  const handleImageLoad = (event: any) => {
    const { width, height } = event.nativeEvent.source;
    const aspectRatio = width / height;

    let displayWidth = Math.min(width, IMAGE_MAX_WIDTH);
    let displayHeight = displayWidth / aspectRatio;

    if (displayHeight > 400) {
      displayHeight = 400;
      displayWidth = displayHeight * aspectRatio;
    }

    setImageLayout({ width: displayWidth, height: displayHeight });
  };

  const getScaledZonePosition = (zone: any) => {
    if (!imageLayout) return { left: 0, top: 0, width: 0, height: 0 };

    return {
      left: (zone.x / 100) * imageLayout.width,
      top: (zone.y / 100) * imageLayout.height,
      width: (zone.width / 100) * imageLayout.width,
      height: (zone.height / 100) * imageLayout.height,
    };
  };

  const selectedZone = question.options.hotspot_zones.find(z => z.id === value);
  const correctZone = question.options.hotspot_zones.find(z => z.is_correct);

  return (
    <View style={styles.container}>
      <Text style={styles.instructions}>
        Tap on the correct area in the image
      </Text>

      <View style={styles.imageContainer}>
        {imageLayout && (
          <View style={[styles.imageWrapper, { width: imageLayout.width, height: imageLayout.height }]}>
            <Image
              source={{ uri: question.options.image_url }}
              style={[styles.image, { width: imageLayout.width, height: imageLayout.height }]}
              onLoad={handleImageLoad}
              resizeMode="contain"
            />

            {question.options.hotspot_zones.map((zone) => {
              const position = getScaledZonePosition(zone);
              const isSelected = value === zone.id;
              const isCorrectZone = zone.is_correct;
              const showCorrect = showResult && isCorrectZone;
              const showIncorrect = showResult && isSelected && !isCorrectZone;

              return (
                <TouchableOpacity
                  key={zone.id}
                  style={[
                    styles.hotspotZone,
                    {
                      left: position.left,
                      top: position.top,
                      width: position.width,
                      height: position.height,
                    },
                    isSelected && !showResult && styles.hotspotZoneSelected,
                    showCorrect && styles.hotspotZoneCorrect,
                    showIncorrect && styles.hotspotZoneIncorrect,
                  ]}
                  onPress={() => handleZonePress(zone.id)}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  {showCorrect && (
                    <View style={styles.zoneIcon}>
                      <Check size={24} color={Colors.success} />
                    </View>
                  )}
                  {showIncorrect && (
                    <View style={styles.zoneIcon}>
                      <X size={24} color={Colors.error} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {!imageLayout && (
          <Image
            source={{ uri: question.options.image_url }}
            style={[styles.image, { width: IMAGE_MAX_WIDTH }]}
            onLoad={handleImageLoad}
            resizeMode="contain"
          />
        )}
      </View>

      {value && !showResult && (
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>Area selected</Text>
        </View>
      )}

      {showResult && (
        <View style={styles.resultContainer}>
          <Text style={[styles.resultText, isCorrect ? styles.correctText : styles.incorrectText]}>
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </Text>
          {!isCorrect && correctZone && (
            <Text style={styles.hintText}>
              The correct area has been highlighted in green
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  instructions: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    borderRadius: BorderRadius.md,
  },
  hotspotZone: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hotspotZoneSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  hotspotZoneCorrect: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  hotspotZoneIncorrect: {
    borderColor: Colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  zoneIcon: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.xs,
  },
  selectionInfo: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  selectionText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '500',
  },
  resultContainer: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  resultText: {
    ...Typography.h3,
    marginBottom: Spacing.xs,
  },
  correctText: {
    color: Colors.success,
  },
  incorrectText: {
    color: Colors.error,
  },
  hintText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
