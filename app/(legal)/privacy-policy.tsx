import { View, Text, ScrollView, StyleSheet, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={Colors.text.primary} size={24} />
        </Pressable>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last updated: March 2026</Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.body}>
          We collect information you provide directly to us when you create an account, including your name, email address, institution, program details, and specialty interest. We also collect information about how you use the app, including study session data, practice question responses, and performance analytics.{'\n\n'}
          When you use AI-powered features, we collect the text you enter — such as clinical case descriptions and study preferences — in order to process your request.
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.body}>
          We use the information we collect to provide, maintain, and improve our services, including personalizing your study experience, generating performance analytics, and connecting you with teaching assistants. We do not sell your personal information to third parties.{'\n\n'}
          We also use your information to power AI-generated features, including anesthesia care plan generation and personalized study plans. These features require sending certain data to third-party AI services. Specifically, content generation features send data to OpenAI, Inc. (Section 3), and adaptive practice features send anonymized learning data to Clyvara Analytica (Section 4).
        </Text>

        <Text style={styles.sectionTitle}>3. Third-Party AI Service — OpenAI</Text>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>Data Sent to OpenAI, Inc.</Text>
          <Text style={styles.highlightBody}>
            Two features in this app send data to OpenAI's API (api.openai.com):
          </Text>

          <Text style={styles.subHeading}>Care Plan Generation</Text>
          <Text style={styles.highlightBody}>
            When you generate an anesthesia care plan, the clinical case description you type — which may include patient demographics, procedure type, medical history, medications, allergies, lab values, and other clinical notes — is transmitted to OpenAI to generate a care plan response.{'\n\n'}
            Important: Do not enter real patient names, medical record numbers, or any individually identifying health information. Use anonymized or fictional case details for educational practice only.
          </Text>

          <Text style={styles.subHeading}>Study Plan & Practice Questions</Text>
          <Text style={styles.highlightBody}>
            When you generate a personalized study plan or practice questions, your study preferences — including your exam date, knowledge level, weekly study hours, focus areas, and stated goals — are transmitted to OpenAI to generate study materials.
          </Text>

          <Text style={styles.highlightBody}>
            You will be asked to give explicit consent before either AI feature sends data to OpenAI for the first time. You may decline, in which case the AI feature will not function.
          </Text>

          <Text style={styles.highlightBody}>
            OpenAI's handling of data submitted via their API is governed by OpenAI's API data usage policies. For API usage, OpenAI does not use submitted data to train models by default. Please review{' '}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL('https://openai.com/policies/privacy-policy/')}
            >
              OpenAI's privacy policy
            </Text>
            {' '}for full details.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>4. Our AI Infrastructure — Clyvara Analytica</Text>
        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>Anonymized Data Sent to Clyvara Analytica</Text>
          <Text style={styles.highlightBody}>
            Adaptive practice features are powered by Clyvara Analytica, operated by the Clyvara team. When you use personalized practice questions or adaptive learning, the following anonymized data is transmitted:
          </Text>

          <Text style={styles.subHeading}>What Is Sent</Text>
          <Text style={styles.highlightBody}>
            {'\u2022'} An anonymized user ID (a random UUID — contains no name or email){'\n'}
            {'\u2022'} Accuracy scores per topic{'\n'}
            {'\u2022'} Topic mastery levels{'\n'}
            {'\u2022'} Study session timing patterns
          </Text>

          <Text style={styles.subHeading}>What Is Never Sent</Text>
          <Text style={styles.highlightBody}>
            Your name, email address, institution, enrollment date, and all other personally identifying information are never transmitted to this service.
          </Text>

          <Text style={styles.highlightBody}>
            You will be asked to give explicit consent before any data is transmitted to Clyvara Analytica for the first time. You may decline, in which case adaptive practice features will not activate. You can review our full data policy at clyvarahealth.com/privacy.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>5. Data Sharing — Other Service Providers</Text>
        <Text style={styles.body}>
          In addition to the AI services described above, we share data with Supabase, Inc. for secure database storage and authentication services. These providers are bound by data processing agreements and may only use your data to provide services to us.
        </Text>

        <Text style={styles.sectionTitle}>6. Data Storage and Security</Text>
        <Text style={styles.body}>
          Your account data is stored securely using Supabase's infrastructure with industry-standard encryption. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
        </Text>

        <Text style={styles.sectionTitle}>7. Educational Purpose Disclaimer</Text>
        <Text style={styles.body}>
          Clyvara is designed for educational purposes only. Content generated by our AI systems should not be used as a substitute for professional medical judgment. Always consult qualified healthcare professionals for clinical decisions.
        </Text>

        <Text style={styles.sectionTitle}>8. Your Rights</Text>
        <Text style={styles.body}>
          You have the right to access, correct, or delete your personal information at any time. You may request a copy of your data or ask us to delete your account by contacting us through the app or at support@clyvara.com.
        </Text>

        <Text style={styles.sectionTitle}>9. Cookies and Analytics</Text>
        <Text style={styles.body}>
          We may collect anonymized usage data to improve our services. This data cannot be used to identify individual users and is used solely for product improvement purposes.
        </Text>

        <Text style={styles.sectionTitle}>10. Children's Privacy</Text>
        <Text style={styles.body}>
          Clyvara is intended for use by adults enrolled in or affiliated with nurse anesthesia programs. We do not knowingly collect personal information from individuals under the age of 18.
        </Text>

        <Text style={styles.sectionTitle}>11. Changes to This Policy</Text>
        <Text style={styles.body}>
          We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy in the app. Your continued use of the app after changes constitutes acceptance of the updated policy.
        </Text>

        <Text style={styles.sectionTitle}>12. Contact Us</Text>
        <Text style={styles.body}>
          If you have questions about this Privacy Policy, please contact us at support@clyvara.com.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
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
    color: Colors.text.primary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  lastUpdated: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  body: {
    fontSize: 15,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  highlightBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  highlightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.xs,
  },
  highlightBody: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  link: {
    fontSize: 14,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
