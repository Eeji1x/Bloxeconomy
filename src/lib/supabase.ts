import { supabase } from "@/integrations/supabase/client";

export { supabase };

// Helper to check if user is admin
export const checkIsAdmin = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  
  return !error && data !== null;
};

// Helper to get user profile
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

// Helper to update online status
export const updateOnlineStatus = async (userId: string, isOnline: boolean) => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_online: isOnline, last_seen: new Date().toISOString() })
    .eq('user_id', userId);
  
  if (error) console.error('Error updating online status:', error);
};
