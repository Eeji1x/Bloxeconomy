import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const useMaintenanceMode = () => {
  const { profile } = useAuth();
  // Maintenance mode disabled globally per project decision
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Protected numeric IDs that can bypass maintenance
  const BYPASS_IDS = [1, 5];

  const canBypass = profile && BYPASS_IDS.includes(profile.numeric_id);

  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      setIsLoading(true);

      // Timeout guard: if request hangs, keep maintenance enabled
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('maintenance status timeout')), 5000);
      });

      try {
        const request = supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'maintenance_mode')
          .single();

        const { data, error } = await Promise.race([request, timeout]);

        if (cancelled) return;

        if (error || !data || typeof data.value !== 'object') {
          setIsMaintenanceMode(true);
          return;
        }

        const value = data.value as Record<string, unknown>;
        setIsMaintenanceMode(typeof value.enabled === 'boolean' ? value.enabled : true);
      } catch {
        if (!cancelled) {
          setIsMaintenanceMode(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchStatus();

    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return {
    isMaintenanceMode: isMaintenanceMode && !canBypass,
    isMaintenanceModeRaw: isMaintenanceMode,
    isLoading,
  };
};
