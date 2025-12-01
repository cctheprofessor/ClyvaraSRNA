import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';

export default function AskTAScreen() {
  return (
    <View style={styles.container}>
      <PageHeader
        title="Ask a Teaching Assistant"
        subtitle="Get expert help"
      />
      <View style={styles.content}>
        <Text style={styles.comingSoon}>Coming Soon!</Text>
        <Text style={styles.description}>
          Ask questions and get personalized help from experienced Teaching Assistants!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  comingSoon: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  description: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
