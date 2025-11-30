import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import {
  FileText,
  Calculator,
  Syringe,
  Heart,
  Baby,
  Brain,
  Activity,
  Droplet,
} from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';

export default function ToolsScreen() {
  const router = useRouter();

  const categories = [
    {
      title: 'Drug Calculators',
      tools: [
        {
          id: 'emergency',
          title: 'Emergency Drugs',
          description: 'ACLS medication dosing',
          icon: Heart,
          color: Colors.primary,
          route: '/tools/emergency-drugs',
        },
        {
          id: 'anesthesia',
          title: 'Anesthesia Drugs',
          description: 'Induction & maintenance agents',
          icon: Syringe,
          color: Colors.primaryDark,
          route: '/tools/anesthesia-drugs',
        },
        {
          id: 'pediatric',
          title: 'Pediatric Dosing',
          description: 'Weight-based calculations',
          icon: Baby,
          color: Colors.primaryLight,
          route: '/tools/pediatric-drugs',
        },
        {
          id: 'infusion',
          title: 'Infusion Rates',
          description: 'IV drip calculations',
          icon: Droplet,
          color: Colors.secondaryDark,
          route: '/tools/infusion-rates',
        },
      ],
    },
    {
      title: 'Clinical Scoring',
      tools: [
        {
          id: 'gcs',
          title: 'Glasgow Coma Scale',
          description: 'Neurological assessment',
          icon: Brain,
          color: Colors.secondaryLight,
          route: '/tools/gcs',
        },
        {
          id: 'apgar',
          title: 'APGAR Score',
          description: 'Newborn assessment',
          icon: Baby,
          color: Colors.primary,
          route: '/tools/apgar',
        },
        {
          id: 'scores',
          title: 'More Clinical Scores',
          description: 'ASA, SOFA, RASS',
          icon: Activity,
          color: Colors.secondary,
          route: '/tools/clinical-scores',
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <PageHeader
        title="Clinical Tools"
        subtitle="Calculators x Scoring Systems"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {categories.map((category, catIndex) => (
          <View key={catIndex} style={styles.category}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <View style={styles.toolsGrid}>
              {category.tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Pressable
                    key={tool.id}
                    style={styles.toolCard}
                    onPress={() => router.push(tool.route as any)}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: tool.color }]}>
                      <Icon color="#ffffff" size={28} />
                    </View>
                    <View style={styles.toolInfo}>
                      <Text style={styles.toolTitle}>{tool.title}</Text>
                      <Text style={styles.toolDescription}>{tool.description}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  category: {
    gap: 12,
  },
  categoryTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  toolsGrid: {
    gap: 12,
  },
  toolCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolInfo: {
    flex: 1,
  },
  toolTitle: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
});
