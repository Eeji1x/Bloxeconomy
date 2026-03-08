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

export const Roblox2008Home = () => {
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
        .limit(3),
    ]);

    if (announcementsRes.data) setAnnouncements(announcementsRes.data);

    if (friendsRes.data && friendsRes.data.length > 0) {
      const friendIds = friendsRes.data.map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, is_online')
        .in('user_id', friendIds);
      if (profiles) setFriends(profiles);
    }
    setLoading(false);
  };

  if (!user || !profile) return null;

  return (
    <div>
      {/* Welcome panel */}
      <div className="rbx08-panel">
        <div className="rbx08-panel-header">Welcome to SODABLOX!</div>
        <div className="rbx08-panel-body">
          <div className="flex items-start gap-4">
            <div style={{ width: 80, height: 80, border: '1px solid #C3C3C3', background: '#F1F1F1', flexShrink: 0 }}>
              <UserAvatar userId={user.id} size="xl" className="w-full h-full" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 'bold', color: '#003399', marginBottom: 4 }}>
                Welcome back, {profile.username}!
              </p>
              <p style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                User #{profile.numeric_id} · 💎 {profile.emeralds.toLocaleString()} Emeralds
              </p>
              <div className="flex gap-2">
                <Link to="/avatar" className="rbx08-btn-primary">Customize Avatar</Link>
                <Link to="/catalog" className="rbx08-btn-secondary">Browse Catalog</Link>
                {isAdmin && (
                  <Link to="/admin" className="rbx08-btn-red">Admin</Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="rbx08-panel">
          <div className="rbx08-panel-header">Announcements</div>
          <div className="rbx08-panel-body">
            {announcements.map((a) => (
              <div key={a.id} style={{ borderBottom: '1px solid #E6E6E6', paddingBottom: 6, marginBottom: 6 }}>
                <p style={{ fontSize: 12, color: '#333' }}>{a.text}</p>
                {a.link_url && (
                  <a
                    href={a.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, color: '#003399' }}
                  >
                    {a.link_text || 'Learn more →'}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="rbx08-panel">
        <div className="rbx08-panel-header">Quick Links</div>
        <div className="rbx08-panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: 'Catalog', href: '/catalog' },
              { label: 'Trade', href: '/trading' },
              { label: 'Avatar', href: '/avatar' },
              { label: 'Promo Codes', href: '/promocodes' },
              { label: 'Leaderboards', href: '/leaderboards' },
              { label: 'People', href: '/users' },
            ].map((item) => (
              <Link key={item.href} to={item.href} className="rbx08-link-card">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Friends */}
      <div className="rbx08-panel">
        <div className="rbx08-panel-header">
          Friends ({friends.length})
          <Link to="/friends" style={{ fontSize: 11, color: '#003399', fontWeight: 'normal', marginLeft: 8 }}>
            See All
          </Link>
        </div>
        <div className="rbx08-panel-body">
          {loading ? (
            <p style={{ fontSize: 12, color: '#666', textAlign: 'center', padding: '16px 0' }}>Loading...</p>
          ) : friends.length === 0 ? (
            <p style={{ fontSize: 12, color: '#666', textAlign: 'center', padding: '16px 0' }}>
              No friends yet.{' '}
              <Link to="/users" style={{ color: '#003399' }}>Find people!</Link>
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
              {friends.slice(0, 12).map((f) => (
                <Link key={f.user_id} to={`/profile/${f.user_id}`} style={{ textAlign: 'center', textDecoration: 'none' }}>
                  <div style={{ width: 48, height: 48, margin: '0 auto', border: '1px solid #C3C3C3', background: '#F1F1F1' }}>
                    <UserAvatar userId={f.user_id} size="md" className="w-full h-full" />
                  </div>
                  <span style={{ fontSize: 10, color: '#003399', display: 'block', marginTop: 2 }}>
                    {f.username}
                  </span>
                  {f.is_online && (
                    <span style={{ fontSize: 9, color: '#009900' }}>● Online</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
