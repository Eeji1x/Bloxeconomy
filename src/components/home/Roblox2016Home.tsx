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

/* ═══════════════════════════════════════════════════════════════
   2016 ROBLOX Home Page — Pixel-perfect replica
   
   Real 2016 home layout:
   ┌──────────────────────────────────────────────┐
   │ [Avatar] Welcome back, Username!             │
   │          R$ 1,234 | Friends: 12              │
   │          [Customize] [Shop]                  │
   ├──────────────────────────────────────────────┤
   │ My Feed                                       │
   │ (announcements / activity)                    │
   ├──────────────────────────────────────────────┤
   │ Friends (12)                                  │
   │ [avatar grid of friend thumbnails]            │
   └──────────────────────────────────────────────┘
   ═══════════════════════════════════════════════════════════════ */

export const Roblox2016Home = () => {
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
        .limit(5),
    ]);

    if (announcementsRes.data) setAnnouncements(announcementsRes.data);

    if (friendshipsRes.data && friendshipsRes.data.length > 0) {
      const friendIds = friendshipsRes.data.map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );
      const { data: profiles } = await (supabase as any)
        .from('public_profiles')
        .select('user_id, username, is_online, is_verified')
        .in('user_id', friendIds);

      if (profiles) {
        setFriends(
          profiles.sort((a: Friend, b: Friend) => {
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
    <div className="rbx16-home">
      {/* ── Welcome Panel (matching real 2016 home header) ── */}
      <div className="rbx16-panel">
        <div className="rbx16-panel-header">
          <span className="rbx16-panel-header-text">Welcome back, {profile.username}!</span>
        </div>
        <div className="rbx16-panel-body">
          <div className="rbx16-welcome-row">
            <Link to={`/profile/${user.id}`} className="rbx16-welcome-avatar">
              <UserAvatar userId={user.id} size="xl" className="w-full h-full" />
            </Link>
            <div className="rbx16-welcome-info">
              <div className="rbx16-welcome-username-row">
                {profile.is_verified && (
                  <img src="/images/verified-badge.png" alt="Verified" className="rbx16-verified-badge" />
                )}
                <Link to={`/profile/${user.id}`} className="rbx16-welcome-username">{profile.username}</Link>
              </div>
              <div className="rbx16-welcome-stats">
                <span className="rbx16-stat-item">
                  <span className="icon-nav-robux" style={{ width: 16, height: 16, backgroundSize: '32px auto' }} />
                  <strong>{profile.emeralds.toLocaleString()}</strong>
                </span>
                <span className="rbx16-stat-separator">|</span>
                <span className="rbx16-stat-item">
                  Friends: <strong>{friends.length}</strong>
                </span>
              </div>
              <div className="rbx16-welcome-actions">
                <Link to="/avatar" className="rbx16-btn-control">Customize Character</Link>
                <Link to="/catalog" className="rbx16-btn-control">Avatar Shop</Link>
                <Link to={`/profile/${user.id}`} className="rbx16-btn-control">My Profile</Link>
                {isAdmin && (
                  <Link to="/admin" className="rbx16-btn-control rbx16-btn-control-admin">Admin</Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── My Feed / Announcements (real 2016 had "My Feed") ── */}
      <div className="rbx16-panel">
        <div className="rbx16-panel-header">
          <span className="rbx16-panel-header-text">My Feed</span>
        </div>
        <div className="rbx16-panel-body">
          {announcements.length === 0 ? (
            <p className="rbx16-text-muted" style={{ textAlign: 'center', padding: '16px 0' }}>
              No recent announcements.
            </p>
          ) : (
            <div className="rbx16-feed-list">
              {announcements.map((a, i) => (
                <div
                  key={a.id}
                  className={joinCn(
                    'rbx16-feed-item',
                    i < announcements.length - 1 && 'rbx16-feed-item-border'
                  )}
                >
                  <div className="rbx16-feed-icon">📢</div>
                  <div className="rbx16-feed-content">
                    <p className="rbx16-text">{a.text}</p>
                    {a.link_url && (
                      <a href={a.link_url} target="_blank" rel="noopener noreferrer" className="rbx16-link">
                        {a.link_text || 'Learn more'}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions (not in real 2016 but helpful navigation) ── */}
      <div className="rbx16-panel">
        <div className="rbx16-panel-header">
          <span className="rbx16-panel-header-text">Quick Actions</span>
        </div>
        <div className="rbx16-panel-body">
          <div className="rbx16-quick-grid">
            {[
              { label: 'Avatar Shop', href: '/catalog', emoji: '🛒' },
              { label: 'Trading', href: '/trading', emoji: '🔄' },
              { label: 'Avatar Editor', href: '/avatar', emoji: '👤' },
              { label: 'Promo Codes', href: '/promocodes', emoji: '🎁' },
              { label: 'Leaderboards', href: '/leaderboards', emoji: '🏆' },
            ].map(item => (
              <Link key={item.href} to={item.href} className="rbx16-quick-action">
                <span className="rbx16-quick-emoji">{item.emoji}</span>
                <span className="rbx16-quick-action-label">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Friends Panel (real 2016 had avatar thumbnail grid) ── */}
      <div className="rbx16-panel">
        <div className="rbx16-panel-header">
          <span className="rbx16-panel-header-text">Friends ({friends.length})</span>
          {friends.length > 0 && (
            <Link to="/friends" className="rbx16-panel-header-link">See All</Link>
          )}
        </div>
        <div className="rbx16-panel-body">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <div className="rbx16-spinner" />
            </div>
          ) : friends.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p className="rbx16-text-muted" style={{ marginBottom: 8 }}>You haven't added any friends yet.</p>
              <Link to="/users" className="rbx16-link">Find People</Link>
            </div>
          ) : (
            <div className="rbx16-friends-grid">
              {friends.slice(0, 18).map(friend => (
                <Link key={friend.user_id} to={`/profile/${friend.user_id}`} className="rbx16-friend-tile">
                  <div className="relative">
                    <div className="rbx16-friend-avatar">
                      <UserAvatar userId={friend.user_id} size="lg" className="w-full h-full" />
                    </div>
                    {friend.is_online && <div className="rbx16-online-dot" />}
                  </div>
                  <span className="rbx16-friend-name">{friend.username}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function joinCn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
