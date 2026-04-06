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
   2016 ROBLOX Home Page — Authentic replica
   
   Real 2016 home layout (two-column):
   ┌──────────────┬────────────────────────────────┐
   │ [Avatar]     │ My Feed                        │
   │ Username     │ (announcements / activity)     │
   │ R$ 1,234     │                                │
   │              ├────────────────────────────────┤
   │ [Customize]  │ Friends (12)                   │
   │ [Shop]       │ [avatar grid of thumbnails]    │
   │              │                                │
   │ Quick Links  │                                │
   │ · Trade      │                                │
   │ · Promo      │                                │
   └──────────────┴────────────────────────────────┘
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
    <div className="rbx16-home-two-col">
      {/* ── LEFT COLUMN: User card + Quick links ── */}
      <div className="rbx16-home-left">
        {/* ECS profileHeader style: avatar with #B8B8B8 border, maxWidth 110px */}
        <div className="rbx16-panel">
          <div className="rbx16-panel-body" style={{ padding: '12px', textAlign: 'center' }}>
            <Link to={`/profile/${user.id}`} style={{ display: 'block', marginBottom: 8 }}>
              <div style={{ border: '1px solid #B8B8B8', margin: '0 auto', maxWidth: 110, overflow: 'hidden' }}>
                <UserAvatar userId={user.id} size="xl" className="w-full h-full" />
              </div>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
              {profile.is_verified && (
                <img src="/images/verified-badge.png" alt="Verified" style={{ width: 14, height: 14 }} />
              )}
              <Link to={`/profile/${user.id}`} style={{ fontSize: 18, fontWeight: 400, color: '#1e1e1f', textDecoration: 'none' }}>{profile.username}</Link>
            </div>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span className="icon-nav-robux" style={{ width: 16, height: 16, backgroundSize: '32px auto' }} />
              <strong style={{ color: '#393b3d' }}>{profile.emeralds.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Link to="/avatar" className="rbx16-btn-control" style={{ justifyContent: 'center', width: '100%' }}>Character</Link>
              <Link to="/catalog" className="rbx16-btn-control" style={{ justifyContent: 'center', width: '100%' }}>Avatar Shop</Link>
              <Link to={`/profile/${user.id}`} className="rbx16-btn-control" style={{ justifyContent: 'center', width: '100%' }}>My Profile</Link>
              {isAdmin && (
                <Link to="/admin" className="rbx16-btn-control rbx16-btn-control-admin" style={{ justifyContent: 'center', width: '100%' }}>Admin</Link>
              )}
            </div>
          </div>
        </div>

        {/* Quick Links panel */}
        <div className="rbx16-panel">
          <div className="rbx16-panel-header">
            <span className="rbx16-panel-header-text">Quick Links</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { label: 'Avatar Shop', href: '/catalog' },
              { label: 'Trading', href: '/trading' },
              { label: 'Avatar Editor', href: '/avatar' },
              { label: 'Promo Codes', href: '/promocodes' },
              { label: 'Leaderboards', href: '/leaderboards' },
              { label: 'Sodamons', href: '/sodamons' },
            ].map(item => (
              <Link
                key={item.href}
                to={item.href}
                style={{
                  display: 'block',
                  padding: '7px 12px',
                  fontSize: 14,
                  color: '#00a2ff',
                  borderBottom: '1px solid #e3e3e3',
                  textDecoration: 'none',
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Friends count summary */}
        <div className="rbx16-panel">
          <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: '#393b3d', fontWeight: 600 }}>Friends</span>
            <span style={{ fontSize: 14, color: '#00a2ff', fontWeight: 700 }}>{friends.length}</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN: Feed + Friends grid ── */}
      <div className="rbx16-home-right">
        {/* My Feed */}
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

        {/* Friends Panel with avatar grid */}
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
    </div>
  );
};

function joinCn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
