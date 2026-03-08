import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Users } from 'lucide-react';
import { UserAvatar } from '@/components/avatar/UserAvatar';

interface Friend {
  user_id: string;
  username: string;
  is_online: boolean | null;
  is_verified: boolean | null;
}

export const HomeFriendsList = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;

    // Get accepted friendships
    const { data: friendships } = await supabase
      .from('friends')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (!friendships || friendships.length === 0) {
      setLoading(false);
      return;
    }

    // Get friend user IDs
    const friendIds = friendships.map(f => 
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    // Fetch friend profiles
    const { data: profiles } = await (supabase as any)
      .from('public_profiles')
      .select('user_id, username, is_online, is_verified')
      .in('user_id', friendIds);

    if (profiles) {
      // Sort by online status
      const sorted = profiles.sort((a, b) => {
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;
        return 0;
      });
      setFriends(sorted);
    }

    setLoading(false);
  };

  const onlineFriends = friends.filter(f => f.is_online);

  return (
    <div className="cyber-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Online Friends
        </h3>
        <span className="text-sm text-accent">{onlineFriends.length}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : friends.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">No friends yet</p>
          <Link to="/users" className="text-sm text-primary hover:underline">
            Find people
          </Link>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {friends.slice(0, 10).map((friend) => (
            <Link
              key={friend.user_id}
              to={`/profile/${friend.user_id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="relative">
                <UserAvatar userId={friend.user_id} size="sm" />
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                  friend.is_online ? 'bg-accent' : 'bg-muted-foreground'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium truncate">{friend.username}</span>
                  {friend.is_verified && (
                    <img 
                      src="/images/verified-badge.png" 
                      alt="Verified" 
                      className="w-3 h-3"
                    />
                  )}
                </div>
              </div>
            </Link>
          ))}
          {friends.length > 10 && (
            <Link to="/friends" className="block text-center text-sm text-primary hover:underline py-2">
              View all ({friends.length})
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
