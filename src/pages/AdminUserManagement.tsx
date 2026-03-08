import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { 
  BAD_DECISIONS_NUMERIC_ID, PROTECTED_USER_IDS, BANNED_USERNAME_PREFIX, DEFAULT_AVATAR_URL,
  SUPER_OWNER_NUMERIC_ID
} from '@/lib/constants';
import { isProtectedUser } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  ChevronLeft, Shield, Ban, UserCheck, Lock, Unlock, KeyRound, RefreshCw,
  Edit, FileText, Gem, Eye, Package, Trash2, EyeOff, RotateCcw,
  ArrowLeftRight, Store, User, Calendar, Clock, Hash, Crown
} from 'lucide-react';

interface UserProfile {
  user_id: string;
  username: string;
  numeric_id: number;
  emeralds: number;
  is_banned: boolean | null;
  ban_reason: string | null;
  banned_at: string | null;
  is_online: boolean | null;
  is_verified: boolean | null;
  avatar_data: any;
  created_at: string;
  last_seen: string | null;
}

interface InventoryItem {
  id: string;
  item_id: string;
  quantity: number;
  is_equipped: boolean | null;
  catalog_items: { name: string; price: number; item_type: string; image_url: string } | null;
}

interface RoleInfo {
  isAdmin: boolean;
  isOwner: boolean;
  isEconomyManager: boolean;
}

