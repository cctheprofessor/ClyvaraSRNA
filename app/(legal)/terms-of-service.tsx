import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function TermsOfServiceScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={Colors.text.primary} size={24} />
        </Pressable>
        <Text style={styles.title}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last updated: January 2026</Text>

        <Text style={styles.body}>
          Please read these Terms of Service carefully before using Clyvara. By accessing or using the app, you agree to be bound by these terms.
        </Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.body}>
          By creating an account and using Clyvara, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, you may not use the app.
        </Text>

        <Text style={styles.sectionTitle}>2. Educational Purpose Only</Text>
        <Text style={styles.body}>
          Clyvara is an educational tool designed to assist nurse anesthesia students and professionals with exam preparation and learning. The content provided through Clyvara, including AI-generated questions, study plans, and anesthesia care plan templates, is for educational purposes only.{'\n\n'}
          CLYVARA IS NOT A CLINICAL DECISION-MAKING TOOL. Content within the app should never be used as a substitute for professional medical judgment, clinical guidelines, or the advice of qualified healthcare professionals.{'\n\n'}
          Users should always seek the advice of a physician or other qualified healthcare provider with any questions regarding a medical condition before making any healthcare decisions.
        </Text>

        <Text style={styles.sectionTitle}>3. Eligibility</Text>
        <Text style={styles.body}>
          You must be at least 18 years of age to use Clyvara. By using the app, you represent that you are 18 years of age or older and are enrolled in or affiliated with a nurse anesthesia program, healthcare education program, or related professional field.
        </Text>

        <Text style={styles.sectionTitle}>4. Account Responsibilities</Text>
        <Text style={styles.body}>
          You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
        </Text>

        <Text style={styles.sectionTitle}>5. Prohibited Conduct</Text>
        <Text style={styles.body}>
          You agree not to:{'\n'}
          • Share your account credentials with others{'\n'}
          • Use the app for any commercial purpose without our consent{'\n'}
          • Attempt to reverse-engineer or extract proprietary question content{'\n'}
          • Post harmful, offensive, or misleading content in community features{'\n'}
          • Misrepresent your identity, credentials, or institutional affiliation{'\n'}
          • Use the app in any way that violates applicable laws or regulations
        </Text>

        <Text style={styles.sectionTitle}>6. Community Features</Text>
        <Text style={styles.body}>
          Clyvara includes community features such as a social feed and anonymous question boards. You are solely responsible for content you post. We reserve the right to remove content that violates these terms or our community guidelines.
        </Text>

        <Text style={styles.sectionTitle}>7. Teaching Assistant Services</Text>
        <Text style={styles.body}>
          Clyvara facilitates connections between students and teaching assistants. Teaching assistants are independent users, not employees of Clyvara. We do not guarantee the availability, quality, or accuracy of information provided by teaching assistants.
        </Text>

        <Text style={styles.sectionTitle}>8. Intellectual Property</Text>
        <Text style={styles.body}>
          All content, features, and functionality of Clyvara, including but not limited to question databases, AI models, and interface design, are owned by Clyvara and are protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.
        </Text>

        <Text style={styles.sectionTitle}>9. Disclaimers and Limitation of Liability</Text>
        <Text style={styles.body}>
          CLYVARA IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT CONTENT WILL BE ACCURATE OR COMPLETE.{'\n\n'}
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, CLYVARA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE APP.
        </Text>

        <Text style={styles.sectionTitle}>10. Termination</Text>
        <Text style={styles.body}>
          We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other reason at our sole discretion. You may delete your account at any time through the app settings.
        </Text>

        <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
        <Text style={styles.body}>
          We may update these Terms of Service from time to time. We will notify you of material changes through the app. Continued use of the app after changes constitutes acceptance of the updated terms.
        </Text>

        <Text style={styles.sectionTitle}>12. Contact</Text>
        <Text style={styles.body}>
          For questions about these Terms of Service, please contact us at support@clyvara.com.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EEF3',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginTop: 24,
    marginBottom: 4,
  },
  body: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 24,
  },
});
