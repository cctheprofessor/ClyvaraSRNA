import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import PageHeader from '@/components/PageHeader';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MLBackendClient } from '@/lib/ml-backend-client';

export default function SyncUserScreen() {
  const { isAdmin } = useAuth();
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <PageHeader title="Unauthorized" onBack={() => router.back()} />
        <Text style={styles.errorText}>Admin access required</Text>
      </View>
    );
  }

  const handleSyncUser = async () => {
    if (!userId.trim()) {
      Alert.alert('Error', 'Please enter a user ID');
      return;
    }

    setLoading(true);
    setResult('');

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId.trim())
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        setResult('❌ User not found');
        return;
      }

      setResult(`Found user: ${profile.full_name}\n\n`);

      if (!profile.institution) {
        setResult((prev) => prev + '❌ Missing required field: institution\n');
        return;
      }

      if (!profile.enrollment_date) {
        setResult((prev) => prev + '❌ Missing required field: enrollment_date\n');
        return;
      }

      if (profile.ml_user_id) {
        setResult((prev) => prev + `✅ Already synced (ML User ID: ${profile.ml_user_id})\n`);
        return;
      }

      setResult((prev) => prev + '🔄 Syncing to ML backend...\n');

      const mlClient = new MLBackendClient();
      const mlData = await mlClient.syncUser({
        external_user_id: profile.id,
        email: profile.full_name + '@example.com',
        username: profile.full_name.replace(/\s+/g, '_').toLowerCase(),
        enrollment_date: profile.enrollment_date,
        program_name: profile.program_name || 'Nurse Anesthesia Program',
        institution: profile.institution,
        expected_graduation: profile.expected_graduation || undefined,
      });

      await supabase
        .from('profiles')
        .update({
          ml_user_id: mlData.user_id,
          ml_last_synced_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      await supabase.from('ml_sync_status').upsert(
        {
          user_id: profile.id,
          sync_status: 'active',
          last_sync_at: new Date().toISOString(),
          last_sync_error: null,
        },
        { onConflict: 'user_id' }
      );

      setResult((prev) => prev + `✅ Successfully synced!\n✅ ML User ID: ${mlData.user_id}\n`);
    } catch (error) {
      console.error('Sync error:', error);
      setResult((prev) => prev + `\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetUserIds = async () => {
    setLoading(true);
    setResult('');

    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, ml_user_id, institution, enrollment_date')
        .ilike('full_name', '%christian%cansino%');

      if (error) throw error;

      if (!profiles || profiles.length === 0) {
        setResult('No users found matching "Christian Cansino"');
        return;
      }

      let output = `Found ${profiles.length} user(s):\n\n`;
      profiles.forEach((p) => {
        output += `Name: ${p.full_name}\n`;
        output += `ID: ${p.id}\n`;
        output += `ML User ID: ${p.ml_user_id || 'Not synced'}\n`;
        output += `Institution: ${p.institution || 'Missing ❌'}\n`;
        output += `Enrollment: ${p.enrollment_date || 'Missing ❌'}\n`;
        output += '\n';
      });

      setResult(output);
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader title="Sync User to ML Backend" onBack={() => router.back()} />

      <ScrollView style={styles.content}>
        <Text style={styles.label}>User ID</Text>
        <TextInput
          style={styles.input}
          value={userId}
          onChangeText={setUserId}
          placeholder="Enter user UUID"
          placeholderTextColor={Colors.text.secondary}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSyncUser}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Syncing...' : 'Sync User'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, loading && styles.buttonDisabled]}
          onPress={handleGetUserIds}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Find Christian Cansino IDs</Text>
        </TouchableOpacity>

        {result ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: BorderRadius.md,
  },
  secondaryButton: {
    backgroundColor: Colors.secondary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultBox: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  resultText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  errorText: {
    color: Colors.error,
    fontSize: 16,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
