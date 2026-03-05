import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, Navigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { UserAvatar } from '@/components/avatar/UserAvatar';
import { Button } from '@/components/ui/button';
import { User, Gem, Calendar, Shield, Package, ArrowLeftRight, Settings, BadgeCheck, UserPlus, UserMinus, Gift, Clock, Check, X } from 'lucide-react';
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

const Profile = () => {
  const { user, profile: currentUserProfile, isAdmin, isLoading: authLoading, refreshProfile } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isProfileAdmin, setIsProfileAdmin] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'accepted'>('none');
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);

  const isOwnProfile = !userId || userId === user?.id;
  const viewingUserId = userId || user?.id;

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!viewingUserId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      // Fetch profile
      // Fetch only public-safe columns for other users; own profile gets full data
      const publicColumns = 'id,user_id,username,numeric_id,avatar_data,is_online,is_verified,created_at,updated_at';
      const ownColumns = 'id,user_id,username,numeric_id,emeralds,avatar_data,is_online,is_banned,ban_reason,last_seen,created_at,updated_at,is_verified,last_daily_claim';
      const selectColumns = isOwnProfile ? ownColumns : publicColumns;
      
      const { data: profileResult, error: profileError } = await supabase
        .from('profiles')
        .select(selectColumns)
        .eq('user_id', viewingUserId)
        .maybeSingle();

      if (profileError || !profileResult) {
        setProfileData(null);
        setIsLoading(false);
        return;
      }

      // For other users' profiles, set defaults for fields not fetched
      const safeProfile: ProfileData = isOwnProfile
        ? (profileResult as unknown as ProfileData)
        : {
            ...(profileResult as unknown as Partial<ProfileData>),
            emeralds: 0,
            is_banned: null,
            ban_reason: null,
            last_seen: null,
            last_daily_claim: null,
          } as ProfileData;

      setProfileData(safeProfile);

      // Check if profile user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', viewingUserId)
        .eq('role', 'admin')
        .maybeSingle();

      setIsProfileAdmin(!!roleData);

      // Fetch inventory (only visible items for public profiles, all for own)
      const { data: inventoryData } = await supabase
        .from('user_inventory')
        .select(`
          id,
          item_id,
          quantity,
          catalog_items (
            id,
            name,
            image_url,
            item_type
          )
        `)
        .eq('user_id', viewingUserId);

      if (inventoryData) {
        setInventory(inventoryData as InventoryItem[]);
      }

      // Fetch friend status if not own profile
      if (user && viewingUserId !== user.id) {
        await fetchFriendStatus(viewingUserId);
      }

      setIsLoading(false);
    };

    fetchProfileData();
  }, [viewingUserId, user]);

  const fetchFriendStatus = async (targetUserId: string) => {
    if (!user) return;

    const { data: friendship } = await supabase
      .from('friends')
      .select('id, requester_id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (friendship) {
      setFriendshipId(friendship.id);
      if (friendship.status === 'accepted') {
        setFriendStatus('accepted');
      } else if (friendship.status === 'pending') {
        if (friendship.requester_id === user.id) {
          setFriendStatus('pending_sent');
        } else {
          setFriendStatus('pending_received');
        }
      }
    } else {
      setFriendStatus('none');
      setFriendshipId(null);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!user || !viewingUserId) return;
    setFriendLoading(true);

    try {
      const { error } = await supabase
        .from('friends')
        .insert({
          requester_id: user.id,
          addressee_id: viewingUserId,
          status: 'pending',
        });

      if (error) throw error;
      toast.success('Friend request sent!');
      await fetchFriendStatus(viewingUserId);
    } catch (error) {
      toast.error('Failed to send friend request');
    } finally {
      setFriendLoading(false);
    }
  };

  const handleAcceptFriend = async () => {
    if (!friendshipId) return;
    setFriendLoading(true);

    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;
      toast.success('Friend request accepted!');
      setFriendStatus('accepted');
    } catch (error) {
      toast.error('Failed to accept friend request');
    } finally {
      setFriendLoading(false);
    }
  };

  const handleDeclineFriend = async () => {
    if (!friendshipId) return;
    setFriendLoading(true);

    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      toast.success('Friend request declined');
      setFriendStatus('none');
      setFriendshipId(null);
    } catch (error) {
      toast.error('Failed to decline friend request');
    } finally {
      setFriendLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendshipId) return;
    setFriendLoading(true);

    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      toast.success('Friend removed');
      setFriendStatus('none');
      setFriendshipId(null);
    } catch (error) {
      toast.error('Failed to remove friend');
    } finally {
      setFriendLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!friendshipId) return;
    setFriendLoading(true);

    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      toast.success('Friend request cancelled');
      setFriendStatus('none');
      setFriendshipId(null);
    } catch (error) {
      toast.error('Failed to cancel request');
    } finally {
      setFriendLoading(false);
    }
  };

  const handleClaimDaily = async () => {
    if (!user || !currentUserProfile) return;

    // Check if can claim
    const lastClaim = currentUserProfile.last_daily_claim ? new Date(currentUserProfile.last_daily_claim) : null;
    const now = new Date();
    
    if (lastClaim) {
      const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastClaim < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceLastClaim);
        toast.error(`You can claim again in ${hoursRemaining} hours`);
        return;
      }
    }

    setClaimingDaily(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          emeralds: currentUserProfile.emeralds + 50,
          last_daily_claim: now.toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Claimed 50 daily Emeralds! 💎');
    } catch (error) {
      console.error('Error claiming daily:', error);
      toast.error('Failed to claim daily reward');
    } finally {
      setClaimingDaily(false);
    }
  };

  const canClaimDaily = () => {
    if (!currentUserProfile?.last_daily_claim) return true;
    const lastClaim = new Date(currentUserProfile.last_daily_claim);
    const now = new Date();
    const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastClaim >= 24;
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // If viewing own profile and not logged in
  if (isOwnProfile && !user) {
    return <Navigate to="/login" replace />;
  }

  // If profile not found
  if (!profileData) {
    return (
      <div className="text-center py-20">
        <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
        <h2 className="text-xl font-display font-bold text-muted-foreground">User Not Found</h2>
        <p className="text-muted-foreground mt-2">This user doesn't exist or has been removed.</p>
        <Link to="/users" className="mt-4 inline-block">
          <Button variant="outline">Browse Users</Button>
        </Link>
      </div>
    );
  }

  const memberSince = new Date(profileData.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const limitedItems = inventory.filter(i => i.catalog_items?.item_type === 'limited');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="cyber-card p-8">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Avatar */}
          <div className="relative">
            <UserAvatar 
              userId={viewingUserId!} 
              size="xl" 
              className="w-32 h-32 border-2 border-primary/30" 
            />
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background ${profileData.is_online ? 'bg-accent' : 'bg-muted-foreground'}`} />
          </div>

          {/* User Info */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                <h1 className="text-3xl font-display font-bold">{profileData.username}</h1>
                {profileData.is_verified && (
                  <img 
                    src="/images/verified-badge.png" 
                    alt="Verified" 
                    className="w-6 h-6"
                    title="Verified"
                  />
                )}
                {isProfileAdmin && (
                  <span className="admin-badge">
                    <Shield className="w-3 h-3" />
                    Admin
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">User #{profileData.numeric_id}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
              {/* Emeralds */}
              <div className="flex items-center gap-2">
                <div className="emerald-display">
                  <Gem className="w-5 h-5 text-accent" />
                  <span className="font-bold text-lg text-accent-foreground">
                    {profileData.emeralds.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Limited Items Count */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="w-4 h-4 text-secondary" />
                <span>{limitedItems.length} Limiteds</span>
              </div>

              {/* Member Since */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Joined {memberSince}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              {isOwnProfile ? (
                <>
                  <Link to="/avatar">
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                      Edit Avatar
                    </Button>
                  </Link>
                  <Button 
                    variant={canClaimDaily() ? "emerald" : "outline"} 
                    size="sm"
                    onClick={handleClaimDaily}
                    disabled={claimingDaily || !canClaimDaily()}
                  >
                    {claimingDaily ? (
                      <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                    ) : (
                      <>
                        <Gift className="w-4 h-4" />
                        {canClaimDaily() ? 'Claim 50 Daily Emeralds' : 'Daily Claimed'}
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {/* Friend buttons based on status */}
                  {friendStatus === 'none' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSendFriendRequest}
                      disabled={friendLoading}
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Friend
                    </Button>
                  )}
                  {friendStatus === 'pending_sent' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCancelRequest}
                      disabled={friendLoading}
                    >
                      <X className="w-4 h-4" />
                      Cancel Request
                    </Button>
                  )}
                  {friendStatus === 'pending_received' && (
                    <>
                      <Button 
                        variant="emerald" 
                        size="sm" 
                        onClick={handleAcceptFriend}
                        disabled={friendLoading}
                      >
                        <Check className="w-4 h-4" />
                        Accept
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDeclineFriend}
                        disabled={friendLoading}
                      >
                        <X className="w-4 h-4" />
                        Decline
                      </Button>
                    </>
                  )}
                  {friendStatus === 'accepted' && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleRemoveFriend}
                      disabled={friendLoading}
                    >
                      <UserMinus className="w-4 h-4" />
                      Remove Friend
                    </Button>
                  )}
                  <Link to={`/trading?user=${profileData?.user_id}`}>
                    <Button variant="outline" size="sm">
                      <ArrowLeftRight className="w-4 h-4" />
                      Trade
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="cyber-card p-4 text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-primary/20 flex items-center justify-center">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div className="text-2xl font-display font-bold text-foreground">{inventory.length}</div>
          <div className="text-sm text-muted-foreground">Items Owned</div>
        </div>
        <div className="cyber-card p-4 text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-secondary/20 flex items-center justify-center">
            <ArrowLeftRight className="w-6 h-6 text-secondary" />
          </div>
          <div className="text-2xl font-display font-bold text-foreground">0</div>
          <div className="text-sm text-muted-foreground">Trades Made</div>
        </div>
        <div className="cyber-card p-4 text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-accent/20 flex items-center justify-center">
            <User className="w-6 h-6 text-accent" />
          </div>
          <div className="text-2xl font-display font-bold text-foreground">0</div>
          <div className="text-sm text-muted-foreground">Friends</div>
        </div>
        <div className="cyber-card p-4 text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-neon-purple/20 flex items-center justify-center">
            <Gem className="w-6 h-6 text-neon-purple" />
          </div>
          <div className="text-2xl font-display font-bold text-foreground">{limitedItems.length}</div>
          <div className="text-sm text-muted-foreground">Limiteds</div>
        </div>
      </div>

      {/* Inventory Preview */}
      <div className="cyber-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {isOwnProfile ? 'Your Inventory' : `${profileData.username}'s Inventory`}
          </h2>
          {isOwnProfile && (
            <Link to="/avatar">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          )}
        </div>
        
        {inventory.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {inventory.slice(0, 12).map((item) => (
              <div key={item.id} className="aspect-square rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 overflow-hidden relative group">
                <img
                  src={item.catalog_items?.image_url || '/placeholder.svg'}
                  alt={item.catalog_items?.name || 'Item'}
                  className="w-full h-full object-contain p-2"
                />
                {item.catalog_items?.item_type === 'limited' && (
                  <div className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-secondary/80 text-secondary-foreground">
                    LTD
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-xs text-white text-center px-1">{item.catalog_items?.name}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{isOwnProfile ? 'Your inventory is empty' : 'No items to display'}</p>
            {isOwnProfile && (
              <>
                <p className="text-sm">Visit the catalog to get some items!</p>
                <Link to="/catalog" className="mt-4 inline-block">
                  <Button variant="outline" size="sm">
                    Browse Catalog
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
