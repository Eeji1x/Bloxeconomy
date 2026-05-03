import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { UserAvatar } from '@/components/avatar/UserAvatar';

interface Friend {
  user_id: string;
  username: string;
  is_online: boolean | null;
}

interface Announcement {
  id: string;
  text: string;
  link_url: string | null;
  link_text: string | null;
}

export const Roblox2012Home = () => {
  const { user, profile, isAdmin } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [friendsRes, announcementsRes] = await Promise.all([
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

    if (friendsRes.data && friendsRes.data.length > 0) {
      const friendIds = friendsRes.data.map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );
      const { data: profiles } = await (supabase as any)
        .from('public_profiles')
        .select('user_id, username, is_online')
        .in('user_id', friendIds);
      if (profiles) setFriends(profiles);
    }
    setLoading(false);
  };

  if (!user || !profile) return null;

  return (
    <div className="rbx12-home-layout">
      {/* Left column */}
      <div className="rbx12-home-left">
        {/* User info panel */}
        <div className="rbx12-panel">
          <div className="rbx12-panel-header">My BloxEconomy</div>
          <div className="rbx12-panel-body">
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="rbx12-avatar-frame">
                <UserAvatar userId={user.id} size="xl" className="w-full h-full" />
              </div>
              <div style={{ flex: 1 }}>
                <div className="rbx12-username">{profile.username}</div>
                <div className="rbx12-user-stats">
                  <span>User #{profile.numeric_id}</span>
                  <span>💎 {profile.emeralds.toLocaleString()} Emeralds</span>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                  <Link to="/avatar" className="rbx12-btn-primary">Character</Link>
                  <Link to="/catalog" className="rbx12-btn-primary">Catalog</Link>
                  <Link to={`/profile/${profile.user_id}`} className="rbx12-btn-primary">Profile</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick navigation */}
        <div className="rbx12-panel">
          <div className="rbx12-panel-header">Quick Links</div>
          <div className="rbx12-panel-body">
            <div className="rbx12-quick-links">
              {[
                { label: '🛒 Catalog', href: '/catalog' },
                { label: '🔄 Trade', href: '/trading' },
                { label: '👥 People', href: '/users' },
                { label: '🎁 Promo Codes', href: '/promocodes' },
                { label: '🏆 Leaderboards', href: '/leaderboards' },
                { label: '🎮 Sodamons', href: '/sodamons' },
              ].map(item => (
                <Link key={item.href} to={item.href} className="rbx12-quick-link">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="rbx12-panel">
            <div className="rbx12-panel-header" style={{ background: '#c44' , color: '#fff' }}>Admin</div>
            <div className="rbx12-panel-body">
              <Link to="/admin" className="rbx12-btn-danger" style={{ width: '100%' }}>
                Admin Panel
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Right column */}
      <div className="rbx12-home-right">
        {/* BloxEconomy News */}
        {announcements.length > 0 && (
          <div className="rbx12-panel">
            <div className="rbx12-panel-header">BloxEconomy News</div>
            <div className="rbx12-panel-body">
              {announcements.map((a) => (
                <div key={a.id} className="rbx12-news-item">
                  <span className="rbx12-news-bullet">▸</span>
                  <span>{a.text}</span>
                  {a.link_url && (
                    <a
                      href={a.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rbx12-news-link"
                    >
                      {a.link_text || 'See More ▸'}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Featured content area */}
        <div className="rbx12-panel">
          <div className="rbx12-panel-header">Welcome to BloxEconomy</div>
          <div className="rbx12-panel-body">
            <div className="rbx12-welcome-banner">
              <h2 style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 }}>
                Welcome, {profile.username}!
              </h2>
              <p style={{ color: '#666', marginBottom: 12 }}>
                Collect items, trade limiteds, and build your legacy on BloxEconomy.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to="/catalog" className="rbx12-btn-green">Browse Catalog</Link>
                <Link to="/trading" className="rbx12-btn-primary">Start Trading</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Friends */}
        <div className="rbx12-panel">
          <div className="rbx12-panel-header">
            Friends ({friends.length})
            <Link to="/friends" className="rbx12-panel-header-link">See All</Link>
          </div>
          <div className="rbx12-panel-body">
            {loading ? (
              <p style={{ color: '#666', textAlign: 'center', padding: 16 }}>Loading...</p>
            ) : friends.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', padding: 16 }}>
                No friends yet. <Link to="/users" style={{ color: '#0066cc' }}>Find people!</Link>
              </p>
            ) : (
              <div className="rbx12-friends-grid">
                {friends.slice(0, 12).map((f) => (
                  <Link key={f.user_id} to={`/profile/${f.user_id}`} className="rbx12-friend-tile">
                    <div className="rbx12-friend-avatar">
                      <UserAvatar userId={f.user_id} size="md" className="w-full h-full" />
                    </div>
                    <span className="rbx12-friend-name">{f.username}</span>
                    {f.is_online && <span className="rbx12-friend-online">Online</span>}
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
