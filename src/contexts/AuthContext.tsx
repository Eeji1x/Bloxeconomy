import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, checkIsAdmin, getProfile, updateOnlineStatus } from '@/lib/supabase';

const checkIsEconomyManager = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'economy_manager')
    .maybeSingle();
  return !error && data !== null;
};

const checkIsOwner = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .maybeSingle();
  return !error && data !== null;
};

interface Profile {
  id: string;
  user_id: string;
  username: string;
  numeric_id: number;
  emeralds: number;
  avatar_data: Record<string, unknown>;
  is_online: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  banned_by: string | null;
  banned_at: string | null;
  last_seen: string;
  created_at: string;
  updated_at: string;
  is_verified: boolean | null;
  last_daily_claim: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isOwner: boolean;
  isEconomyManager: boolean;
  isLoading: boolean;
  signUp: (username: string, password: string, inviteKey: string) => Promise<{ error: Error | null }>;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isEconomyManager, setIsEconomyManager] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      const profileData = await getProfile(user.id);
      if (profileData) {
        setProfile(profileData as Profile);
        // Note: We do NOT auto-logout banned users anymore
        // BanRedirectWrapper handles redirecting them to /banned
      }
      
      const adminStatus = await checkIsAdmin(user.id);
      setIsAdmin(adminStatus);
      const ownerStatus = await checkIsOwner(user.id);
      setIsOwner(ownerStatus);
      const econStatus = await checkIsEconomyManager(user.id);
      setIsEconomyManager(econStatus);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Use setTimeout to avoid potential race conditions
        setTimeout(async () => {
          try {
            const profileData = await getProfile(session.user.id);
            if (profileData) {
              setProfile(profileData as Profile);
              // Note: We do NOT auto-logout banned users anymore
              // BanRedirectWrapper handles redirecting them to /banned
              
              // Only update online status if not banned
              if (!profileData.is_banned) {
                await updateOnlineStatus(session.user.id, true);
              }
            }
            
            const adminStatus = await checkIsAdmin(session.user.id);
            setIsAdmin(adminStatus);
            const ownerStatus = await checkIsOwner(session.user.id);
            setIsOwner(ownerStatus);
            const econStatus = await checkIsEconomyManager(session.user.id);
            setIsEconomyManager(econStatus);
          } catch (error) {
            console.error('Error in auth state change:', error);
          }
          setIsLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsOwner(false);
        setIsEconomyManager(false);
        setIsLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setIsLoading(false);
      }
      // The onAuthStateChange listener will handle the rest
    });

    // Cleanup: Set offline when leaving
    const handleBeforeUnload = () => {
      if (user) {
        // Use beacon API for reliable offline status
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}`,
          JSON.stringify({ is_online: false })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const signUp = async (username: string, password: string, inviteKey: string) => {
    try {
      // Validate invite key first
      const inviteResponse = await supabase.functions.invoke('validate-invite-key', {
        body: { invite_key: inviteKey },
      });

      if (inviteResponse.error) {
        throw new Error('Invite key validation failed');
      }

      if (!inviteResponse.data?.valid) {
        throw new Error(inviteResponse.data?.message || 'Invalid or already used invite key.');
      }

      // Validate username server-side before creating auth user
      const validationResponse = await supabase.functions.invoke('validate-username', {
        body: { username },
      });

      if (validationResponse.error) {
        throw new Error(validationResponse.error.message || 'Username validation failed');
      }

      if (!validationResponse.data?.valid) {
        throw new Error(validationResponse.data?.message || 'Username is not allowed');
      }

      // If profanity was detected, use the server-generated random name
      const finalUsername = validationResponse.data?.replaced
        ? validationResponse.data.username
        : username;

      // Create email from username
      const email = `${finalUsername.toLowerCase()}@sodablox.local`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            username: finalUsername,
          });

        if (profileError) throw profileError;

        // Mark invite key as used
        await supabase.functions.invoke('validate-invite-key', {
          body: { invite_key: inviteKey, user_id: data.user.id },
        });
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      const email = `${username.toLowerCase()}@sodablox.local`;
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    if (user) {
      await updateOnlineStatus(user.id, false);
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setIsOwner(false);
    setIsEconomyManager(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isEconomyManager,
        isLoading,
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
