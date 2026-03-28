import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ShieldCheck, X } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';

type AIConsentVariant = 'care-plan' | 'study-plan';

interface AIConsentModalProps {
  visible: boolean;
  variant: AIConsentVariant;
  onAccept: () => void;
  onDecline: () => void;
}

const CONTENT: Record<AIConsentVariant, { title: string; dataList: string[]; note?: string }> = {
  'care-plan': {
    title: 'Care Plan AI — Data Sharing Notice',
    dataList: [
      'The clinical case description you typed',
      'Patient demographics (age, weight, sex, ASA class)',
      'Procedure type and description',
      'Medical and surgical history',
      'Current medications and allergies',
      'Physical exam and lab findings',
    ],
    note: 'Do not include real patient names, medical record numbers, or any individually identifying health information. Use anonymized or fictional case details only.',
  },
  'study-plan': {
    title: 'Study Plan AI — Data Sharing Notice',
    dataList: [
      'Your exam date',
      'Current knowledge level',
      'Weekly study hours',
      'Selected focus areas and weak topics',
      'Study goals you have entered',
    ],
  },
};

export default function AIConsentModal({ visible, variant, onAccept, onDecline }: AIConsentModalProps) {
  const content = CONTENT[variant];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.iconRow}>
            <View style={styles.iconWrap}>
              <ShieldCheck color={Colors.primary} size={28} />
            </View>
          </View>

          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.intro}>
            To generate this content, the following data will be sent to{' '}
            <Text style={styles.bold}>OpenAI, Inc.</Text>
            {' '}(api.openai.com) for AI processing:
          </Text>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {content.dataList.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bullet}>{'\u2022'}</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </ScrollView>

          {content.note && (
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>{content.note}</Text>
            </View>
          )}

          <Text style={styles.footer}>
            OpenAI does not use API submissions to train its models by default. You can review OpenAI's privacy policy at openai.com/policies/privacy-policy.
          </Text>

          <Pressable style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptText}>I Understand — Continue</Text>
          </Pressable>

          <Pressable style={styles.declineButton} onPress={onDecline}>
            <Text style={styles.declineText}>Cancel</Text>
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
    backgroundColor: '#FDE8F3',
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
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  noteText: {
    fontSize: 13,
    color: '#7A5C00',
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
