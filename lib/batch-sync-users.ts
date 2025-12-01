import { supabase } from './supabase';
import { MLBackendClient } from './ml-backend-client';

/**
 * Utility for batch syncing existing users to ML backend
 * Use this for migrating existing users who were created before auto-sync was implemented
 */
export class BatchUserSyncManager {
  private mlClient: MLBackendClient;

  constructor() {
    this.mlClient = new MLBackendClient();
  }

  /**
   * Fetch all users who haven't been synced to ML backend yet
   */
  async getUnsyncedUsers(): Promise<any[]> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .is('ml_user_id', null)
      .not('enrollment_date', 'is', null)
      .not('institution', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch unsynced users: ${error.message}`);
    }

    return profiles || [];
  }

  /**
   * Get sync status for all users
   */
  async getSyncStatus(): Promise<{
    total: number;
    synced: number;
    unsynced: number;
    pending: number;
    failed: number;
  }> {
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('id, ml_user_id')
      .not('enrollment_date', 'is', null)
      .not('institution', 'is', null);

    if (allError) {
      throw new Error(`Failed to get sync status: ${allError.message}`);
    }

    const { data: syncStatuses, error: syncError } = await supabase
      .from('ml_sync_status')
      .select('sync_status');

    if (syncError) {
      throw new Error(`Failed to get sync statuses: ${syncError.message}`);
    }

    const total = allProfiles?.length || 0;
    const synced = allProfiles?.filter((p) => p.ml_user_id !== null).length || 0;
    const unsynced = total - synced;

    const pending =
      syncStatuses?.filter((s) => s.sync_status === 'pending').length || 0;
    const failed =
      syncStatuses?.filter((s) => s.sync_status === 'failed').length || 0;

    return { total, synced, unsynced, pending, failed };
  }

  /**
   * Batch sync users to ML backend
   * @param batchSize - Number of users to sync in each batch (default: 50)
   */
  async syncAllUsers(
    batchSize: number = 50,
    onProgress?: (progress: {
      processed: number;
      total: number;
      successful: number;
      failed: number;
    }) => void
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: Array<{ userId: string; error: string }>;
  }> {
    const unsyncedUsers = await this.getUnsyncedUsers();

    if (unsyncedUsers.length === 0) {
      return { total: 0, successful: 0, failed: 0, errors: [] };
    }

    const results = {
      total: unsyncedUsers.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ userId: string; error: string }>,
    };

    for (let i = 0; i < unsyncedUsers.length; i += batchSize) {
      const batch = unsyncedUsers.slice(i, i + batchSize);

      const usersToSync = batch.map((profile) => ({
        external_user_id: profile.id,
        email: profile.full_name + '@example.com',
        username: profile.full_name.replace(/\s+/g, '_').toLowerCase(),
        enrollment_date: profile.enrollment_date,
        program_name: profile.program_name || 'Nurse Anesthesia Program',
        institution: profile.institution,
        expected_graduation: profile.expected_graduation || undefined,
      }));

      try {
        const syncResult = await this.mlClient.batchSyncUsers(usersToSync);

        for (const user of batch) {
          const userError = syncResult.errors.find(
            (e) => e.external_user_id === user.id
          );

          if (userError) {
            results.failed++;
            results.errors.push({
              userId: user.id,
              error: userError.error,
            });

            await supabase.from('ml_sync_status').upsert(
              {
                user_id: user.id,
                sync_status: 'failed',
                last_sync_error: userError.error,
              },
              { onConflict: 'user_id' }
            );
          } else {
            results.successful++;

            await supabase.from('ml_sync_status').upsert(
              {
                user_id: user.id,
                sync_status: 'active',
                last_sync_at: new Date().toISOString(),
                last_sync_error: null,
              },
              { onConflict: 'user_id' }
            );
          }
        }

        if (onProgress) {
          onProgress({
            processed: Math.min(i + batchSize, unsyncedUsers.length),
            total: unsyncedUsers.length,
            successful: results.successful,
            failed: results.failed,
          });
        }

        await this.delay(1000);
      } catch (error) {
        console.error(`Batch sync failed for batch starting at ${i}:`, error);

        for (const user of batch) {
          results.failed++;
          results.errors.push({
            userId: user.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        if (onProgress) {
          onProgress({
            processed: Math.min(i + batchSize, unsyncedUsers.length),
            total: unsyncedUsers.length,
            successful: results.successful,
            failed: results.failed,
          });
        }
      }
    }

    return results;
  }

  /**
   * Retry syncing users who previously failed
   */
  async retryFailedSyncs(): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: Array<{ userId: string; error: string }>;
  }> {
    const { data: failedSyncs, error } = await supabase
      .from('ml_sync_status')
      .select('user_id')
      .eq('sync_status', 'failed');

    if (error) {
      throw new Error(`Failed to get failed syncs: ${error.message}`);
    }

    if (!failedSyncs || failedSyncs.length === 0) {
      return { total: 0, successful: 0, failed: 0, errors: [] };
    }

    const userIds = failedSyncs.map((s) => s.user_id);

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    if (profileError) {
      throw new Error(`Failed to fetch profiles: ${profileError.message}`);
    }

    const results = {
      total: profiles?.length || 0,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ userId: string; error: string }>,
    };

    for (const profile of profiles || []) {
      try {
        await this.mlClient.syncUser({
          external_user_id: profile.id,
          email: profile.full_name + '@example.com',
          username: profile.full_name.replace(/\s+/g, '_').toLowerCase(),
          enrollment_date: profile.enrollment_date,
          program_name: profile.program_name || 'Nurse Anesthesia Program',
          institution: profile.institution,
          expected_graduation: profile.expected_graduation || undefined,
        });

        results.successful++;

        await supabase.from('ml_sync_status').upsert(
          {
            user_id: profile.id,
            sync_status: 'active',
            last_sync_at: new Date().toISOString(),
            last_sync_error: null,
          },
          { onConflict: 'user_id' }
        );

        await this.delay(500);
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId: profile.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        await supabase.from('ml_sync_status').update({
          last_sync_error:
            error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const batchUserSyncManager = new BatchUserSyncManager();
