import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const MaintenancePanel = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single();

    if (data) {
      setEnabled((data.value as any)?.enabled === true);
    }
    setLoading(false);
  };

  const toggleMaintenance = async (newValue: boolean) => {
    const { error } = await supabase
      .from('site_settings')
      .update({ value: { enabled: newValue }, updated_at: new Date().toISOString() })
      .eq('key', 'maintenance_mode');

    if (error) {
      toast.error('Failed to update maintenance mode');
    } else {
      setEnabled(newValue);
      toast.success(newValue ? 'Maintenance mode ENABLED' : 'Maintenance mode DISABLED');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-xl">Maintenance Mode</h2>

      <div className="p-6 bg-muted/30 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-6 h-6 ${enabled ? 'text-destructive' : 'text-muted-foreground'}`} />
            <div>
              <Label className="text-base font-bold">Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                {enabled
                  ? 'Site is currently OFFLINE for all users except Admin (ID #1) and BadDecisions (ID #5).'
                  : 'Site is currently accessible to all users.'}
              </p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={toggleMaintenance} />
        </div>

        {enabled && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
            ⚠️ All normal users are blocked from accessing the site right now.
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenancePanel;
