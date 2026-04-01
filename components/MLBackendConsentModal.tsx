import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';

interface MLBackendConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function MLBackendConsentModal({ visible, onAccept, onDecline }: MLBackendConsentModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.iconRow}>
            <View style={styles.iconWrap}>
              <ShieldCheck color={Colors.primary} size={28} />
            </View>
          </View>

          <Text style={styles.title}>Adaptive Learning — Data Notice</Text>
          <Text style={styles.intro}>
            To power personalized practice questions and adaptive learning, the following
            anonymized data will be sent to{' '}
            <Text style={styles.bold}>Clyvara Analytica</Text>
            {' '}(operated by the Clyvara team):
          </Text>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {[
              'An anonymized user ID (a random UUID — contains no name or email)',
              'Accuracy scores per topic',
              'Topic mastery levels',
              'Study session timing patterns',
            ].map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bullet}>{'\u2022'}</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              Your name, email address, institution, and all other personally identifying
              information are never sent to this service.
            </Text>
          </View>

          <Text style={styles.footer}>
            You can review our full data policy at clyvarahealth.com/privacy.
          </Text>

          <Pressable style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptText}>I Understand — Continue</Text>
          </Pressable>

          <Pressable style={styles.declineButton} onPress={onDecline}>
            <Text style={styles.declineText}>Not Now</Text>
          </Pressable>
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
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '90%',
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  intro: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  bold: {
    fontWeight: '700',
    color: Colors.text.primary,
  },
  list: {
    maxHeight: 160,
    marginBottom: Spacing.sm,
  },
  listContent: {
    gap: Spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  bullet: {
    fontSize: 14,
    color: Colors.primary,
    lineHeight: 22,
  },
  bulletText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 22,
    flex: 1,
  },
  noteBox: {
    backgroundColor: Colors.surfaceSecondary || Colors.backgroundSecondary,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  noteText: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  footer: {
    fontSize: 12,
    color: Colors.text.tertiary,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  acceptButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  acceptText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  declineButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  declineText: {
    fontSize: 15,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
});
