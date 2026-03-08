import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type AppRole = 'admin' | 'economy_manager' | 'user';

export interface UserRoleInfo {
  isAdmin: boolean;
  isEconomyManager: boolean;
  roles: AppRole[];
}

export const useUserRoles = (userId?: string) => {
  const [roleInfo, setRoleInfo] = useState<UserRoleInfo>({
    isAdmin: false,
    isEconomyManager: false,
    roles: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchRoles();
  }, [userId]);

  const fetchRoles = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId!);

    const roles = (data?.map(r => r.role) || []) as AppRole[];
    setRoleInfo({
      isAdmin: roles.includes('admin'),
      isEconomyManager: roles.includes('economy_manager'),
      roles,
    });
    setLoading(false);
  };

  return { ...roleInfo, loading, refetch: fetchRoles };
};

export const getUserNumericId = async (userId: string): Promise<number | null> => {
  const { data } = await supabase
    .from('profiles')
    .select('numeric_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.numeric_id ?? null;
};

export const isProtectedUser = async (targetUserId: string, actingUserId: string): Promise<{ protected: boolean; reason?: string }> => {
  const { SUPER_OWNER_NUMERIC_ID, PROTECTED_USER_IDS } = await import('@/lib/constants');

  const [targetProfile, actingProfile] = await Promise.all([
    supabase.from('profiles').select('numeric_id').eq('user_id', targetUserId).maybeSingle(),
    supabase.from('profiles').select('numeric_id').eq('user_id', actingUserId).maybeSingle(),
  ]);

  const targetNumId = targetProfile.data?.numeric_id;
  const actingNumId = actingProfile.data?.numeric_id;

  // Check if target has protected roles (admin or economy_manager)
  const { data: targetRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', targetUserId);

  const hasProtectedRole = targetRoles?.some(r => r.role === 'admin' || r.role === 'economy_manager');

  // If target is in PROTECTED_USER_IDS or has protected roles
  if (targetNumId && (PROTECTED_USER_IDS.includes(targetNumId) || hasProtectedRole)) {
    // Only Super Owner (ID 5) can manage them
    if (actingNumId !== SUPER_OWNER_NUMERIC_ID) {
      return { protected: true, reason: 'Only the site owner can manage this account.' };
    }
  }

  return { protected: false };
};
