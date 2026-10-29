'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  role: 'user' | 'admin';
  created_at: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchProfile = async (userId: string, fallbackUser?: User | null) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as UserProfile);
        return;
      }

      // Fallback: If no profile row exists, write directly to database
      const targetUser = fallbackUser || user;
      const userName = targetUser?.user_metadata?.name || targetUser?.email?.split('@')[0] || 'User';
      const userEmail = targetUser?.email || null;
      const userRole = (targetUser?.user_metadata?.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user';

      const { data: newProfile } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          name: userName,
          email: userEmail,
          role: userRole,
        }, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (newProfile) {
        setProfile(newProfile as UserProfile);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user);
      }
      setLoading(false);
    });

    // Listen to real-time auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id, session.user);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (name: string, email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
            role: 'user', // Always user role for user-app signups
          },
        },
      });

      if (error) return { error };

      if (data.user) {
        setUser(data.user);
        // Explicitly write to database public.profiles
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            name: name.trim(),
            email: email.trim(),
            role: 'user',
          }, { onConflict: 'id' });
        } catch (e) {
          console.warn('Profile direct sync note:', e);
        }
        await fetchProfile(data.user.id, data.user);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };

      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id, data.user);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
