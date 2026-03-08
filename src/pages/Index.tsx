import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { UserAvatar } from '@/components/avatar/UserAvatar';
import { Roblox2016Home } from '@/components/home/Roblox2016Home';
import { Roblox2015Home } from '@/components/home/Roblox2015Home';
import { Roblox2012Home } from '@/components/home/Roblox2012Home';
import { Roblox2008Home } from '@/components/home/Roblox2008Home';

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

const SectionHeader = ({ title, seeAllTo }: { title: string; seeAllTo?: string }) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-lg font-bold text-foreground">{title}</h2>
    {seeAllTo && (
      <Link to={seeAllTo} className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
        See All
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" /></svg>
      </Link>
    )}
  </div>
);

const Index = () => {
  const { user, profile, isAdmin } = useAuth();
  const { theme } = useTheme();
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

  if (!user) return <Navigate to="/auth" replace />;
  if (theme === 'roblox2008') return <Roblox2008Home />;
  if (theme === 'roblox2012') return <Roblox2012Home />;
  if (theme === 'roblox2015') return <Roblox2015Home />;
  if (theme === 'roblox2016') return <Roblox2016Home />;

  if (!profile) return null;

  const quickActions = [
    { label: 'Avatar Shop', href: '/catalog', emoji: '🛒' },
    { label: 'Trading', href: '/trading', emoji: '🔄' },
    { label: 'Avatar Editor', href: '/avatar', emoji: '👤' },
    { label: 'Promo Codes', href: '/promocodes', emoji: '🎁' },
    { label: 'Leaderboards', href: '/leaderboards', emoji: '🏆' },
    { label: 'Find People', href: '/users', emoji: '👥' },
  ];

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-8">

      {/* ══════════ CONTINUE ══════════ */}
      <section>
        <SectionHeader title="Continue" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {quickActions.map(item => (
            <Link
              key={item.href}
              to={item.href}
              className="group"
            >
              <div className="aspect-square rounded-lg bg-muted/50 border border-border flex items-center justify-center group-hover:border-primary/40 transition-colors">
                <span className="text-3xl md:text-4xl">{item.emoji}</span>
              </div>
              <div className="mt-1.5 text-xs font-medium text-foreground truncate text-center">{item.label}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════ MY FEED ══════════ */}
      {announcements.length > 0 && (
        <section>
          <SectionHeader title="My Feed" />
          <div className="bg-card border border-border rounded-lg overflow-hidden divide-y divide-border">
            {announcements.map(a => (
              <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center bg-primary">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary-foreground">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug text-foreground">{a.text}</p>
                  {a.link_url && (
                    <a
                      href={a.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-0.5 inline-block"
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

      {/* ══════════ FRIENDS ══════════ */}
      <section>
        <SectionHeader title={`Friends (${friends.length})`} seeAllTo="/friends" />
        <div className="bg-card border border-border rounded-lg p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-2">You haven't added any friends yet.</p>
              <Link to="/users" className="text-sm font-semibold text-primary hover:underline">Find People</Link>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
              {friends.slice(0, 20).map(friend => (
                <Link
                  key={friend.user_id}
                  to={`/profile/${friend.user_id}`}
                  className="group text-center"
                >
                  <div className="relative">
                    <div className="aspect-square rounded-full overflow-hidden border border-border bg-muted group-hover:border-primary/40 transition-colors">
                      <UserAvatar userId={friend.user_id} size="lg" className="w-full h-full" />
                    </div>
                    {friend.is_online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-accent border-2 border-card" />
                    )}
                  </div>
                  <span className="block mt-1 text-[11px] text-foreground truncate">{friend.username}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════ MY PROFILE CARD ══════════ */}
      <section>
        <SectionHeader title="My Profile" seeAllTo={`/profile/${user.id}`} />
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-4">
            <Link to={`/profile/${user.id}`} className="shrink-0">
              <div className="w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-full overflow-hidden border-2 border-border bg-muted">
                <UserAvatar userId={user.id} size="xl" className="w-full h-full" />
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-foreground">{profile.username}</h3>
                {profile.is_verified && (
                  <img src="/images/verified-badge.png" alt="Verified" className="w-4 h-4" />
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  💎 <span className="font-semibold text-foreground">{profile.emeralds.toLocaleString()}</span>
                </span>
                <span>·</span>
                <span>{friends.length} Friends</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Link
                  to="/avatar"
                  className="px-4 py-1.5 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Customize
                </Link>
                <Link
                  to="/catalog"
                  className="px-4 py-1.5 text-sm font-semibold rounded-md bg-muted border border-border text-foreground hover:bg-muted/80 transition-colors"
                >
                  Shop
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="px-4 py-1.5 text-sm font-semibold rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                  >
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

export default Index;
