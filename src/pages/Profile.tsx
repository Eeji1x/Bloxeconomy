import { useEffect, useState, lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, Navigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { UserAvatar } from '@/components/avatar/UserAvatar';
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
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div className="rbx16-spinner" />
      </div>
    );
  }

  if (isOwnProfile && !user) return <Navigate to="/login" replace />;

  if (!profileData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#393b3d', marginBottom: 8 }}>User Not Found</h2>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>This user doesn't exist or has been removed.</p>
        <Link to="/users" className="rbx16-link">Browse Users</Link>
      </div>
    );
  }

  const memberSince = new Date(profileData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const lastSeen = profileData.last_seen ? new Date(profileData.last_seen).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown';

  return (
    <div style={{ maxWidth: 940, margin: '0 auto' }}>
      {/* Profile Header */}
      <div className="rbx16-panel" style={{ marginBottom: 12 }}>
        <div className="rbx16-panel-header">
          <span className="rbx16-panel-header-text">{profileData.username}'s Profile</span>
        </div>
        <div className="rbx16-panel-body" style={{ padding: 0 }}>
          <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
            {/* Left: Avatar */}
            <div style={{ 
              width: 230, 
              padding: 16, 
              borderRight: '1px solid #e3e3e3',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <div style={{ width: 180, height: 180, border: '1px solid #c3c3c3', overflow: 'hidden', marginBottom: 12 }}>
                <UserAvatar userId={viewingUserId!} size="xl" className="w-full h-full" />
              </div>
              
              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                {isOwnProfile ? (
                  <Link to="/avatar" className="rbx16-btn-primary" style={{ textAlign: 'center', display: 'block', padding: '6px 12px', fontSize: 13 }}>
                    Edit Avatar
                  </Link>
                ) : (
                  <>
                    {friendStatus === 'none' && (
                      <button onClick={handleSendFriendRequest} disabled={friendLoading} className="rbx16-btn-primary" style={{ width: '100%', padding: '6px 12px', fontSize: 13 }}>
                        Add Friend
                      </button>
                    )}
                    {friendStatus === 'pending_sent' && (
                      <button onClick={handleCancelRequest} disabled={friendLoading} className="rbx16-btn-control" style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}>
                        Cancel Request
                      </button>
                    )}
                    {friendStatus === 'pending_received' && (
                      <>
                        <button onClick={handleAcceptFriend} disabled={friendLoading} className="rbx16-btn-primary" style={{ width: '100%', padding: '6px 12px', fontSize: 13 }}>
                          Accept Request
                        </button>
                        <button onClick={handleDeclineFriend} disabled={friendLoading} className="rbx16-btn-control" style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}>
                          Decline
                        </button>
                      </>
                    )}
                    {friendStatus === 'accepted' && (
                      <button onClick={handleRemoveFriend} disabled={friendLoading} className="rbx16-btn-control" style={{ width: '100%', justifyContent: 'center', fontSize: 13, color: '#c00' }}>
                        Unfriend
                      </button>
                    )}
                    <Link to={`/trading?user=${profileData.user_id}`} className="rbx16-btn-control" style={{ justifyContent: 'center', width: '100%', fontSize: 13 }}>
                      Send Trade
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Right: Info */}
            <div style={{ flex: 1, minWidth: 0, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#393b3d', margin: 0 }}>{profileData.username}</h1>
                {profileData.is_verified && (
                  <img src="/images/verified-badge.png" alt="Verified" style={{ width: 18, height: 18 }} />
                )}
                {isProfileAdmin && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#e74c3c', padding: '2px 6px', borderRadius: 3 }}>Admin</span>
                )}
                {profileData.is_online && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#00b06f' }}>● Online</span>
                )}
              </div>

              {/* Stats table */}
              <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px 0', color: '#666', width: 130 }}>User ID</td>
                    <td style={{ padding: '6px 0', color: '#393b3d', fontWeight: 600 }}>#{profileData.numeric_id}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 0', color: '#666', borderTop: '1px solid #eee' }}>Join Date</td>
                    <td style={{ padding: '6px 0', color: '#393b3d', borderTop: '1px solid #eee' }}>{memberSince}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 0', color: '#666', borderTop: '1px solid #eee' }}>Friends</td>
                    <td style={{ padding: '6px 0', borderTop: '1px solid #eee' }}>
                      <Link to="/friends" className="rbx16-link">{friendCount}</Link>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 0', color: '#666', borderTop: '1px solid #eee' }}>Items</td>
                    <td style={{ padding: '6px 0', color: '#393b3d', borderTop: '1px solid #eee' }}>{inventory.length}</td>
                  </tr>
                  {isOwnProfile && (
                    <tr>
                      <td style={{ padding: '6px 0', color: '#666', borderTop: '1px solid #eee' }}>Emeralds</td>
                      <td style={{ padding: '6px 0', color: '#393b3d', fontWeight: 700, borderTop: '1px solid #eee' }}>
                        💎 {profileData.emeralds.toLocaleString()}
                      </td>
                    </tr>
                  )}
                  {!profileData.is_online && profileData.last_seen && (
                    <tr>
                      <td style={{ padding: '6px 0', color: '#666', borderTop: '1px solid #eee' }}>Last Seen</td>
                      <td style={{ padding: '6px 0', color: '#393b3d', borderTop: '1px solid #eee' }}>{lastSeen}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 0 }}>
        <button
          onClick={() => setActiveTab('about')}
          style={{
            padding: '8px 20px',
            fontSize: 14,
            fontWeight: 600,
            border: '1px solid #c3c3c3',
            borderBottom: activeTab === 'about' ? '1px solid #fff' : '1px solid #c3c3c3',
            background: activeTab === 'about' ? '#fff' : '#f2f2f2',
            color: '#393b3d',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            marginBottom: -1,
            position: 'relative',
            zIndex: activeTab === 'about' ? 2 : 1,
          }}
        >
          About
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '8px 20px',
            fontSize: 14,
            fontWeight: 600,
            border: '1px solid #c3c3c3',
            borderBottom: activeTab === 'inventory' ? '1px solid #fff' : '1px solid #c3c3c3',
            background: activeTab === 'inventory' ? '#fff' : '#f2f2f2',
            color: '#393b3d',
            cursor: 'pointer',
            borderRadius: '4px 4px 0 0',
            marginBottom: -1,
            position: 'relative',
            zIndex: activeTab === 'inventory' ? 2 : 1,
            marginLeft: -1,
          }}
        >
          Inventory ({inventory.length})
        </button>
      </div>

      {/* Tab content */}
      <div className="rbx16-panel" style={{ borderTopLeftRadius: 0, marginBottom: 20 }}>
        <div className="rbx16-panel-body">
          {activeTab === 'about' && (
            <div>
              {/* Equipped items / Recently worn */}
              {inventory.filter(i => (i as any).is_equipped).length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#393b3d', marginBottom: 10, borderBottom: '1px solid #e3e3e3', paddingBottom: 6 }}>Currently Wearing</h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {equippedItems.map((item, i) => (
                      <div key={i} style={{ width: 80, height: 80, border: '1px solid #c3c3c3', overflow: 'hidden', borderRadius: 2 }}>
                        <img src={item.image_url} alt={item.name || 'Item'} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inventory preview */}
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#393b3d', marginBottom: 10, borderBottom: '1px solid #e3e3e3', paddingBottom: 6 }}>Inventory</h3>
              {inventory.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                  {inventory.slice(0, 12).map((item) => (
                    <Link key={item.id} to={item.catalog_items ? `/catalog/${toSlug(item.catalog_items.name)}` : '#'}>
                      <div style={{ border: '1px solid #c3c3c3', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ aspectRatio: '1', background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img
                            src={item.catalog_items?.image_url || '/placeholder.svg'}
                            alt={item.catalog_items?.name || 'Item'}
                            style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                          />
                        </div>
                        {item.catalog_items?.item_type === 'limited' && (
                          <div style={{ position: 'absolute', top: 2, right: 2, fontSize: 9, fontWeight: 700, background: '#e74c3c', color: '#fff', padding: '1px 4px', borderRadius: 2 }}>LTD</div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#00a2ff', padding: '3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.catalog_items?.name}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 14, color: '#999', padding: '16px 0', textAlign: 'center' }}>
                  {isOwnProfile ? (
                    <>No items yet. <Link to="/catalog" className="rbx16-link">Browse Catalog</Link></>
                  ) : 'No items to display.'}
                </p>
              )}
            </div>
          )}

          {activeTab === 'inventory' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#393b3d', marginBottom: 10 }}>
                {isOwnProfile ? 'Your Inventory' : `${profileData.username}'s Inventory`}
                <span style={{ color: '#999', fontWeight: 400, marginLeft: 6 }}>({inventory.length})</span>
              </h3>
              {inventory.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                  {inventory.map((item) => (
                    <Link key={item.id} to={item.catalog_items ? `/catalog/${toSlug(item.catalog_items.name)}` : '#'}>
                      <div style={{ border: '1px solid #c3c3c3', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ aspectRatio: '1', background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img
                            src={item.catalog_items?.image_url || '/placeholder.svg'}
                            alt={item.catalog_items?.name || 'Item'}
                            style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                          />
                        </div>
                        {item.catalog_items?.item_type === 'limited' && (
                          <div style={{ position: 'absolute', top: 2, right: 2, fontSize: 9, fontWeight: 700, background: '#e74c3c', color: '#fff', padding: '1px 4px', borderRadius: 2 }}>LTD</div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#00a2ff', padding: '3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.catalog_items?.name}
                      </div>
                      {item.catalog_items?.item_type === 'limited' && (
                        <div style={{ fontSize: 10, color: '#999' }}>Limited</div>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <p style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>{isOwnProfile ? 'Your inventory is empty' : 'No items to display'}</p>
                  {isOwnProfile && <Link to="/catalog" className="rbx16-link">Browse Catalog</Link>}
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