const AdminUserManagement = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: authUser, isAdmin, isLoading: authLoading, profile: authProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [targetRoles, setTargetRoles] = useState<RoleInfo>({ isAdmin: false, isOwner: false, isEconomyManager: false });
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inviteKey, setInviteKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInventory, setShowInventory] = useState(false);
  const [emeraldInput, setEmeraldInput] = useState('');
  const [banReasonInput, setBanReasonInput] = useState('');

  const isSuperOwner = authProfile?.numeric_id === SUPER_OWNER_NUMERIC_ID;
  const isProtected = profile && PROTECTED_USER_IDS.includes(profile.numeric_id) && !isSuperOwner;
  const isOwnerAccount = profile && (profile.numeric_id === SUPER_OWNER_NUMERIC_ID);

  useEffect(() => {
    if (userId && authUser && isAdmin) fetchAll();
  }, [userId, authUser, isAdmin]);

  const fetchAll = async () => {
    setLoading(true);
    const [profileRes, rolesRes, invRes, invKeyRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId!).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId!),
      supabase.from('user_inventory').select('id, item_id, quantity, is_equipped, catalog_items!inner(name, price, item_type, image_url)').eq('user_id', userId!),
      supabase.from('invite_keys').select('key').eq('used_by', userId!).maybeSingle(),
    ]);
    if (profileRes.data) setProfile(profileRes.data as UserProfile);
    
    const roles = rolesRes.data || [];
    setTargetRoles({
      isAdmin: roles.some((r: any) => r.role === 'admin'),
      isOwner: roles.some((r: any) => r.role === 'owner'),
      isEconomyManager: roles.some((r: any) => r.role === 'economy_manager'),
    });
    
    if (invRes.data) setInventory(invRes.data as unknown as InventoryItem[]);
    setInviteKey(invKeyRes.data?.key || null);
    setLoading(false);
  };

  const logAction = async (action: string, details?: Record<string, unknown>) => {
    await supabase.from('admin_logs').insert([{
      admin_id: authUser!.id,
      action,
      target_user_id: userId!,
      details: (details || {}) as any,
    }]);
  };

  const checkProtection = async (): Promise<boolean> => {
    const result = await isProtectedUser(userId!, authUser!.id);
    if (result.protected) {
      toast.error(result.reason || 'Only the site owner can manage this account.');
      return true;
    }
    return false;
  };

  // --- Permission handlers ---
  const handleToggleAdmin = async () => {
    if (await checkProtection()) return;
    
    if (targetRoles.isAdmin) {
      await supabase.from('user_roles').delete().eq('user_id', userId!).eq('role', 'admin');
      await logAction('remove_admin');
      toast.success('Admin role removed');
    } else {
      await supabase.from('user_roles').insert({ user_id: userId!, role: 'admin' });
      await logAction('grant_admin');
      toast.success('Admin role granted');
    }
    fetchAll();
  };

  const handleToggleOwner = async () => {
    if (!isSuperOwner) {
      toast.error('Only SODABLOX (ID #1) can grant/remove the Owner role.');
      return;
    }
    if (await checkProtection()) return;

    if (targetRoles.isOwner) {
      await supabase.from('user_roles').delete().eq('user_id', userId!).eq('role', 'owner');
      await logAction('remove_owner');
      toast.success('Owner role removed');
    } else {
      await supabase.from('user_roles').insert({ user_id: userId!, role: 'owner' });
      await logAction('grant_owner');
      toast.success('Owner role granted');
    }
    fetchAll();
  };

  const handleToggleEconomyManager = async () => {
    if (await checkProtection()) return;
    
    if (targetRoles.isEconomyManager) {
      await supabase.from('user_roles').delete().eq('user_id', userId!).eq('role', 'economy_manager');
      await logAction('remove_economy_manager');
      toast.success('Economy Manager role removed');
    } else {
      await supabase.from('user_roles').insert({ user_id: userId!, role: 'economy_manager' });
      await logAction('grant_economy_manager');
      toast.success('Economy Manager role granted');
    }
    fetchAll();
  };

  // --- Action handlers ---
  const handleBan = async () => {
    if (!profile) return;
    if (authUser?.id === userId) {
      toast.error('You cannot ban yourself.');
      return;
    }
    if (await checkProtection()) return;
    if (PROTECTED_USER_IDS.includes(profile.numeric_id) && !isSuperOwner) {
      toast.error('Only the site owner can manage this account.');
      return;
    }

    const reason = banReasonInput || 'Banned by admin';
    const updates: any = {
      is_banned: true, ban_reason: reason, banned_at: new Date().toISOString(),
      banned_by: authUser!.id, username: `${BANNED_USERNAME_PREFIX}${profile.numeric_id}`,
    };

    const { data: bdProfile } = await supabase.from('profiles').select('user_id').eq('numeric_id', BAD_DECISIONS_NUMERIC_ID).maybeSingle();
    const systemUserId = bdProfile?.user_id || '00000000-0000-0000-0000-000000000000';

    const { data: userItems } = await supabase.from('user_inventory').select('id, item_id, catalog_items!inner(item_type)').eq('user_id', userId!);
    if (userItems) {
      const limitedIds = userItems.filter((i: any) => i.catalog_items?.item_type === 'limited').map((i: any) => i.id);
      if (limitedIds.length > 0) {
        await supabase.from('user_inventory').update({ user_id: systemUserId, is_equipped: false }).in('id', limitedIds);
        await supabase.from('item_serials').update({ owner_id: systemUserId }).in('inventory_id', limitedIds);
      }
    }

    await supabase.from('resale_listings').delete().eq('seller_id', userId!);
    await supabase.from('trades').update({ status: 'cancelled' }).eq('status', 'pending').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    await supabase.from('profiles').update(updates).eq('user_id', userId!);
    await logAction('ban_user', { reason });
    toast.success('User banned'); setBanReasonInput(''); fetchAll();
  };

  const handleUnban = async () => {
    if (!profile) return;
    await supabase.from('profiles').update({ is_banned: false, ban_reason: null, banned_at: null, banned_by: null }).eq('user_id', userId!);
    await logAction('unban_user');
    toast.success('User unbanned (items not returned)'); fetchAll();
  };

  const handleGiveEmeralds = async (amount: number) => {
    if (!profile) return;
    const newTotal = Math.max(0, profile.emeralds + amount);
    await supabase.from('profiles').update({ emeralds: newTotal }).eq('user_id', userId!);
    await logAction(amount > 0 ? 'give_emeralds' : 'remove_emeralds', { amount, new_total: newTotal });
    toast.success(`${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} emeralds`); setEmeraldInput(''); fetchAll();
  };

  const handleResetAvatar = async () => {
    if (!profile) return;
    await supabase.from('profiles').update({ avatar_data: {} }).eq('user_id', userId!);
    await supabase.from('user_inventory').update({ is_equipped: false }).eq('user_id', userId!);
    await logAction('reset_avatar'); toast.success('Avatar reset'); fetchAll();
  };

  const handleResetUsername = async () => {
    if (!profile) return;
    const newName = `User_${profile.numeric_id}`;
    await supabase.from('profiles').update({ username: newName }).eq('user_id', userId!);
    await logAction('reset_username', { old: profile.username, new: newName });
    toast.success(`Username reset to ${newName}`); fetchAll();
  };

  const handleClearTrades = async () => {
    if (!profile) return;
    await supabase.from('trades').update({ status: 'cancelled' }).eq('status', 'pending').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    await logAction('clear_trades'); toast.success('Pending trades cancelled');
  };

  const handleRemoveListings = async () => {
    if (!profile) return;
    await supabase.from('resale_listings').delete().eq('seller_id', userId!);
    await logAction('remove_listings'); toast.success('Marketplace listings removed');
  };

  const handleRemoveItem = async (invId: string, itemName: string) => {
    const { data: bdProfile } = await supabase.from('profiles').select('user_id').eq('numeric_id', BAD_DECISIONS_NUMERIC_ID).maybeSingle();
    const systemUserId = bdProfile?.user_id || '00000000-0000-0000-0000-000000000000';
    await supabase.from('user_inventory').update({ user_id: systemUserId, is_equipped: false }).eq('id', invId);
    await supabase.from('item_serials').update({ owner_id: systemUserId }).eq('inventory_id', invId);
    await logAction('remove_item', { inventory_id: invId, item_name: itemName });
    toast.success(`Removed ${itemName}`); fetchAll();
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!authUser || !isAdmin) return <Navigate to="/" replace />;
  if (!profile) return <div className="text-center py-20 text-muted-foreground">User not found</div>;

  const inventoryValue = inventory.reduce((sum, i) => sum + (i.catalog_items?.price || 0), 0);
  const canManagePermissions = isSuperOwner || !PROTECTED_USER_IDS.includes(profile.numeric_id);
  const isSelf = authUser?.id === profile.user_id;
  const canBan = !isSelf && (isSuperOwner || (!PROTECTED_USER_IDS.includes(profile.numeric_id)));

  const ConfirmAction = ({ trigger, title, description, onConfirm, variant = 'destructive' }: { trigger: React.ReactNode; title: string; description: string; onConfirm: () => void; variant?: 'destructive' | 'default' }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin">
          <Button variant="ghost" size="icon"><ChevronLeft className="w-5 h-5" /></Button>
        </Link>
        <h1 className="text-2xl font-display font-bold">Manage User</h1>
      </div>

      <div className="grid lg:grid-cols-[350px_1fr] gap-6">
        {/* LEFT PANEL - User Summary */}
        <div className="space-y-4">
          <div className="cyber-card p-6 space-y-4">
            <div className="w-24 h-24 mx-auto rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary/30 overflow-hidden">
              <img src={DEFAULT_AVATAR_URL} alt={profile.username} className="w-full h-full object-cover" />
            </div>

            <div className="text-center">
              <h2 className="text-xl font-display font-bold">{profile.username}</h2>
              <p className="text-sm text-muted-foreground">#{profile.numeric_id}</p>
            </div>

            {/* Role Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {(isOwnerAccount || targetRoles.isOwner) && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  <Crown className="w-3 h-3" /> OWNER
                </span>
              )}
              {targetRoles.isAdmin && (
                <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3" /> ADMIN
                </span>
              )}
              {targetRoles.isEconomyManager && (
                <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  <Gem className="w-3 h-3" /> ECONOMY
                </span>
              )}
              {profile.is_banned ? (
                <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  <Ban className="w-3 h-3" /> Banned
                </span>
              ) : (
                <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> OK
                </span>
              )}
              {profile.is_verified && (
                <img src="/images/verified-badge.png" alt="Verified" className="w-4 h-4" />
              )}
            </div>

            {/* Info rows */}
            <div className="space-y-2 text-sm">
              <InfoRow icon={<Calendar className="w-4 h-4" />} label="Joined" value={new Date(profile.created_at).toLocaleDateString()} />
              <InfoRow icon={<Clock className="w-4 h-4" />} label="Last Online" value={profile.is_online ? 'Now' : (profile.last_seen ? new Date(profile.last_seen).toLocaleString() : 'Never')} />
              <InfoRow icon={<Gem className="w-4 h-4" />} label="Emeralds" value={`💎 ${profile.emeralds.toLocaleString()}`} />
              <InfoRow icon={<Package className="w-4 h-4" />} label="Inv. Value" value={`💎 ${inventoryValue.toLocaleString()}`} />
              <InfoRow icon={<KeyRound className="w-4 h-4" />} label="Invite Key" value={inviteKey || 'Unknown'} />
              {profile.is_banned && profile.ban_reason && (
                <div className="p-2 bg-destructive/10 rounded text-destructive text-xs">
                  <strong>Ban Reason:</strong> {profile.ban_reason}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Action Panels */}
        <div className="space-y-4">
          {/* Permission Controls */}
          <ActionPanel title="Permission Controls" icon={<Shield className="w-5 h-5" />}>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={targetRoles.isOwner ? 'destructive' : 'outline'}
                className="gap-2"
                onClick={handleToggleOwner}
                disabled={!isSuperOwner || isOwnerAccount}
              >
                <Crown className="w-4 h-4" />
                {targetRoles.isOwner ? 'Remove Owner' : 'Grant Owner'}
              </Button>
              <Button
                variant={targetRoles.isAdmin ? 'destructive' : 'outline'}
                className="gap-2"
                onClick={handleToggleAdmin}
                disabled={!canManagePermissions || isOwnerAccount}
              >
                <Shield className="w-4 h-4" />
                {targetRoles.isAdmin ? 'Remove Admin' : 'Grant Admin'}
              </Button>
              <Button
                variant={targetRoles.isEconomyManager ? 'destructive' : 'outline'}
                className="gap-2"
                onClick={handleToggleEconomyManager}
                disabled={!canManagePermissions || isOwnerAccount}
              >
                <Gem className="w-4 h-4" />
                {targetRoles.isEconomyManager ? 'Remove Economy' : 'Grant Economy'}
              </Button>
            </div>
            {!canManagePermissions && !isSuperOwner && (
              <p className="text-xs text-destructive mt-2">Only the site owner can manage this account.</p>
            )}
          </ActionPanel>

          {/* Account Actions */}
          <ActionPanel title="Account Actions" icon={<User className="w-5 h-5" />}>
            <div className="grid grid-cols-2 gap-2">
              {!profile.is_banned ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2" disabled={!canBan}>
                      <Ban className="w-4 h-4" /> Ban User
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Ban {profile.username}?</AlertDialogTitle>
                      <AlertDialogDescription>Limited items will be seized. This cannot be fully reversed.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input placeholder="Ban reason..." value={banReasonInput} onChange={(e) => setBanReasonInput(e.target.value)} className="my-2" />
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Ban</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <ConfirmAction
                  trigger={<Button variant="default" className="gap-2"><UserCheck className="w-4 h-4" /> Unban User</Button>}
                  title={`Unban ${profile.username}?`}
                  description="User will regain access. Seized items will NOT be returned."
                  onConfirm={handleUnban}
                  variant="default"
                />
              )}
              <ConfirmAction
                trigger={<Button variant="outline" className="gap-2"><Edit className="w-4 h-4" /> Reset Username</Button>}
                title="Reset Username?"
                description={`Username will be changed to User_${profile.numeric_id}`}
                onConfirm={handleResetUsername}
              />
            </div>
          </ActionPanel>

          {/* Economy Actions */}
          <ActionPanel title="Economy Actions" icon={<Gem className="w-5 h-5" />}>
            <div className="flex items-center gap-2 mb-3">
              <Input type="number" placeholder="Amount" value={emeraldInput} onChange={(e) => setEmeraldInput(e.target.value)} className="flex-1" />
              <Button variant="emerald" onClick={() => handleGiveEmeralds(Math.abs(parseInt(emeraldInput) || 0))} disabled={!emeraldInput} className="gap-1">
                <Gem className="w-4 h-4" /> Give
              </Button>
              <Button variant="destructive" onClick={() => handleGiveEmeralds(-Math.abs(parseInt(emeraldInput) || 0))} disabled={!emeraldInput} className="gap-1">
                <Gem className="w-4 h-4" /> Remove
              </Button>
            </div>
            <Button variant="outline" className="w-full gap-2" onClick={() => setShowInventory(!showInventory)}>
              <Package className="w-4 h-4" /> {showInventory ? 'Hide' : 'Manage'} Inventory ({inventory.length})
            </Button>
            {showInventory && (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {inventory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Empty inventory</p>
                ) : inventory.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                    <div className="w-10 h-10 rounded bg-primary/10 overflow-hidden shrink-0">
                      <img src={item.catalog_items?.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{item.catalog_items?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        💎 {item.catalog_items?.price} • {item.catalog_items?.item_type}
                        {item.is_equipped && ' • Equipped'}
                      </p>
                    </div>
                    <ConfirmAction
                      trigger={<Button size="sm" variant="destructive"><Trash2 className="w-3 h-3" /></Button>}
                      title={`Remove ${item.catalog_items?.name}?`}
                      description="Item will be transferred to BadDecisions."
                      onConfirm={() => handleRemoveItem(item.id, item.catalog_items?.name || 'Unknown')}
                    />
                  </div>
                ))}
              </div>
            )}
          </ActionPanel>

          {/* SODABLOX Actions */}
          <ActionPanel title="SODABLOX Actions" icon={<Shield className="w-5 h-5" />}>
            <div className="grid grid-cols-2 gap-2">
              <ConfirmAction
                trigger={<Button variant="outline" className="gap-2"><RotateCcw className="w-4 h-4" /> Reset Avatar</Button>}
                title="Reset Avatar?"
                description="Avatar will be reset to default."
                onConfirm={handleResetAvatar}
              />
              <ConfirmAction
                trigger={<Button variant="outline" className="gap-2"><ArrowLeftRight className="w-4 h-4" /> Clear Trades</Button>}
                title="Clear Pending Trades?"
                description="All pending trades will be cancelled."
                onConfirm={handleClearTrades}
              />
              <ConfirmAction
                trigger={<Button variant="outline" className="gap-2 col-span-2"><Store className="w-4 h-4" /> Remove Listings</Button>}
                title="Remove Marketplace Listings?"
                description="All active resale listings will be deleted."
                onConfirm={handleRemoveListings}
              />
            </div>
          </ActionPanel>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center justify-between py-1 border-b border-border/30">
    <span className="flex items-center gap-2 text-muted-foreground">{icon} {label}</span>
    <span className="font-mono text-foreground text-xs">{value}</span>
  </div>
);

const ActionPanel = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="cyber-card p-5 space-y-3">
    <h3 className="font-display font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
      {icon} {title}
    </h3>
    {children}
  </div>
);

export default AdminUserManagement;
