import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, Navigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { UserAvatar } from '@/components/avatar/UserAvatar';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  UserPlus, UserX, Send, Pencil, X, Check,
  Crown, Gem, Calendar, Package, Users as UsersIcon
} from 'lucide-react';

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

interface BcInfo {
  tier: 'classic' | 'turbo' | 'outrageous';
  expires_at: string;
}

const toSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const BC_LABELS: Record<string, { label: string; color: string }> = {
  classic: { label: 'Builders Club', color: '#22ff88' },
  turbo: { label: 'Turbo Builders Club', color: '#ff9d2e' },
  outrageous: { label: 'Outrageous Builders Club', color: '#ff35d6' },
};

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
  const [equippedItems, setEquippedItems] = useState<{ image_url: string; name?: string }[]>([]);
  const [bc, setBc] = useState<BcInfo | null>(null);

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

      const { data: bcData } = await (supabase as any)
        .from('builders_club_subscriptions')
        .select('tier, active, expires_at')
        .eq('user_id', viewingUserId)
        .maybeSingle();
      if (bcData && bcData.active && bcData.expires_at && new Date(bcData.expires_at) > new Date()) {
        setBc({ tier: bcData.tier, expires_at: bcData.expires_at });
      } else {
        setBc(null);
      }

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
      <div className="text-center py-16 px-5">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-bold text-foreground mb-2">User Not Found</h2>
        <p className="text-sm text-muted-foreground mb-4">This user doesn't exist or has been removed.</p>
        <Link to="/users" className="text-primary hover:underline">Browse Users</Link>
      </div>
    );
  }

  const memberSince = new Date(profileData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const lastSeen = profileData.last_seen ? new Date(profileData.last_seen).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown';
  const bcInfo = bc ? BC_LABELS[bc.tier] : null;

  return (
    <div className="max-w-[940px] mx-auto">
      {/* ─── Profile header card (futuristic) ───────────────────────── */}
      <div
        className="relative rounded-xl border border-primary/30 overflow-hidden mb-4"
        style={{
          background: 'linear-gradient(135deg, hsl(260 40% 10%) 0%, hsl(260 35% 6%) 100%)',
          boxShadow: '0 0 40px hsl(180 100% 50% / 0.12)',
        }}
      >
        {/* Cyber grid backdrop */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(hsl(180 100% 50% / 0.15) 1px, transparent 1px), linear-gradient(90deg, hsl(180 100% 50% / 0.15) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative p-5">
          <div className="flex flex-wrap gap-5">
            {/* Left: avatar with neon frame */}
            <div className="flex-shrink-0 text-center">
              <div
                className="relative mx-auto rounded-xl overflow-hidden"
                style={{
                  width: 140,
                  height: 140,
                  border: '2px solid hsl(180 100% 50% / 0.7)',
                  boxShadow: '0 0 30px hsl(180 100% 50% / 0.4), inset 0 0 20px hsl(180 100% 50% / 0.1)',
                  background: 'hsl(260 40% 8%)',
                }}
              >
                <UserAvatar userId={viewingUserId!} size="xl" className="w-full h-full" />
              </div>

              {/* Action buttons */}
              <div className="mt-3 flex flex-col gap-2 mx-auto" style={{ maxWidth: 140 }}>
                {isOwnProfile ? (
                  <Button asChild className="w-full" variant="default">
                    <Link to="/avatar" className="gap-2">
                      <Pencil className="w-4 h-4" />
                      Edit Avatar
                    </Link>
                  </Button>
                ) : (
                  <>
                    {friendStatus === 'none' && (
                      <Button onClick={handleSendFriendRequest} disabled={friendLoading} className="w-full gap-2">
                        <UserPlus className="w-4 h-4" />
                        Add Friend
                      </Button>
                    )}
                    {friendStatus === 'pending_sent' && (
                      <Button onClick={handleCancelRequest} disabled={friendLoading} variant="outline" className="w-full gap-2">
                        <X className="w-4 h-4" />
                        Cancel Request
                      </Button>
                    )}
                    {friendStatus === 'pending_received' && (
                      <>
                        <Button onClick={handleAcceptFriend} disabled={friendLoading} className="w-full gap-2">
                          <Check className="w-4 h-4" />
                          Accept
                        </Button>
                        <Button onClick={handleDeclineFriend} disabled={friendLoading} variant="outline" className="w-full gap-2">
                          <X className="w-4 h-4" />
                          Decline
                        </Button>
                      </>
                    )}
                    {friendStatus === 'accepted' && (
                      <Button onClick={handleRemoveFriend} disabled={friendLoading} variant="outline" className="w-full gap-2 text-destructive border-destructive/30">
                        <UserX className="w-4 h-4" />
                        Unfriend
                      </Button>
                    )}
                    {/* Send Trade — prominent */}
                    <Button asChild className="w-full gap-2" variant="secondary">
                      <Link to={`/trading?user=${profileData.user_id}`}>
                        <Send className="w-4 h-4" />
                        Send Trade
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Right: identity + stats */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1
                  className="text-3xl font-bold m-0 leading-tight"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    color: 'hsl(180 100% 95%)',
                    textShadow: '0 0 12px hsl(180 100% 50% / 0.5)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {profileData.username}
                </h1>
                {profileData.is_verified && (
                  <img src="/images/verified-badge.png" alt="Verified" className="w-5 h-5" />
                )}
                {isProfileAdmin && (
                  <span
                    className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded"
                    style={{
                      background: 'linear-gradient(135deg, hsl(0 100% 60%), hsl(330 100% 50%))',
                      color: '#fff',
                      boxShadow: '0 0 10px hsl(0 100% 60% / 0.5)',
                    }}
                  >
                    Admin
                  </span>
                )}
                {bcInfo && (
                  <span
                    className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded inline-flex items-center gap-1"
                    style={{
                      background: `linear-gradient(135deg, ${bcInfo.color}, hsl(180 100% 50%))`,
                      color: '#0a0a1a',
                      boxShadow: `0 0 10px ${bcInfo.color}80`,
                    }}
                  >
                    <Crown className="w-3 h-3" />
                    {bcInfo.label}
                  </span>
                )}
              </div>

              <div className="text-sm mb-1" style={{ color: profileData.is_online ? 'hsl(150 100% 60%)' : 'hsl(180 40% 70%)' }}>
                {profileData.is_online ? '● Online' : `Last seen ${lastSeen}`}
              </div>
              <div className="text-xs text-muted-foreground mb-4">ID: {profileData.numeric_id}</div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatCard icon={<Calendar className="w-4 h-4" />} label="Joined" value={memberSince} />
                <StatCard
                  icon={<UsersIcon className="w-4 h-4" />}
                  label="Friends"
                  value={
                    <Link to="/friends" className="text-primary hover:underline">
                      {friendCount}
                    </Link>
                  }
                />
                <StatCard icon={<Package className="w-4 h-4" />} label="Items" value={inventory.length} />
                {isOwnProfile && (
                  <StatCard
                    icon={<Gem className="w-4 h-4 text-accent" />}
                    label="Emeralds"
                    value={profileData.emeralds.toLocaleString()}
                    accent
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tabs (futuristic) ─────────────────────────────────────── */}
      <div className="flex gap-1 mb-3">
        <TabButton active={activeTab === 'about'} onClick={() => setActiveTab('about')}>
          About
        </TabButton>
        <TabButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')}>
          Inventory ({inventory.length})
        </TabButton>
      </div>

      <div
        className="rounded-lg border border-primary/20 p-5"
        style={{
          background: 'hsl(260 40% 8%)',
          boxShadow: '0 0 20px hsl(180 100% 50% / 0.08)',
        }}
      >
        {activeTab === 'about' && (
          <div>
            {equippedItems.length > 0 && (
              <div className="mb-6">
                <SectionHeading>Currently Wearing</SectionHeading>
                <div className="flex gap-2 flex-wrap">
                  {equippedItems.map((item, i) => (
                    <div
                      key={i}
                      className="w-20 h-20 rounded-md border border-primary/30 overflow-hidden"
                      style={{ background: 'hsl(260 40% 12%)' }}
                    >
                      <img src={item.image_url} alt={item.name || 'Item'} className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <SectionHeading>Inventory</SectionHeading>
            {inventory.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {inventory.slice(0, 12).map((item) => (
                  <InventoryCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {isOwnProfile ? (
                  <>
                    No items yet. <Link to="/catalog" className="text-primary hover:underline">Browse Catalog</Link>
                  </>
                ) : 'No items to display.'}
              </p>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div>
            <SectionHeading>
              {isOwnProfile ? 'Your Inventory' : `${profileData.username}'s Inventory`}
              <span className="text-muted-foreground font-normal ml-2">({inventory.length})</span>
            </SectionHeading>
            {inventory.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {inventory.map((item) => (
                  <InventoryCard key={item.id} item={item} showLimitedLabel />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground mb-2">{isOwnProfile ? 'Your inventory is empty' : 'No items to display'}</p>
                {isOwnProfile && <Link to="/catalog" className="text-primary hover:underline">Browse Catalog</Link>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const StatCard = ({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) => (
  <div
    className="rounded-md border px-3 py-2"
    style={{
      borderColor: accent ? 'hsl(150 100% 50% / 0.4)' : 'hsl(180 100% 50% / 0.2)',
      background: accent ? 'hsl(150 100% 50% / 0.06)' : 'hsl(260 40% 12%)',
    }}
  >
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
      {icon}
      {label}
    </div>
    <div
      className="text-sm font-semibold truncate"
      style={{ color: accent ? 'hsl(150 100% 65%)' : 'hsl(180 100% 95%)' }}
    >
      {value}
    </div>
  </div>
);

const TabButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className="px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors"
    style={{
      color: active ? 'hsl(180 100% 60%)' : 'hsl(180 40% 70%)',
      borderColor: active ? 'hsl(180 100% 50%)' : 'transparent',
      background: active ? 'hsl(260 40% 12%)' : 'transparent',
      boxShadow: active ? '0 -1px 12px hsl(180 100% 50% / 0.3)' : 'none',
    }}
  >
    {children}
  </button>
);

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h3
    className="text-base font-bold mb-3 pb-1.5 border-b"
    style={{
      color: 'hsl(180 100% 90%)',
      borderColor: 'hsl(180 100% 50% / 0.2)',
      letterSpacing: '0.04em',
      fontFamily: 'Orbitron, sans-serif',
    }}
  >
    {children}
  </h3>
);

const InventoryCard = ({ item, showLimitedLabel }: { item: InventoryItem; showLimitedLabel?: boolean }) => {
  const slug = item.catalog_items ? toSlug(item.catalog_items.name) : '';
  return (
    <Link to={item.catalog_items ? `/catalog/${slug}` : '#'} className="block group">
      <div
        className="rounded-md overflow-hidden relative border transition-colors"
        style={{
          borderColor: 'hsl(180 100% 50% / 0.2)',
          background: 'hsl(260 40% 12%)',
        }}
      >
        <div className="aspect-square flex items-center justify-center">
          <img
            src={item.catalog_items?.image_url || '/placeholder.svg'}
            alt={item.catalog_items?.name || 'Item'}
            className="w-4/5 h-4/5 object-contain"
          />
        </div>
        {item.catalog_items?.item_type === 'limited' && (
          <div
            className="absolute top-1 right-1 text-[9px] font-bold px-1 py-0.5 rounded"
            style={{
              background: 'linear-gradient(135deg, hsl(0 100% 60%), hsl(330 100% 50%))',
              color: '#fff',
              boxShadow: '0 0 8px hsl(0 100% 60% / 0.5)',
            }}
          >
            LTD
          </div>
        )}
      </div>
      <div className="text-xs text-primary py-1 truncate group-hover:underline">
        {item.catalog_items?.name}
      </div>
      {showLimitedLabel && item.catalog_items?.item_type === 'limited' && (
        <div className="text-[10px] text-muted-foreground">Limited</div>
      )}
    </Link>
  );
};

export default Profile;
