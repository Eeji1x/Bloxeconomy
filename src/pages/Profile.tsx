import { useEffect, useState, lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, Navigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { UserAvatar } from '@/components/avatar/UserAvatar';
import { User, Package, UserPlus, UserMinus, Check, X, ArrowLeftRight, MoreHorizontal, Box } from 'lucide-react';
import { toast } from 'sonner';

const Avatar3DViewer = lazy(() => import('@/components/avatar/Avatar3DViewer').then(m => ({ default: m.Avatar3DViewer })));

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
  const { user, profile: currentUserProfile, isLoading: authLoading } = useAuth();
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
  const [activeTab, setActiveTab] = useState<'about' | 'inventory'>('about');
  const [show3D, setShow3D] = useState(false);
  const [equippedItems, setEquippedItems] = useState<{ image_url: string; name?: string }[]>([]);

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

      const { data: inventoryData } = await supabase.from('user_inventory').select(`id, item_id, quantity, is_equipped, catalog_items (id, name, image_url, item_type)`).eq('user_id', viewingUserId);
      if (inventoryData) {
        setInventory(inventoryData as InventoryItem[]);
        const equipped = (inventoryData as any[]).filter(i => i.is_equipped && i.catalog_items).map(i => ({ image_url: i.catalog_items.image_url, name: i.catalog_items.name }));
        setEquippedItems(equipped);
      }

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
    <div className="w-full">
      {/* ══════════ BANNER AREA ══════════ */}
      <div className="relative w-full h-[200px] md:h-[280px] bg-gradient-to-b from-muted/80 to-muted/40 overflow-hidden flex items-center justify-center">
        {/* Large avatar render in center of banner */}
        <div className="w-[160px] h-[200px] md:w-[220px] md:h-[270px]">
          <UserAvatar userId={viewingUserId!} size="xl" className="w-full h-full object-contain" />
        </div>
      </div>

      {/* ══════════ PROFILE INFO SECTION ══════════ */}
      <div className="max-w-[960px] mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start gap-4 py-4 -mt-10 sm:-mt-8 relative z-10">
          {/* Circular headshot */}
          <div className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] rounded-full border-[3px] border-card bg-muted overflow-hidden flex-shrink-0 shadow-md">
            <UserAvatar userId={viewingUserId!} size="xl" className="w-full h-full" />
          </div>

          {/* Name + handle */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">{profileData.username}</h1>
              {profileData.is_verified && (
                <img src="/images/verified-badge.png" alt="Verified" className="w-5 h-5" />
              )}
              {isProfileAdmin && (
                <span className="text-[11px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">Admin</span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">@{profileData.username}</div>
          </div>

          {/* Action buttons (right side) */}
          <div className="flex items-center gap-2 sm:pt-3 flex-shrink-0">
            {isOwnProfile ? (
              <Link to="/avatar">
                <button className="px-6 py-2 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  Edit Avatar
                </button>
              </Link>
            ) : (
              <>
                {friendStatus === 'none' && (
                  <button
                    onClick={handleSendFriendRequest}
                    disabled={friendLoading}
                    className="px-6 py-2 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    Add Friend
                  </button>
                )}
                {friendStatus === 'pending_sent' && (
                  <button
                    onClick={handleCancelRequest}
                    disabled={friendLoading}
                    className="px-6 py-2 text-sm font-semibold rounded-md bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors disabled:opacity-50"
                  >
                    Pending
                  </button>
                )}
                {friendStatus === 'pending_received' && (
                  <>
                    <button
                      onClick={handleAcceptFriend}
                      disabled={friendLoading}
                      className="px-5 py-2 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={handleDeclineFriend}
                      disabled={friendLoading}
                      className="px-5 py-2 text-sm font-semibold rounded-md bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </>
                )}
                {friendStatus === 'accepted' && (
                  <button
                    onClick={handleRemoveFriend}
                    disabled={friendLoading}
                    className="px-6 py-2 text-sm font-semibold rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                  >
                    Unfriend
                  </button>
                )}
                <Link to={`/trading?user=${profileData?.user_id}`}>
                  <button className="p-2 rounded-md border border-border bg-card text-muted-foreground hover:bg-muted transition-colors">
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                </Link>
              </>
            )}
            <button className="p-2 rounded-md border border-border bg-card text-muted-foreground hover:bg-muted transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ══════════ STATS PILLS ══════════ */}
        <div className="flex items-center gap-2 pb-4 flex-wrap">
          <span className="px-3 py-1 text-sm rounded-full border border-border bg-card text-muted-foreground">
            <span className="font-semibold text-foreground">{friendCount}</span> Friends
          </span>
          {isOwnProfile && (
            <span className="px-3 py-1 text-sm rounded-full border border-border bg-card text-muted-foreground">
              💎 <span className="font-semibold text-foreground">{profileData.emeralds.toLocaleString()}</span> Emeralds
            </span>
          )}
          <span className="px-3 py-1 text-sm rounded-full border border-border bg-card text-muted-foreground">
            <span className="font-semibold text-foreground">{inventory.length}</span> Items
          </span>
        </div>

        {/* ══════════ TABS ══════════ */}
        <div className="border-b border-border flex">
          <button
            onClick={() => setActiveTab('about')}
            className={`px-6 py-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'about'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            About
            {activeTab === 'about' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-6 py-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'inventory'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Inventory
            {activeTab === 'inventory' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full" />
            )}
          </button>
        </div>

        {/* ══════════ TAB CONTENT ══════════ */}
        <div className="py-6">
          {activeTab === 'about' && (
            <div className="space-y-6">
              {/* About info */}
              <div>
                <h2 className="text-base font-bold text-foreground mb-3">About</h2>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Member since {memberSince}</p>
                  <p>User #{profileData.numeric_id}</p>
                  {profileData.is_online ? (
                    <p className="text-accent font-medium">● Online</p>
                  ) : (
                    <p>● Offline</p>
                  )}
                </div>
              </div>

              {/* Inventory preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    Inventory
                    <span className="text-xs font-normal text-muted-foreground">›</span>
                  </h2>
                </div>
                {inventory.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {inventory.slice(0, 6).map((item) => (
                      <Link
                        key={item.id}
                        to={item.catalog_items ? `/catalog/${toSlug(item.catalog_items.name)}` : '#'}
                        className="group"
                      >
                        <div className="aspect-square rounded-lg bg-muted/40 border border-border overflow-hidden relative hover:border-primary/40 transition-colors">
                          <img
                            src={item.catalog_items?.image_url || '/placeholder.svg'}
                            alt={item.catalog_items?.name || 'Item'}
                            className="w-full h-full object-contain p-2"
                          />
                          {item.catalog_items?.item_type === 'limited' && (
                            <div className="absolute top-1 right-1 px-1 py-px text-[9px] font-bold uppercase rounded bg-secondary/90 text-secondary-foreground">
                              LTD
                            </div>
                          )}
                        </div>
                        <div className="mt-1.5 text-xs text-foreground truncate">{item.catalog_items?.name}</div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-8 text-center">
                    {isOwnProfile ? (
                      <>
                        No items yet. <Link to="/catalog" className="text-primary hover:underline">Browse Catalog</Link>
                      </>
                    ) : (
                      'No items to display.'
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-foreground">
                  {isOwnProfile ? 'Your Inventory' : `${profileData.username}'s Inventory`}
                  <span className="text-muted-foreground font-normal ml-1">({inventory.length})</span>
                </h2>
              </div>
              {inventory.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {inventory.map((item) => (
                    <Link
                      key={item.id}
                      to={item.catalog_items ? `/catalog/${toSlug(item.catalog_items.name)}` : '#'}
                      className="group"
                    >
                      <div className="aspect-square rounded-lg bg-muted/40 border border-border overflow-hidden relative hover:border-primary/40 transition-colors">
                        <img
                          src={item.catalog_items?.image_url || '/placeholder.svg'}
                          alt={item.catalog_items?.name || 'Item'}
                          className="w-full h-full object-contain p-2"
                        />
                        {item.catalog_items?.item_type === 'limited' && (
                          <div className="absolute top-1 right-1 px-1 py-px text-[9px] font-bold uppercase rounded bg-secondary/90 text-secondary-foreground">
                            LTD
                          </div>
                        )}
                      </div>
                      <div className="mt-1.5 text-xs text-foreground truncate">{item.catalog_items?.name}</div>
                      {item.catalog_items?.item_type === 'limited' && (
                        <div className="text-[10px] text-muted-foreground">Limited</div>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
