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
import { PROTECTED_USER_IDS } from '@/lib/constants';

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
      // 1. Delete resale listings
      await supabase.from('resale_listings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 2. Delete trades
      await supabase.from('trades').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 3. Delete item serials
      await supabase.from('item_serials').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 4. Delete all inventory
      await supabase.from('user_inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 5. Delete promocode redemptions
      await supabase.from('promocode_redemptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 6. Delete friends
      await supabase.from('friends').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 7. Delete announcements
      await supabase.from('announcements').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 8. Delete promocodes
      await supabase.from('promocodes').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 9. Delete catalog items
      await supabase.from('catalog_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 10. Get protected user_ids (numeric_id 1 and 5)
      const { data: protectedProfiles } = await supabase
        .from('profiles')
        .select('user_id, numeric_id')
        .in('numeric_id', PROTECTED_USER_IDS);

      const protectedUserIds = protectedProfiles?.map(p => p.user_id) || [];

      // 11. Delete non-protected user roles
      if (protectedUserIds.length > 0) {
        // Delete roles for non-protected users
        const { data: allRoles } = await supabase.from('user_roles').select('id, user_id');
        if (allRoles) {
          const toDelete = allRoles.filter(r => !protectedUserIds.includes(r.user_id));
          for (const role of toDelete) {
            await supabase.from('user_roles').delete().eq('id', role.id);
          }
        }
      }

      // 12. Reset protected profiles (emeralds to 0, avatar to default)
      for (const uid of protectedUserIds) {
        await supabase
          .from('profiles')
          .update({ emeralds: 0, avatar_data: {}, is_banned: false, ban_reason: null, banned_at: null, banned_by: null })
          .eq('user_id', uid);
      }

      // 13. Delete ALL non-protected profiles from the database
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('user_id, numeric_id');

      if (allProfiles) {
        const nonProtected = allProfiles.filter(p => !PROTECTED_USER_IDS.includes(p.numeric_id));
        for (const p of nonProtected) {
          await supabase.from('profiles').delete().eq('user_id', p.user_id);
        }
      }

      toast.success('Database successfully wiped.');
      setShowDialog(false);
      setConfirmInput('');
    } catch (error) {
      console.error('Wipe error:', error);
      toast.error('Database wipe failed. Check console for details.');
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
          This will permanently delete ALL users (except admin & BadDecisions), items, trades, listings, friends, emeralds, and inventory data.
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
              This will permanently delete ALL users, items, trades, listings, friends, emeralds, and inventory data. This cannot be undone.
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
