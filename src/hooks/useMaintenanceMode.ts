import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const useMaintenanceMode = () => {
  const { profile } = useAuth();
  // Default to TRUE — assume maintenance until server confirms otherwise
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const failCount = useRef(0);

  // Protected numeric IDs that can bypass maintenance
  const BYPASS_IDS = [1, 5];

  const canBypass = profile && BYPASS_IDS.includes(profile.numeric_id);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'maintenance_mode')
          .single();

        if (error || !data || typeof data.value !== 'object') {
          // If fetch fails or data is malformed, assume maintenance ON
          failCount.current++;
          if (failCount.current >= 2) {
            setIsMaintenanceMode(true);
          }
          setIsLoading(false);
          return;
        }

        const value = data.value as Record<string, unknown>;
        // Strict validation: must have enabled as a boolean
        if (typeof value.enabled === 'boolean') {
          setIsMaintenanceMode(value.enabled);
          failCount.current = 0;
        } else {
          setIsMaintenanceMode(true);
        }
      } catch {
        failCount.current++;
        if (failCount.current >= 2) {
          setIsMaintenanceMode(true);
        }
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
