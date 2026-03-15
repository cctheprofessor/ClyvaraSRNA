import { View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { FileText, Clock, Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';

interface CarePlan {
  id: string;
  care_plan_data: {
    patient: {
      age: number;
      weightKg: number;
    };
    procedure: {
      primaryProcedure: string;
    };
  };
  created_at: string;
}

export default function PlanScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [recentPlans, setRecentPlans] = useState<CarePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentPlans();
  }, []);

  const loadRecentPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('comprehensive_care_plans')
        .select('id, care_plan_data, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentPlans(data || []);
    } catch (error) {
      console.error('Error loading recent plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      if (diffInHours < 1) return 'Just now';
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) return `${diffInDays}d ago`;
      return date.toLocaleDateString();
    }
  };

  const handleDeletePlan = async (planId: string, procedureName: string) => {
    Alert.alert(
      'Delete Care Plan',
      `Are you sure you want to delete "${procedureName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data, error } = await supabase
                .from('comprehensive_care_plans')
                .delete()
                .eq('id', planId)
                .select();

              if (error) throw error;

              setRecentPlans((prev) => prev.filter((plan) => plan.id !== planId));
            } catch (error: any) {
              console.error('Error deleting plan:', error);
              Alert.alert('Error', error?.message || 'Failed to delete care plan. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <PageHeader
        title="Anesthesia Care Plan"
        subtitle="Efficient x Comprehensive"
      />

      <View style={styles.content}>
        <Pressable
          style={styles.createButton}
          onPress={() => router.push('/anesthesia-care-plan')}
        >
          <Plus color={Colors.text.light} size={24} />
          <Text style={styles.createButtonText}>Create New Care Plan</Text>
        </Pressable>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock color={Colors.text.secondary} size={20} />
            <Text style={styles.sectionTitle}>Recent Care Plans</Text>
          </View>

          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading...</Text>
            </View>
          ) : recentPlans.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText color={Colors.text.tertiary} size={48} />
              <Text style={styles.emptyStateTitle}>No Care Plans Yet</Text>
              <Text style={styles.emptyStateText}>
                Create your first anesthesia care plan to get started
              </Text>
            </View>
          ) : (
            <View style={styles.plansList}>
              {recentPlans.map((plan) => (
                <View key={plan.id} style={styles.planCardWrapper}>
                  <Pressable
                    style={styles.planCard}
                    onPress={() => router.push(`/care-plan/comprehensive/${plan.id}`)}
                  >
                    <View style={styles.planIcon}>
                      <FileText color={Colors.primary} size={24} />
                    </View>
                    <View style={styles.planDetails}>
                      <Text style={styles.planTitle}>
                        {plan.care_plan_data.procedure.primaryProcedure}
                      </Text>
                      <Text style={styles.planInfo}>
                        Age: {plan.care_plan_data.patient.age}y • Weight: {plan.care_plan_data.patient.weightKg}kg
                      </Text>
                      <Text style={styles.planDate}>{formatDate(plan.created_at)}</Text>
                    </View>
                  </Pressable>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      console.log('Delete button pressed for plan:', plan.id);
                      handleDeletePlan(plan.id, plan.care_plan_data.procedure.primaryProcedure);
                    }}
                    activeOpacity={0.7}
                  >
                    <Trash2 color={Colors.error} size={20} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>Educational Use Only</Text>
          <Text style={styles.disclaimerText}>
            These care plans support learning and should not replace professional medical judgment or clinical guidelines.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  createButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.light,
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  plansList: {
    gap: Spacing.sm,
  },
  planCardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  planCard: {
    flex: 1,
    backgroundColor: Colors.background,
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planDetails: {
    flex: 1,
    gap: 4,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  planInfo: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  planDate: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  disclaimerCard: {
    backgroundColor: Colors.secondaryLight + '50',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 4,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
});
