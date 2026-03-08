import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { UserAvatar } from '@/components/avatar/UserAvatar';

interface Friend {
  user_id: string;
  username: string;
  is_online: boolean | null;
  is_verified: boolean | null;
}

interface Announcement {
  id: string;
  text: string;
  link_url: string | null;
  link_text: string | null;
}

/* ═══════════════════════════════════════════════════
   SODABLOX 2015 Home — Dark charcoal topbar era
   White panels, #e6e6e6 background, Bootstrap-like grid
   ═══════════════════════════════════════════════════ */

export const Roblox2015Home = () => {
  const { user, profile, isAdmin } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [friendshipsRes, announcementsRes] = await Promise.all([
      supabase
        .from('friends')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
      supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    if (announcementsRes.data) setAnnouncements(announcementsRes.data);

    if (friendshipsRes.data && friendshipsRes.data.length > 0) {
      const friendIds = friendshipsRes.data.map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );
      const { data: profiles } = await supabase
        .from('public_profiles' as any)
        .select('user_id, username, is_online, is_verified')
        .in('user_id', friendIds);

      if (profiles) {
        setFriends(
          profiles.sort((a, b) => {
            if (a.is_online && !b.is_online) return -1;
            if (!a.is_online && b.is_online) return 1;
            return 0;
          })
        );
      }
    }
    setLoading(false);
  };

  if (!user || !profile) return null;

  return (
    <div className="rbx15-home">
      {/* Welcome panel */}
      <div className="rbx15-panel">
        <div className="rbx15-panel-header">Welcome back, {profile.username}!</div>
        <div className="rbx15-panel-body">
          <div className="flex items-center gap-4">
            <Link to={`/profile/${user.id}`} className="shrink-0">
              <div className="w-[100px] h-[100px] overflow-hidden border border-[#c3c3c3]">
                <UserAvatar userId={user.id} size="xl" className="w-full h-full" />
              </div>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                {profile.is_verified && (
                  <img src="/images/verified-badge.png" alt="Verified" className="w-4 h-4" />
                )}
                <span className="rbx15-username">{profile.username}</span>
              </div>
              <p className="rbx15-text-muted">
                💎 <strong>{profile.emeralds.toLocaleString()}</strong> Emeralds · {friends.length} Friends
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Link to="/avatar" className="rbx15-btn-primary">Customize</Link>
                <Link to="/catalog" className="rbx15-btn-primary">Shop</Link>
                {isAdmin && (
                  <Link to="/admin" className="rbx15-btn-danger">Admin</Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rbx15-panel">
        <div className="rbx15-panel-header">Quick Actions</div>
        <div className="rbx15-panel-body">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {[
              { label: 'Avatar Shop', href: '/catalog', emoji: '🛒' },
              { label: 'Trading', href: '/trading', emoji: '🔄' },
              { label: 'Avatar Editor', href: '/avatar', emoji: '👤' },
              { label: 'Promo Codes', href: '/promocodes', emoji: '🎁' },
              { label: 'Leaderboards', href: '/leaderboards', emoji: '🏆' },
            ].map(item => (
              <Link
                key={item.href}
                to={item.href}
                className="rbx15-quick-action"
              >
                <span className="text-2xl">{item.emoji}</span>
                <span className="rbx15-quick-action-label">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="rbx15-panel">
          <div className="rbx15-panel-header">📢 Announcements</div>
          <div className="rbx15-panel-body">
            {announcements.map((a, i) => (
              <div
                key={a.id}
                className={i < announcements.length - 1 ? 'py-2 border-b border-[#ddd]' : 'py-2'}
              >
                <p className="rbx15-text" style={{ marginBottom: 2 }}>{a.text}</p>
                {a.link_url && (
                  <a
                    href={a.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rbx15-link"
                  >
                    {a.link_text || 'Learn more'}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends */}
      <div className="rbx15-panel">
        <div className="rbx15-panel-header">Friends ({friends.length})</div>
        <div className="rbx15-panel-body">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="rbx15-spinner" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-6">
              <p className="rbx15-text-muted mb-2">You haven't added any friends yet.</p>
              <Link to="/users" className="rbx15-link">Find People</Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {friends.slice(0, 16).map(friend => (
                <Link
                  key={friend.user_id}
                  to={`/profile/${friend.user_id}`}
                  className="rbx15-friend-tile"
                >
                  <div className="relative">
                    <div className="rbx15-friend-avatar">
                      <UserAvatar userId={friend.user_id} size="lg" className="w-full h-full" />
                    </div>
                    {friend.is_online && <div className="rbx15-online-dot" />}
                  </div>
                  <span className="rbx15-friend-name">{friend.username}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
