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
    <div className="space-y-3">
      {/* Welcome banner */}
      <div className="rbx08-panel">
        <div className="rbx08-panel-header">SODABLOX Virtual Playworld</div>
        <div className="p-3">
          <div className="flex items-start gap-4">
            <div className="w-[80px] h-[80px] rounded border border-[#c0c0c0] overflow-hidden bg-[#eee] shrink-0">
              <UserAvatar userId={user.id} size="xl" className="w-full h-full" />
            </div>
            <div className="flex-1">
              <h2 className="text-[14px] font-bold text-[#003366]">
                Welcome back, {profile.username}!
              </h2>
              <p className="text-[11px] text-[#666] mt-1">
                User #{profile.numeric_id} · 💎 {profile.emeralds.toLocaleString()} Emeralds
              </p>
              <div className="flex gap-2 mt-2">
                <Link to="/avatar" className="rbx08-btn-blue text-[10px]">
                  Customize Avatar
                </Link>
                <Link to="/catalog" className="rbx08-btn-blue text-[10px]">
                  Browse Catalog
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="rbx08-btn-red text-[10px]">
                    Admin
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="rbx08-panel">
          <div className="rbx08-panel-header">📢 Announcements</div>
          <div className="divide-y divide-[#d0d0d0]">
            {announcements.map((a) => (
              <div key={a.id} className="px-3 py-2">
                <p className="text-[11px] text-[#333]">{a.text}</p>
                {a.link_url && (
                  <a
                    href={a.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-[#0055BF] hover:underline"
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
        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { label: '🛒 Catalog', href: '/catalog' },
            { label: '🔄 Trade', href: '/trading' },
            { label: '👤 Avatar', href: '/avatar' },
            { label: '🎁 Promo Codes', href: '/promocodes' },
            { label: '🏆 Leaderboards', href: '/leaderboards' },
            { label: '👥 People', href: '/users' },
          ].map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="rbx08-link-card"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Friends */}
      <div className="rbx08-panel">
        <div className="rbx08-panel-header">
          Friends ({friends.length})
          <Link to="/friends" className="text-[10px] text-[#0055BF] hover:underline font-normal ml-2">
            See All
          </Link>
        </div>
        <div className="p-3">
          {loading ? (
            <p className="text-[11px] text-[#666] text-center py-4">Loading...</p>
          ) : friends.length === 0 ? (
            <p className="text-[11px] text-[#666] text-center py-4">
              No friends yet. <Link to="/users" className="text-[#0055BF] hover:underline">Find people!</Link>
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {friends.slice(0, 12).map((f) => (
                <Link key={f.user_id} to={`/profile/${f.user_id}`} className="text-center group">
                  <div className="w-[48px] h-[48px] mx-auto rounded border border-[#c0c0c0] overflow-hidden bg-[#eee]">
                    <UserAvatar userId={f.user_id} size="md" className="w-full h-full" />
                  </div>
                  <span className="text-[9px] text-[#0055BF] group-hover:underline block truncate mt-1">
                    {f.username}
                  </span>
                  {f.is_online && (
                    <span className="text-[8px] text-[#009900]">● Online</span>
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
