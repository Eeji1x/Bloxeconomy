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
   Roblox 2020-2021 Home — 1:1 replica
   Sections: Continue, My Feed, Friends, Profile card
   White panels, #f2f4f5 bg, 8px rounded corners
   ═══════════════════════════════════════════════════ */

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

  /* ── Section header — matches real Roblox "Continue" / "My Feed" style ── */
  const SectionHeader = ({ title, seeAllTo }: { title: string; seeAllTo?: string }) => (
    <div className="flex items-center justify-between mb-2">
      <h2 className="rbx20-section-title">{title}</h2>
      {seeAllTo && (
        <Link to={seeAllTo} className="rbx20-see-all">
          See All
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
          </svg>
        </Link>
      )}
    </div>
  );

  return (
    <div className="rbx20-home-container">
      {/* ── Continue (quick actions styled as game tiles) ── */}
      <section className="rbx20-section">
        <SectionHeader title="Continue" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
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
              className="rbx20-game-tile group"
            >
              <div className="rbx20-game-tile-thumb">
                <span className="text-3xl">{item.emoji}</span>
              </div>
              <div className="rbx20-game-tile-info">
                <span className="rbx20-game-tile-name">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── My Feed / Announcements ── */}
      {announcements.length > 0 && (
        <section className="rbx20-section">
          <SectionHeader title="My Feed" />
          <div className="rbx20-card">
            {announcements.map((a, i) => (
              <div
                key={a.id}
                className={cn(
                  'flex items-start gap-3 px-4 py-3',
                  i < announcements.length - 1 && 'border-b border-[#e0e0e0]'
                )}
              >
                <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center" style={{ background: '#0074bd' }}>
                  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] leading-snug" style={{ color: '#191b1d' }}>{a.text}</p>
                  {a.link_url && (
                    <a
                      href={a.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] hover:underline mt-0.5 inline-block"
                      style={{ color: '#0074bd' }}
                    >
                      {a.link_text || 'Learn more'}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Friends ── */}
      <section className="rbx20-section">
        <SectionHeader title={`Friends (${friends.length})`} seeAllTo="/friends" />
        <div className="rbx20-card p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="rbx20-spinner" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[13px] mb-2" style={{ color: '#606162' }}>
                You haven't added any friends yet.
              </p>
              <Link
                to="/users"
                className="text-[13px] font-semibold hover:underline"
                style={{ color: '#0074bd' }}
              >
                Find People
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {friends.slice(0, 16).map(friend => (
                <Link
                  key={friend.user_id}
                  to={`/profile/${friend.user_id}`}
                  className="rbx20-friend-tile group"
                >
                  <div className="relative">
                    <div className="rbx20-friend-avatar">
                      <UserAvatar userId={friend.user_id} size="lg" className="w-full h-full" />
                    </div>
                    {friend.is_online && (
                      <div className="rbx20-online-dot" />
                    )}
                  </div>
                  <span className="rbx20-friend-name">{friend.username}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── My Profile Card ── */}
      <section className="rbx20-section">
        <SectionHeader title="My Profile" seeAllTo={`/profile/${user.id}`} />
        <div className="rbx20-card p-5">
          <div className="flex items-center gap-4">
            <Link to={`/profile/${user.id}`} className="shrink-0">
              <div className="rbx20-profile-avatar">
                <UserAvatar userId={user.id} size="xl" className="w-full h-full" />
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {profile.is_verified && (
                  <img src="/images/verified-badge.png" alt="Verified" className="w-4 h-4" />
                )}
                <h3 className="rbx20-profile-username">{profile.username}</h3>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[13px]" style={{ color: '#606162' }}>
                <span className="flex items-center gap-1">
                  <span>💎</span>
                  <span className="font-semibold" style={{ color: '#191b1d' }}>
                    {profile.emeralds.toLocaleString()}
                  </span>
                </span>
                <span>·</span>
                <span>{friends.length} Friends</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Link to="/avatar" className="rbx20-btn-primary">
                  Customize
                </Link>
                <Link to="/catalog" className="rbx20-btn-secondary">
                  Shop
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="rbx20-btn-danger">
                    Admin
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Helper
function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
