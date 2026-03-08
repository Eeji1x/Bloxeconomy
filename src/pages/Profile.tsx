import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, Navigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { UserAvatar } from '@/components/avatar/UserAvatar';
import { User, Calendar, Shield, Package, UserPlus, UserMinus, Check, X, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileData {
  id: string;
  user_id: string;
  username: string;
  numeric_id: number;
  emeralds: number;
  avatar_data: unknown;
  is_online: boolean | null;
  is_banned: boolean | null;
  ban_reason: string | null;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
  is_verified: boolean | null;
  last_daily_claim: string | null;
}

interface InventoryItem {
  id: string;
  item_id: string;
  quantity: number;
  catalog_items: {
    id: string;
    name: string;
    image_url: string;
    item_type: string;
  } | null;
}

const toSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const Profile = () => {
  const { user, profile: currentUserProfile, isAdmin, isLoading: authLoading, refreshProfile } = useAuth();
  const { userId } = useParams<{ userId: string }>();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isProfileAdmin, setIsProfileAdmin] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'accepted'>('none');
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [friendCount, setFriendCount] = useState(0);

  const isOwnProfile = !userId || userId === user?.id || (currentUserProfile && userId === String(currentUserProfile.numeric_id));

  useEffect(() => {
    const resolveUserId = async () => {
      if (!userId) { setResolvedUserId(user?.id || null); return; }
      const numericId = parseInt(userId);
      if (!isNaN(numericId) && String(numericId) === userId) {
        const { data } = await supabase.from('profiles').select('user_id').eq('numeric_id', numericId).maybeSingle();
        setResolvedUserId(data?.user_id || null);
      } else {
        setResolvedUserId(userId);
      }
    };
    resolveUserId();
  }, [userId, user]);

  const viewingUserId = resolvedUserId;

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!viewingUserId) { setIsLoading(false); return; }
      setIsLoading(true);
      const isOwn = viewingUserId === user?.id;
      const publicColumns = 'id,user_id,username,numeric_id,avatar_data,is_online,is_verified,created_at,updated_at';
      const ownColumns = 'id,user_id,username,numeric_id,emeralds,avatar_data,is_online,is_banned,ban_reason,last_seen,created_at,updated_at,is_verified,last_daily_claim';
      const selectColumns = isOwn ? ownColumns : publicColumns;

      const query = isOwn
        ? supabase.from('profiles').select(selectColumns).eq('user_id', viewingUserId).maybeSingle()
        : (supabase as any).from('public_profiles').select(selectColumns).eq('user_id', viewingUserId).maybeSingle();
      const { data: profileResult, error: profileError } = await query;
      if (profileError || !profileResult) { setProfileData(null); setIsLoading(false); return; }

      const safeProfile: ProfileData = isOwn
        ? (profileResult as unknown as ProfileData)
        : { ...(profileResult as unknown as Partial<ProfileData>), emeralds: 0, is_banned: null, ban_reason: null, last_seen: null, last_daily_claim: null } as ProfileData;

      setProfileData(safeProfile);

      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', viewingUserId).eq('role', 'admin').maybeSingle();
      setIsProfileAdmin(!!roleData);

      const { data: inventoryData } = await supabase.from('user_inventory').select(`id, item_id, quantity, catalog_items (id, name, image_url, item_type)`).eq('user_id', viewingUserId);
      if (inventoryData) setInventory(inventoryData as InventoryItem[]);

      // Fetch friend count
      const { count } = await supabase.from('friends').select('id', { count: 'exact', head: true }).eq('status', 'accepted').or(`requester_id.eq.${viewingUserId},addressee_id.eq.${viewingUserId}`);
      setFriendCount(count || 0);

      if (user && viewingUserId !== user.id) await fetchFriendStatus(viewingUserId);
      setIsLoading(false);
    };
    fetchProfileData();
  }, [viewingUserId, user]);

  const fetchFriendStatus = async (targetUserId: string) => {
    if (!user) return;
    const { data: friendship } = await supabase.from('friends').select('id, requester_id, status').or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`).maybeSingle();
    if (friendship) {
      setFriendshipId(friendship.id);
      if (friendship.status === 'accepted') setFriendStatus('accepted');
      else if (friendship.status === 'pending') setFriendStatus(friendship.requester_id === user.id ? 'pending_sent' : 'pending_received');
    } else { setFriendStatus('none'); setFriendshipId(null); }
  };

  const handleSendFriendRequest = async () => {
    if (!user || !viewingUserId || viewingUserId === user.id) return;
    setFriendLoading(true);
    try {
      const { error } = await supabase.from('friends').insert({ requester_id: user.id, addressee_id: viewingUserId, status: 'pending' });
      if (error) throw error;
      toast.success('Friend request sent!');
      await fetchFriendStatus(viewingUserId);
    } catch { toast.error('Failed to send friend request'); }
    finally { setFriendLoading(false); }
  };

  const handleAcceptFriend = async () => {
    if (!friendshipId) return;
    setFriendLoading(true);
    try {
      const { error } = await supabase.from('friends').update({ status: 'accepted' }).eq('id', friendshipId);
      if (error) throw error;
      toast.success('Friend request accepted!');
      setFriendStatus('accepted');
    } catch { toast.error('Failed to accept friend request'); }
    finally { setFriendLoading(false); }
  };

  const handleDeclineFriend = async () => {
    if (!friendshipId) return;
    setFriendLoading(true);
    try {
      const { error } = await supabase.from('friends').delete().eq('id', friendshipId);
      if (error) throw error;
      toast.success('Friend request declined');
      setFriendStatus('none'); setFriendshipId(null);
    } catch { toast.error('Failed to decline friend request'); }
    finally { setFriendLoading(false); }
  };

  const handleRemoveFriend = async () => {
    if (!friendshipId) return;
    setFriendLoading(true);
    try {
      const { error } = await supabase.from('friends').delete().eq('id', friendshipId);
      if (error) throw error;
      toast.success('Friend removed');
      setFriendStatus('none'); setFriendshipId(null);
    } catch { toast.error('Failed to remove friend'); }
    finally { setFriendLoading(false); }
  };

  const handleCancelRequest = async () => {
    if (!friendshipId) return;
    setFriendLoading(true);
    try {
      const { error } = await supabase.from('friends').delete().eq('id', friendshipId);
      if (error) throw error;
      toast.success('Friend request cancelled');
      setFriendStatus('none'); setFriendshipId(null);
    } catch { toast.error('Failed to cancel request'); }
    finally { setFriendLoading(false); }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isOwnProfile && !user) return <Navigate to="/login" replace />;

  if (!profileData) {
    return (
      <div className="text-center py-20">
        <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
        <h2 className="text-xl font-bold text-muted-foreground">User Not Found</h2>
        <p className="text-muted-foreground mt-2">This user doesn't exist or has been removed.</p>
        <Link to="/users" className="mt-4 inline-block text-primary hover:underline text-sm">Browse Users</Link>
      </div>
    );
  }

  const memberSince = new Date(profileData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const limitedItems = inventory.filter(i => i.catalog_items?.item_type === 'limited');

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6 space-y-4">
      {/* Profile Header Card */}
      <div className="bg-card border border-border rounded-md overflow-hidden">
        {/* Header bar */}
        <div className="bg-muted/50 border-b border-border px-4 py-2 flex items-center justify-between">
          <h1 className="text-sm font-bold text-foreground">{profileData.username}'s Profile</h1>
          {isProfileAdmin && (
            <span className="flex items-center gap-1 text-xs font-bold text-destructive">
              <Shield className="w-3 h-3" /> Admin
            </span>
          )}
        </div>

        {/* Profile content */}
        <div className="p-4 md:p-6 flex flex-col sm:flex-row gap-4 md:gap-6">
          {/* Avatar section */}
          <div className="flex-shrink-0 self-center sm:self-start">
            <div className="w-[110px] h-[110px] md:w-[150px] md:h-[150px] border border-border bg-muted/30 rounded-md overflow-hidden relative">
              <UserAvatar userId={viewingUserId!} size="xl" className="w-full h-full" />
              <div
                className={`absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-card ${
                  profileData.is_online ? 'bg-green-500' : 'bg-muted-foreground'
                }`}
              />
            </div>
            <div className="text-center mt-2">
              <span className="text-xs text-muted-foreground">
                {profileData.is_online ? '🟢 Online' : '⚫ Offline'}
              </span>
            </div>
          </div>

          {/* Info section */}
          <div className="flex-1 min-w-0">
            {/* Username */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xl md:text-2xl font-bold text-foreground">{profileData.username}</span>
              {profileData.is_verified && (
                <img src="/images/verified-badge.png" alt="Verified" className="w-5 h-5" />
              )}
            </div>
            <div className="text-xs text-muted-foreground mb-4">User #{profileData.numeric_id}</div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {isOwnProfile && (
                <div className="bg-muted/30 border border-border rounded-md p-3 text-center">
                  <div className="text-lg font-bold text-accent-foreground">💎 {profileData.emeralds.toLocaleString()}</div>
                  <div className="text-[11px] text-muted-foreground">Emeralds</div>
                </div>
              )}
              <div className="bg-muted/30 border border-border rounded-md p-3 text-center">
                <div className="text-lg font-bold text-foreground">{friendCount}</div>
                <div className="text-[11px] text-muted-foreground">Friends</div>
              </div>
              <div className="bg-muted/30 border border-border rounded-md p-3 text-center">
                <div className="text-lg font-bold text-foreground">{inventory.length}</div>
                <div className="text-[11px] text-muted-foreground">Items</div>
              </div>
              <div className="bg-muted/30 border border-border rounded-md p-3 text-center">
                <div className="text-lg font-bold text-foreground">{limitedItems.length}</div>
                <div className="text-[11px] text-muted-foreground">Limiteds</div>
              </div>
            </div>

            {/* Join date */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
              <Calendar className="w-3.5 h-3.5" />
              <span>Joined {memberSince}</span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {isOwnProfile ? (
                <Link to="/avatar">
                  <button className="px-4 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    Edit Avatar
                  </button>
                </Link>
              ) : (
                <>
                  {friendStatus === 'none' && (
                    <button
                      onClick={handleSendFriendRequest}
                      disabled={friendLoading}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Add Friend
                    </button>
                  )}
                  {friendStatus === 'pending_sent' && (
                    <button
                      onClick={handleCancelRequest}
                      disabled={friendLoading}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel Request
                    </button>
                  )}
                  {friendStatus === 'pending_received' && (
                    <>
                      <button
                        onClick={handleAcceptFriend}
                        disabled={friendLoading}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button
                        onClick={handleDeclineFriend}
                        disabled={friendLoading}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" /> Decline
                      </button>
                    </>
                  )}
                  {friendStatus === 'accepted' && (
                    <button
                      onClick={handleRemoveFriend}
                      disabled={friendLoading}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                    >
                      <UserMinus className="w-3.5 h-3.5" /> Remove Friend
                    </button>
                  )}
                  <Link to={`/trading?user=${profileData?.user_id}`}>
                    <button className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md bg-muted text-foreground border border-border hover:bg-muted/80 transition-colors">
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Trade
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Section */}
      <div className="bg-card border border-border rounded-md overflow-hidden">
        <div className="bg-muted/50 border-b border-border px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Package className="w-4 h-4" />
            {isOwnProfile ? 'Your Inventory' : `${profileData.username}'s Inventory`}
            <span className="text-muted-foreground font-normal">({inventory.length})</span>
          </span>
          {isOwnProfile && (
            <Link to="/avatar" className="text-xs text-primary hover:underline">View All</Link>
          )}
        </div>
        <div className="p-4">
          {inventory.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {inventory.slice(0, 18).map((item) => (
                <Link
                  key={item.id}
                  to={item.catalog_items ? `/catalog/${toSlug(item.catalog_items.name)}` : '#'}
                  className="block border border-border bg-card rounded-md overflow-hidden hover:border-primary/50 transition-colors group"
                >
                  <div className="aspect-square overflow-hidden relative bg-muted/20">
                    <img
                      src={item.catalog_items?.image_url || '/placeholder.svg'}
                      alt={item.catalog_items?.name || 'Item'}
                      className="w-full h-full object-contain p-1"
                    />
                    {item.catalog_items?.item_type === 'limited' && (
                      <div className="absolute top-0.5 right-0.5 px-1 py-px text-[9px] font-bold uppercase rounded bg-secondary/90 text-secondary-foreground">
                        LTD
                      </div>
                    )}
                  </div>
                  <div className="px-1.5 py-1 text-[11px] text-primary truncate text-center">
                    {item.catalog_items?.name}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{isOwnProfile ? 'Your inventory is empty' : 'No items to display'}</p>
              {isOwnProfile && (
                <Link to="/catalog" className="text-xs text-primary hover:underline mt-2 inline-block">
                  Browse Catalog
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
