import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { UserAvatar } from '@/components/avatar/UserAvatar';
import { UserPlus, Users, Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FriendRequest {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  profile?: {
    user_id: string;
    username: string;
    is_verified: boolean | null;
    is_online: boolean | null;
  };
}

interface Friend {
  user_id: string;
  username: string;
  is_online: boolean | null;
  is_verified: boolean | null;
  friendshipId: string;
}

const Friends = () => {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const is2016 = theme === 'roblox2016';
  const is2015 = theme === 'roblox2015';
  const isClassic = is2016 || is2015;
  const p = is2015 ? 'rbx15' : 'rbx16';

  useEffect(() => { if (user) fetchFriendsData(); }, [user]);

  const fetchFriendsData = async () => {
    if (!user) return;
    setLoading(true);
    const { data: friendships } = await supabase.from('friends').select('id, requester_id, addressee_id, status, created_at').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    if (!friendships) { setLoading(false); return; }

    const accepted: { id: string; friendUserId: string }[] = [];
    const incoming: FriendRequest[] = [];
    const outgoing: FriendRequest[] = [];

    friendships.forEach(f => {
      if (f.status === 'accepted') {
        accepted.push({ id: f.id, friendUserId: f.requester_id === user.id ? f.addressee_id : f.requester_id });
      } else if (f.status === 'pending') {
        if (f.addressee_id === user.id) incoming.push(f);
        else outgoing.push(f);
      }
    });

    const allUserIds = [...accepted.map(a => a.friendUserId), ...incoming.map(i => i.requester_id), ...outgoing.map(o => o.addressee_id)];

    if (allUserIds.length > 0) {
      const { data: profiles } = await (supabase as any).from('public_profiles').select('user_id, username, is_verified, is_online').in('user_id', allUserIds);
      const profileRows = (profiles || []) as Array<{ user_id: string; username: string; is_verified: boolean | null; is_online: boolean | null }>;
      const profileMap = new Map(profileRows.map(p => [p.user_id, p]));

      setFriends(accepted.map(a => {
        const profile = profileMap.get(a.friendUserId);
        return { user_id: a.friendUserId, username: profile?.username || 'Unknown', is_online: profile?.is_online || false, is_verified: profile?.is_verified || false, friendshipId: a.id };
      }).sort((a, b) => (a.is_online && !b.is_online ? -1 : !a.is_online && b.is_online ? 1 : 0)));

      setIncomingRequests(incoming.map(r => ({ ...r, profile: profileMap.get(r.requester_id) })));
      setOutgoingRequests(outgoing.map(r => ({ ...r, profile: profileMap.get(r.addressee_id) })));
    } else {
      setFriends([]); setIncomingRequests([]); setOutgoingRequests([]);
    }
    setLoading(false);
  };

  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId);
    try { await supabase.from('friends').update({ status: 'accepted' }).eq('id', requestId); toast.success('Friend request accepted!'); await fetchFriendsData(); }
    catch { toast.error('Failed to accept request'); }
    finally { setActionLoading(null); }
  };

  const handleDecline = async (requestId: string) => {
    setActionLoading(requestId);
    try { await supabase.from('friends').delete().eq('id', requestId); toast.success('Friend request declined'); await fetchFriendsData(); }
    catch { toast.error('Failed to decline request'); }
    finally { setActionLoading(null); }
  };

  const handleCancelRequest = async (requestId: string) => {
    setActionLoading(requestId);
    try { await supabase.from('friends').delete().eq('id', requestId); toast.success('Request cancelled'); await fetchFriendsData(); }
    catch { toast.error('Failed to cancel request'); }
    finally { setActionLoading(null); }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    setActionLoading(friendshipId);
    try { await supabase.from('friends').delete().eq('id', friendshipId); toast.success('Friend removed'); await fetchFriendsData(); }
    catch { toast.error('Failed to remove friend'); }
    finally { setActionLoading(null); }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]">
      <div className={isClassic ? `${p}-spinner` : "w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"} />
    </div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  /* ═══════════════════════════════════════════
     ROBLOX 2016 FRIENDS LAYOUT
     ═══════════════════════════════════════════ */
  if (isClassic) {
    return (
      <div style={{ maxWidth: 800 }}>
        {/* Incoming requests */}
        {incomingRequests.length > 0 && (
          <div className="rbx16-panel" style={{ marginBottom: 12 }}>
            <div className="rbx16-panel-header">Friend Requests ({incomingRequests.length})</div>
            <div className="rbx16-panel-body">
              {incomingRequests.map((req) => (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e8e8e8' }}>
                  <Link to={`/profile/${req.requester_id}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 40, height: 40, border: '1px solid #c3c3c3', overflow: 'hidden' }}>
                      <UserAvatar userId={req.requester_id} size="md" />
                    </div>
                    <span className="rbx16-link" style={{ fontWeight: 600 }}>{req.profile?.username}</span>
                  </Link>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="rbx16-btn-buy" style={{ width: 'auto', padding: '3px 10px', fontSize: 12 }} onClick={() => handleAccept(req.id)} disabled={actionLoading === req.id}>Accept</button>
                    <button className="rbx16-btn-cancel" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => handleDecline(req.id)} disabled={actionLoading === req.id}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing requests */}
        {outgoingRequests.length > 0 && (
          <div className="rbx16-panel" style={{ marginBottom: 12 }}>
            <div className="rbx16-panel-header">Sent Requests ({outgoingRequests.length})</div>
            <div className="rbx16-panel-body">
              {outgoingRequests.map((req) => (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e8e8e8' }}>
                  <Link to={`/profile/${req.addressee_id}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 40, height: 40, border: '1px solid #c3c3c3', overflow: 'hidden' }}>
                      <UserAvatar userId={req.addressee_id} size="md" />
                    </div>
                    <span className="rbx16-link" style={{ fontWeight: 600 }}>{req.profile?.username}</span>
                  </Link>
                  <button className="rbx16-btn-cancel" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => handleCancelRequest(req.id)} disabled={actionLoading === req.id}>Cancel</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends */}
        <div className="rbx16-panel">
          <div className="rbx16-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Friends ({friends.length})</span>
            <Link to="/users" className="rbx16-link">Find Friends</Link>
          </div>
          <div className="rbx16-panel-body">
            {loading ? (
              <div style={{ textAlign: 'center', padding: 20 }}><div className="rbx16-spinner" style={{ margin: '0 auto' }} /></div>
            ) : friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#999', fontSize: 13 }}>
                You haven't added any friends yet. <Link to="/users" className="rbx16-link">Find people to add</Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10 }}>
                {friends.map((friend) => (
                  <div key={friend.user_id} className="rbx16-friend-tile" style={{ position: 'relative' }}>
                    <Link to={`/profile/${friend.user_id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                      <div className="rbx16-friend-avatar" style={{ position: 'relative' }}>
                        <UserAvatar userId={friend.user_id} size="lg" />
                        {friend.is_online && <div className="rbx16-online-dot" />}
                      </div>
                      <span className="rbx16-friend-name">{friend.username}</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     DEFAULT SODABLOX LAYOUT
     ═══════════════════════════════════════════ */
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <UserPlus className="w-8 h-8 text-primary" />
          Friends
        </h1>
        <p className="text-muted-foreground">Manage your friends and friend requests</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="cyber-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center"><Users className="w-5 h-5 text-accent" /></div>
                <div><div className="font-bold">Friends</div><div className="text-sm text-muted-foreground">{friends.length} friends</div></div>
              </div>
            </div>
            <div className="cyber-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center"><Check className="w-5 h-5 text-primary" /></div>
                <div><div className="font-bold">Incoming</div><div className="text-sm text-muted-foreground">{incomingRequests.length} requests</div></div>
              </div>
            </div>
            <div className="cyber-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center"><Clock className="w-5 h-5 text-secondary" /></div>
                <div><div className="font-bold">Outgoing</div><div className="text-sm text-muted-foreground">{outgoingRequests.length} sent</div></div>
              </div>
            </div>
          </div>

          {incomingRequests.length > 0 && (
            <div className="cyber-card p-6 space-y-4">
              <h2 className="font-display font-bold flex items-center gap-2"><Check className="w-5 h-5 text-primary" />Incoming Friend Requests</h2>
              <div className="space-y-3">
                {incomingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <Link to={`/profile/${request.requester_id}`} className="flex items-center gap-3">
                      <UserAvatar userId={request.requester_id} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{request.profile?.username}</span>
                          {request.profile?.is_verified && <img src="/images/verified-badge.png" alt="Verified" className="w-4 h-4" />}
                        </div>
                        <span className={`text-sm ${request.profile?.is_online ? 'text-accent' : 'text-muted-foreground'}`}>{request.profile?.is_online ? 'Online' : 'Offline'}</span>
                      </div>
                    </Link>
                    <div className="flex gap-2">
                      <Button size="sm" variant="emerald" onClick={() => handleAccept(request.id)} disabled={actionLoading === request.id}><Check className="w-4 h-4" /> Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => handleDecline(request.id)} disabled={actionLoading === request.id}><X className="w-4 h-4" /> Decline</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {outgoingRequests.length > 0 && (
            <div className="cyber-card p-6 space-y-4">
              <h2 className="font-display font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-secondary" />Sent Requests</h2>
              <div className="space-y-3">
                {outgoingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <Link to={`/profile/${request.addressee_id}`} className="flex items-center gap-3">
                      <UserAvatar userId={request.addressee_id} size="md" />
                      <span className="font-bold">{request.profile?.username}</span>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => handleCancelRequest(request.id)} disabled={actionLoading === request.id}><X className="w-4 h-4" /> Cancel</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="cyber-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold flex items-center gap-2"><Users className="w-5 h-5 text-accent" />Your Friends ({friends.length})</h2>
              <Link to="/users"><Button variant="ghost" size="sm">Find Friends</Button></Link>
            </div>
            {friends.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">You haven't added any friends yet</p>
                <Link to="/users" className="text-primary hover:underline text-sm mt-2 inline-block">Find people to add</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {friends.map((friend) => (
                  <div key={friend.user_id} className="cyber-card p-4 text-center relative group">
                    <Link to={`/profile/${friend.user_id}`} className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <UserAvatar userId={friend.user_id} size="lg" />
                        {friend.is_online && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-accent border-2 border-card" />}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm truncate">{friend.username}</span>
                        {friend.is_verified && <img src="/images/verified-badge.png" alt="Verified" className="w-3.5 h-3.5" />}
                      </div>
                    </Link>
                    <button onClick={() => handleRemoveFriend(friend.friendshipId)} disabled={actionLoading === friend.friendshipId}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Friends;