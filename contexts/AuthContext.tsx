import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { MLBackendClient } from '@/lib/ml-backend-client';
import { questionCacheService } from '@/lib/question-cache-service';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isTA: boolean;
  signUp: (email: string, password: string, fullName: string, institution: string, enrollmentDate: string, expectedGraduation: string | null, programTrack: string, role: string, specialtyInterest: string, phone: string | null) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'christian.cansino@gmail.com';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTA, setIsTA] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsAdmin(session?.user?.email === ADMIN_EMAIL);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsAdmin(session?.user?.email === ADMIN_EMAIL);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsTA(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string, triggerCache: boolean = true) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
      setIsTA(data?.is_ta ?? false);

      if (triggerCache && data?.ml_user_id) {
        questionCacheService.preFetchOnAppStart(data.ml_user_id);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    institution: string,
    enrollmentDate: string,
    expectedGraduation: string | null,
    programTrack: string,
    role: string,
    specialtyInterest: string,
    phone: string | null
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) return { error };
      if (!data.user) return { error: new Error('No user returned') };

      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const enrollmentDateObj = new Date(enrollmentDate + '-01');
      const cohortYear = enrollmentDateObj.getFullYear();

      let expectedGradDate = expectedGraduation;
      if (!expectedGradDate) {
        const gradDate = new Date(enrollmentDateObj);
        gradDate.setMonth(gradDate.getMonth() + 36);
        expectedGradDate = gradDate.toISOString().substring(0, 7);
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          institution: institution,
          enrollment_date: enrollmentDate + '-01',
          expected_graduation: expectedGradDate + '-01',
          cohort_year: cohortYear,
          program_name: 'Nurse Anesthesia Program',
          program_track: programTrack,
          role: role,
          specialty_interest: specialtyInterest,
          phone: phone,
          is_active: true,
        });

      if (profileError) return { error: profileError };

      try {
        const mlClient = new MLBackendClient();

        const mlData = await mlClient.syncUser({
          external_user_id: data.user.id,
          email: email,
          username: email.split('@')[0],
          enrollment_date: enrollmentDate + '-01',
          program_name: 'Nurse Anesthesia Program',
          institution: institution,
          expected_graduation: expectedGradDate + '-01',
        });

        await supabase
          .from('profiles')
          .update({
            ml_user_id: mlData.user_id,
            ml_last_synced_at: new Date().toISOString(),
          })
          .eq('id', data.user.id);

        await supabase.from('ml_sync_status').insert({
          user_id: data.user.id,
          sync_status: 'active',
          last_sync_at: new Date().toISOString(),
        });

        console.log('Successfully synced new user to ML backend:', mlData.user_id);

        questionCacheService.preFetchAfterSync(mlData.user_id);
      } catch (mlError) {
        console.error('ML sync failed during registration:', mlError);
        await supabase.from('ml_sync_status').insert({
          user_id: data.user.id,
          sync_status: 'pending',
          last_sync_error: mlError instanceof Error ? mlError.message : 'Unknown error',
        });
      }

      await loadProfile(data.user.id);

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data?.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('ml_user_id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileData?.ml_user_id) {
        questionCacheService.preFetchOnLogin(profileData.ml_user_id);
      }
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsTA(false);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    console.log('[AuthContext] Updating profile:', {
      userId: user.id,
      updates: Object.keys(updates),
    });

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select();

    if (error) {
      console.error('[AuthContext] Profile update failed:', error);
      return { error };
    }

    console.log('[AuthContext] Profile updated successfully:', data);
    await loadProfile(user.id, false);

    return { error: null };
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isAdmin,
        isTA,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
