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
        .from('public_profiles' as any)
        .select('user_id, username, is_online')
        .in('user_id', friendIds);
      if (profiles) setFriends(profiles);
    }
    setLoading(false);
  };

  if (!user || !profile) return null;

  return (
    <div>
      {/* Welcome panel — like madblox "My ROBLOX" */}
      <div className="rbx08-panel">
        <div className="rbx08-panel-header">Welcome to SODABLOX</div>
        <div className="rbx08-panel-body">
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 80, height: 80, border: 'solid 1px #000', background: '#eee', flexShrink: 0 }}>
              <UserAvatar userId={user.id} size="xl" className="w-full h-full" />
            </div>
            <div>
              <p style={{ fontWeight: 'bold', color: 'blue', marginBottom: 4 }}>
                Welcome back, {profile.username}!
              </p>
              <p style={{ color: '#666', marginBottom: 8 }}>
                User #{profile.numeric_id} · 💎 {profile.emeralds.toLocaleString()} Emeralds
              </p>
              <div style={{ display: 'flex', gap: 4 }}>
                <Link to="/avatar" className="rbx08-btn-primary">Customize Avatar</Link>
                <Link to="/catalog" className="rbx08-btn-primary">Browse Catalog</Link>
                {isAdmin && (
                  <Link to="/admin" className="rbx08-btn-red">Admin</Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements — "What's New" */}
      {announcements.length > 0 && (
        <div className="rbx08-panel">
          <div className="rbx08-panel-header">What's New</div>
          <div className="rbx08-panel-body">
            {announcements.map((a) => (
              <div key={a.id} style={{ borderBottom: 'solid 1px #ccc', paddingBottom: 6, marginBottom: 6 }}>
                <p style={{ color: '#333' }}>{a.text}</p>
                {a.link_url && (
                  <a
                    href={a.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'blue' }}
                  >
                    {a.link_text || 'Learn more →'}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links grid */}
      <div className="rbx08-panel">
        <div className="rbx08-panel-header">Quick Links</div>
        <div className="rbx08-panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
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
          <span style={{ fontWeight: 'normal', marginLeft: 8 }}>
            <Link to="/friends" style={{ color: 'blue' }}>See All</Link>
          </span>
        </div>
        <div className="rbx08-panel-body">
          {loading ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '16px 0' }}>Loading...</p>
          ) : friends.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '16px 0' }}>
              No friends yet.{' '}
              <Link to="/users" style={{ color: 'blue' }}>Find people!</Link>
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
              {friends.slice(0, 12).map((f) => (
                <Link key={f.user_id} to={`/profile/${f.user_id}`} style={{ textAlign: 'center', textDecoration: 'none' }}>
                  <div style={{ width: 48, height: 48, margin: '0 auto', border: 'solid 1px #000', background: '#eee' }}>
                    <UserAvatar userId={f.user_id} size="md" className="w-full h-full" />
                  </div>
                  <span style={{ color: 'blue', display: 'block', marginTop: 2 }}>
                    {f.username}
                  </span>
                  {f.is_online && (
                    <span style={{ fontSize: 9, color: 'green' }}>● Online</span>
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
