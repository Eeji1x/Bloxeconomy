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

export const Roblox2020Home = () => {
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
        .from('profiles')
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

  const onlineFriends = friends.filter(f => f.is_online);

  /* Section header component — matches real Roblox "Most Engaging" / "Recommended For You" headers */
  const SectionHeader = ({ title, seeAllTo }: { title: string; seeAllTo?: string }) => (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[20px] font-bold" style={{ color: '#191b1d' }}>{title}</h2>
      {seeAllTo && (
        <Link to={seeAllTo} className="text-[12px] font-semibold flex items-center gap-1 hover:underline" style={{ color: '#606162' }}>
          See All
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
          </svg>
        </Link>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── My Feed / Announcements ── */}
      {announcements.length > 0 && (
        <div>
          <SectionHeader title="My Feed" />
          <div className="rbx-panel">
            <div className="divide-y" style={{ borderColor: '#e0e0e0' }}>
              {announcements.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ background: '#0074BD' }}>
                    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] leading-snug" style={{ color: '#191b1d' }}>{a.text}</p>
                    {a.link_url && (
                      <a href={a.link_url} target="_blank" rel="noopener noreferrer"
                        className="text-[12px] hover:underline mt-0.5 inline-block" style={{ color: '#0074BD' }}>
                        {a.link_text || 'Learn more'}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Continue (quick actions as game-tile-style cards) ── */}
      <div>
        <SectionHeader title="Continue" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { label: 'Avatar Shop', href: '/catalog', icon: '🛒' },
            { label: 'Trading', href: '/trading', icon: '🔄' },
            { label: 'Avatar Editor', href: '/avatar', icon: '👤' },
            { label: 'Promo Codes', href: '/promocodes', icon: '🎁' },
            { label: 'Leaderboards', href: '/leaderboards', icon: '🏆' },
          ].map((item) => (
            <Link key={item.href} to={item.href}
              className="rbx20-game-tile group flex flex-col rounded-lg overflow-hidden transition-shadow hover:shadow-md"
              style={{ background: '#fff' }}>
              <div className="aspect-square flex items-center justify-center text-3xl"
                style={{ background: '#f2f4f5' }}>
                {item.icon}
              </div>
              <div className="px-2 py-2">
                <p className="text-[12px] font-semibold truncate" style={{ color: '#191b1d' }}>{item.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Friends ── */}
      <div>
        <SectionHeader title={`Friends (${friends.length})`} seeAllTo="/friends" />
        <div className="rbx-panel">
          <div className="p-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: '#0074BD', borderTopColor: 'transparent' }} />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[14px] mb-2" style={{ color: '#606162' }}>You haven't added any friends yet.</p>
                <Link to="/users" className="text-[14px] font-semibold hover:underline" style={{ color: '#0074BD' }}>
                  Find People
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {friends.slice(0, 16).map((friend) => (
                  <Link key={friend.user_id} to={`/profile/${friend.user_id}`}
                    className="flex flex-col items-center gap-1.5 group">
                    <div className="relative">
                      <div className="w-[72px] h-[72px] rounded-full overflow-hidden border-2 group-hover:border-[#0074BD] transition-colors"
                        style={{ borderColor: '#e0e0e0', background: '#f2f4f5' }}>
                        <UserAvatar userId={friend.user_id} size="lg" className="w-full h-full" />
                      </div>
                      {friend.is_online && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white"
                          style={{ background: '#02b757' }} />
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-center w-[72px] truncate" style={{ color: '#191b1d' }}>
                      {friend.username}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── My Profile Card ── */}
      <div>
        <SectionHeader title="My Profile" seeAllTo={`/profile/${user.id}`} />
        <div className="rbx-panel">
          <div className="p-5 flex items-center gap-5">
            <Link to={`/profile/${user.id}`} className="shrink-0">
              <div className="w-[88px] h-[88px] rounded-full overflow-hidden border-2"
                style={{ borderColor: '#e0e0e0', background: '#f2f4f5' }}>
                <UserAvatar userId={user.id} size="xl" className="w-full h-full" />
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {profile.is_verified && (
                  <img src="/images/verified-badge.png" alt="Verified" className="w-4 h-4" />
                )}
                <h2 className="text-[20px] font-bold truncate" style={{ color: '#191b1d' }}>
                  {profile.username}
                </h2>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[14px]" style={{ color: '#606162' }}>
                <span className="flex items-center gap-1">
                  <span>💎</span>
                  <span className="font-semibold" style={{ color: '#191b1d' }}>{profile.emeralds.toLocaleString()}</span>
                </span>
                <span>·</span>
                <span>{friends.length} Friends</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Link to="/avatar"
                  className="rbx20-btn-primary px-5 py-1.5 rounded-[4px] text-[13px] font-bold text-white"
                  style={{ background: '#0074BD' }}>
                  Customize
                </Link>
                <Link to="/catalog"
                  className="px-5 py-1.5 rounded-[4px] text-[13px] font-bold border"
                  style={{ borderColor: '#b8b8b8', color: '#191b1d', background: '#fff' }}>
                  Shop
                </Link>
                {isAdmin && (
                  <Link to="/admin"
                    className="px-5 py-1.5 rounded-[4px] text-[13px] font-bold text-white"
                    style={{ background: '#e34d4d' }}>
                    Admin
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
