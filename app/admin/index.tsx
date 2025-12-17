import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import PageHeader from '@/components/PageHeader';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Users } from 'lucide-react-native';

export default function AdminDashboard() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <PageHeader title="Unauthorized" onBack={() => router.back()} />
        <Text style={styles.errorText}>Admin access required</Text>
      </View>
    );
  }

  const adminTools = [
    {
      title: 'Feed Prompts',
      description: 'Manage community feed prompts',
      icon: MessageSquare,
      route: '/admin/prompts',
    },
    {
      title: 'Sync User to ML',
      description: 'Manually sync users to ML backend',
      icon: Users,
      route: '/admin/sync-user',
    },
  ];

  return (
    <View style={styles.container}>
      <PageHeader title="Admin Dashboard" onBack={() => router.back()} />

      <ScrollView style={styles.content}>
        <Text style={styles.subtitle}>Admin Tools</Text>

        {adminTools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <TouchableOpacity
              key={index}
              style={styles.toolCard}
              onPress={() => router.push(tool.route as any)}
            >
              <View style={styles.toolIcon}>
                <Icon size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.toolInfo}>
                <Text style={styles.toolTitle}>{tool.title}</Text>
                <Text style={styles.toolDescription}>{tool.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  toolInfo: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});
