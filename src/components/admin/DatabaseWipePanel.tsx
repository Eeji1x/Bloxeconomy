import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const CONFIRM_TEXT = 'CONFIRM WIPE';

const DatabaseWipePanel = () => {
  const { profile } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [wiping, setWiping] = useState(false);

  // Only User ID #1 can use this
  if (!profile || profile.numeric_id !== 1) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Only the permanent admin (ID #1) can access the database wipe.</p>
      </div>
    );
  }

  const handleWipe = async () => {
    if (confirmInput !== CONFIRM_TEXT) return;

    setWiping(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('admin-wipe-database', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Wipe failed');
      }

      const result = response.data;
      if (result?.error) {
        throw new Error(result.error);
      }

      toast.success('Database successfully wiped. All usernames freed. IDs will restart properly.');
      setShowDialog(false);
      setConfirmInput('');
    } catch (error: any) {
      console.error('Wipe error:', error);
      toast.error(error.message || 'Database wipe failed.');
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-8 space-y-4">
        <AlertTriangle className="w-16 h-16 mx-auto text-destructive" />
        <h2 className="text-2xl font-display font-bold text-destructive">Danger Zone</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          This will permanently delete ALL users (except admin &amp; BadDecisions), items, trades, listings, friends, emeralds, inventory, and auth accounts. Usernames will be freed for reuse. IDs will restart from 2.
        </p>
        <Button
          variant="destructive"
          size="lg"
          className="mt-4 text-lg px-8 py-6"
          onClick={() => setShowDialog(true)}
        >
          <Trash2 className="w-6 h-6 mr-2" />
          FULL DATABASE WIPE
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirm Full Database Wipe
            </DialogTitle>
            <DialogDescription>
              This will permanently delete ALL users, auth accounts, items, trades, listings, friends, emeralds, and inventory data. Usernames will be freed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm">
              Type <strong className="text-destructive">{CONFIRM_TEXT}</strong> to proceed:
            </p>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={CONFIRM_TEXT}
              className="font-mono"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setConfirmInput(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleWipe}
              disabled={confirmInput !== CONFIRM_TEXT || wiping}
            >
              {wiping ? 'Wiping...' : 'Wipe Everything'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DatabaseWipePanel;
