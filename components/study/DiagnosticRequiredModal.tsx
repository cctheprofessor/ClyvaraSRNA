import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { AlertCircle, CheckCircle } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

interface DiagnosticRequiredModalProps {
  visible: boolean;
  onClose: () => void;
  onStartDiagnostic: () => void;
  title?: string;
  message?: string;
}

export default function DiagnosticRequiredModal({
  visible,
  onClose,
  onStartDiagnostic,
  title = 'Diagnostic Exam Required',
  message = 'Complete the diagnostic exam to personalize your learning experience and access adaptive practice questions.',
}: DiagnosticRequiredModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <AlertCircle size={48} color={Colors.primary} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.benefits}>
            <View style={styles.benefitItem}>
              <CheckCircle size={20} color={Colors.success} />
              <Text style={styles.benefitText}>Personalized question selection</Text>
            </View>
            <View style={styles.benefitItem}>
              <CheckCircle size={20} color={Colors.success} />
              <Text style={styles.benefitText}>Adaptive difficulty levels</Text>
            </View>
            <View style={styles.benefitItem}>
              <CheckCircle size={20} color={Colors.success} />
              <Text style={styles.benefitText}>Targeted learning recommendations</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={styles.primaryButton}
              onPress={onStartDiagnostic}
            >
              <Text style={styles.primaryButtonText}>Start Diagnostic Exam</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={onClose}
            >
              <Text style={styles.secondaryButtonText}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modal: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  benefits: {
    width: '100%',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  benefitText: {
    ...Typography.body,
    color: Colors.text.primary,
    flex: 1,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...Typography.bodyBold,
    color: Colors.text.light,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
});
