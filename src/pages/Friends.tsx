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

  const isRoblox = theme === 'roblox2016';

  useEffect(() => {
    if (user) {
      fetchFriendsData();
    }
  }, [user]);

  const fetchFriendsData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: friendships } = await supabase
      .from('friends')
      .select('id, requester_id, addressee_id, status, created_at')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (!friendships) {
      setLoading(false);
      return;
    }

    const accepted: { id: string; friendUserId: string }[] = [];
    const incoming: FriendRequest[] = [];
    const outgoing: FriendRequest[] = [];

    friendships.forEach(f => {
      if (f.status === 'accepted') {
        const friendUserId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        accepted.push({ id: f.id, friendUserId });
      } else if (f.status === 'pending') {
        if (f.addressee_id === user.id) {
          incoming.push(f);
        } else {
          outgoing.push(f);
        }
      }
    });

    const allUserIds = [
      ...accepted.map(a => a.friendUserId),
      ...incoming.map(i => i.requester_id),
      ...outgoing.map(o => o.addressee_id),
    ];

    if (allUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, is_verified, is_online')
        .in('user_id', allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      const friendsList: Friend[] = accepted.map(a => {
        const profile = profileMap.get(a.friendUserId);
        return {
          user_id: a.friendUserId,
          username: profile?.username || 'Unknown',
          is_online: profile?.is_online || false,
          is_verified: profile?.is_verified || false,
          friendshipId: a.id,
        };
      }).sort((a, b) => {
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;
        return 0;
      });

      const incomingWithProfiles = incoming.map(r => ({
        ...r,
        profile: profileMap.get(r.requester_id),
      }));
      const outgoingWithProfiles = outgoing.map(r => ({
        ...r,
        profile: profileMap.get(r.addressee_id),
      }));

      setFriends(friendsList);
      setIncomingRequests(incomingWithProfiles);
      setOutgoingRequests(outgoingWithProfiles);
    } else {
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
    }
    setLoading(false);
  };

  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId);
      if (error) throw error;
      toast.success('Friend request accepted!');
      await fetchFriendsData();
    } catch { toast.error('Failed to accept request'); }
    finally { setActionLoading(null); }
  };

  const handleDecline = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { error } = await supabase.from('friends').delete().eq('id', requestId);
      if (error) throw error;
      toast.success('Friend request declined');
      await fetchFriendsData();
    } catch { toast.error('Failed to decline request'); }
    finally { setActionLoading(null); }
  };

  const handleCancelRequest = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { error } = await supabase.from('friends').delete().eq('id', requestId);
      if (error) throw error;
      toast.success('Request cancelled');
      await fetchFriendsData();
    } catch { toast.error('Failed to cancel request'); }
    finally { setActionLoading(null); }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    setActionLoading(friendshipId);
    try {
      const { error } = await supabase.from('friends').delete().eq('id', friendshipId);
      if (error) throw error;
      toast.success('Friend removed');
      await fetchFriendsData();
    } catch { toast.error('Failed to remove friend'); }
    finally { setActionLoading(null); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  /* ═══════════════════════════════════════════
     ROBLOX 2020 LAYOUT
     ═══════════════════════════════════════════ */
  if (isRoblox) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Friends ({friends.length})</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Incoming Requests */}
            {incomingRequests.length > 0 && (
              <div className="rbx-panel">
                <div className="rbx-panel-header">
                  <span className="text-sm font-bold text-foreground">Friend Requests ({incomingRequests.length})</span>
                </div>
                <div className="p-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                  {incomingRequests.map((request) => (
                    <div key={request.id} className="flex flex-col items-center gap-2">
                      <Link to={`/profile/${request.requester_id}`}>
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border bg-muted">
                          <UserAvatar userId={request.requester_id} size="lg" />
                        </div>
                      </Link>
                      <span className="text-xs text-foreground font-medium text-center truncate w-full">
                        {request.profile?.username}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAccept(request.id)}
                          disabled={actionLoading === request.id}
                          className="w-6 h-6 rounded-full bg-[#02b757] flex items-center justify-center hover:opacity-80"
                        >
                          <Check className="w-3 h-3 text-white" />
                        </button>
                        <button
                          onClick={() => handleDecline(request.id)}
                          disabled={actionLoading === request.id}
                          className="w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:opacity-80"
                        >
                          <X className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outgoing Requests */}
            {outgoingRequests.length > 0 && (
              <div className="rbx-panel">
                <div className="rbx-panel-header">
                  <span className="text-sm font-bold text-foreground">Sent Requests ({outgoingRequests.length})</span>
                </div>
                <div className="p-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                  {outgoingRequests.map((request) => (
                    <div key={request.id} className="flex flex-col items-center gap-2">
                      <Link to={`/profile/${request.addressee_id}`}>
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border bg-muted">
                          <UserAvatar userId={request.addressee_id} size="lg" />
                        </div>
                      </Link>
                      <span className="text-xs text-foreground font-medium text-center truncate w-full">
                        {request.profile?.username}
                      </span>
                      <button
                        onClick={() => handleCancelRequest(request.id)}
                        disabled={actionLoading === request.id}
                        className="text-[11px] text-muted-foreground hover:text-destructive"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends Grid — Roblox 2020 circular avatar style */}
            <div className="rbx-panel">
              <div className="rbx-panel-header">
                <span className="text-sm font-bold text-foreground">Friends ({friends.length})</span>
                <Link to="/users" className="text-xs font-semibold text-primary hover:underline">
                  Find Friends
                </Link>
              </div>
              {friends.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">You haven't added any friends yet.</p>
                  <Link to="/users" className="text-sm text-primary hover:underline mt-1 inline-block">
                    Find people to add
                  </Link>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                  {friends.map((friend) => (
                    <div key={friend.user_id} className="flex flex-col items-center gap-1.5 group relative">
                      <Link to={`/profile/${friend.user_id}`} className="flex flex-col items-center gap-1.5">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border bg-muted hover:border-primary/40 transition-colors">
                            <UserAvatar userId={friend.user_id} size="lg" />
                          </div>
                          {/* Online dot */}
                          {friend.is_online && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#02b757] border-2 border-card" />
                          )}
                        </div>
                        <span className="text-xs text-foreground font-medium text-center truncate w-full">
                          {friend.username}
                        </span>
                      </Link>
                      {/* Remove button on hover */}
                      <button
                        onClick={() => handleRemoveFriend(friend.friendshipId)}
                        disabled={actionLoading === friend.friendshipId}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
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
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <div className="font-bold">Friends</div>
                  <div className="text-sm text-muted-foreground">{friends.length} friends</div>
                </div>
              </div>
            </div>
            <div className="cyber-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-bold">Incoming</div>
                  <div className="text-sm text-muted-foreground">{incomingRequests.length} requests</div>
                </div>
              </div>
            </div>
            <div className="cyber-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <div className="font-bold">Outgoing</div>
                  <div className="text-sm text-muted-foreground">{outgoingRequests.length} sent</div>
                </div>
              </div>
            </div>
          </div>

          {incomingRequests.length > 0 && (
            <div className="cyber-card p-6 space-y-4">
              <h2 className="font-display font-bold flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" />
                Incoming Friend Requests
              </h2>
              <div className="space-y-3">
                {incomingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <Link to={`/profile/${request.requester_id}`} className="flex items-center gap-3">
                      <UserAvatar userId={request.requester_id} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{request.profile?.username}</span>
                          {request.profile?.is_verified && (
                            <img src="/images/verified-badge.png" alt="Verified" className="w-4 h-4" />
                          )}
                        </div>
                        <span className={`text-sm ${request.profile?.is_online ? 'text-accent' : 'text-muted-foreground'}`}>
                          {request.profile?.is_online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </Link>
                    <div className="flex gap-2">
                      <Button size="sm" variant="emerald" onClick={() => handleAccept(request.id)} disabled={actionLoading === request.id}>
                        <Check className="w-4 h-4" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDecline(request.id)} disabled={actionLoading === request.id}>
                        <X className="w-4 h-4" /> Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {outgoingRequests.length > 0 && (
            <div className="cyber-card p-6 space-y-4">
              <h2 className="font-display font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-secondary" />
                Sent Friend Requests
              </h2>
              <div className="space-y-3">
                {outgoingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <Link to={`/profile/${request.addressee_id}`} className="flex items-center gap-3">
                      <UserAvatar userId={request.addressee_id} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{request.profile?.username}</span>
                          {request.profile?.is_verified && (
                            <img src="/images/verified-badge.png" alt="Verified" className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">Pending...</span>
                      </div>
                    </Link>
                    <Button size="sm" variant="outline" onClick={() => handleCancelRequest(request.id)} disabled={actionLoading === request.id}>
                      <X className="w-4 h-4" /> Cancel
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="cyber-card p-6 space-y-4">
            <h2 className="font-display font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              Your Friends ({friends.length})
            </h2>
            {friends.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No friends yet</p>
                <Link to="/users" className="text-primary hover:underline text-sm">Find people to add</Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {friends.map((friend) => (
                  <div key={friend.user_id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <Link to={`/profile/${friend.user_id}`} className="flex items-center gap-3">
                      <div className="relative">
                        <UserAvatar userId={friend.user_id} size="md" />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${friend.is_online ? 'bg-accent' : 'bg-muted-foreground'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{friend.username}</span>
                          {friend.is_verified && (
                            <img src="/images/verified-badge.png" alt="Verified" className="w-4 h-4" />
                          )}
                        </div>
                        <span className={`text-sm ${friend.is_online ? 'text-accent' : 'text-muted-foreground'}`}>
                          {friend.is_online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => handleRemoveFriend(friend.friendshipId)} disabled={actionLoading === friend.friendshipId} className="text-destructive hover:text-destructive">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="cyber-card p-6">
            <h2 className="font-display font-bold mb-4">How to Add Friends</h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">1</span>
                </div>
                <p>Visit a user's profile from the Users page</p>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">2</span>
                </div>
                <p>Click the "Add Friend" button on their profile</p>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">3</span>
                </div>
                <p>Wait for them to accept your request</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Friends;
