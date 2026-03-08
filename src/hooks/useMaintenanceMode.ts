import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const useMaintenanceMode = () => {
  const { profile } = useAuth();
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Protected numeric IDs that can bypass maintenance
  const BYPASS_IDS = [1, 5];

  const canBypass = profile && BYPASS_IDS.includes(profile.numeric_id);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();

      if (data) {
        setIsMaintenanceMode((data.value as any)?.enabled === true);
      }
      setIsLoading(false);
    };

    fetchStatus();

    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    isMaintenanceMode: isMaintenanceMode && !canBypass,
    isMaintenanceModeRaw: isMaintenanceMode,
    isLoading,
  };
};
