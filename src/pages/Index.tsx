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

interface CatalogItem {
  id: string;
  name: string;
  image_url: string;
  price: number;
  item_type: string;
}

const toSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/* ─── Section Header ─── */
const SectionHeader = ({ title, seeAllTo }: { title: string; seeAllTo?: string }) => (
  <div className="flex items-center justify-between mb-3 px-1">
    <h2 className="text-[17px] font-bold text-foreground">{title}</h2>
    {seeAllTo && (
      <Link to={seeAllTo} className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
        See All
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" /></svg>
      </Link>
    )}
  </div>
);

const Index = () => {
  const { user, profile, isAdmin } = useAuth();
  const { theme } = useTheme();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [featuredItems, setFeaturedItems] = useState<CatalogItem[]>([]);
  const [recentItems, setRecentItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [friendshipsRes, announcementsRes, featuredRes, recentRes] = await Promise.all([
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
      supabase
        .from('catalog_items')
        .select('id, name, image_url, price, item_type')
        .eq('is_on_sale', true)
        .order('created_at', { ascending: false })
        .limit(12),
      supabase
        .from('catalog_items')
        .select('id, name, image_url, price, item_type')
        .order('updated_at', { ascending: false })
        .limit(12),
    ]);

    if (announcementsRes.data) setAnnouncements(announcementsRes.data);
    if (featuredRes.data) setFeaturedItems(featuredRes.data);
    if (recentRes.data) setRecentItems(recentRes.data);

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

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-5 space-y-7">

      {/* ══════════ FRIENDS ══════════ */}
      <section>
        <SectionHeader title={`Friends (${friends.length})`} seeAllTo="/friends" />
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : friends.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">You haven't added any friends yet.</p>
            <Link to="/users" className="text-sm font-semibold text-primary hover:underline">Find People</Link>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {friends.map(friend => (
              <Link
                key={friend.user_id}
                to={`/profile/${friend.user_id}`}
                className="flex-shrink-0 w-[80px] group text-center"
              >
                <div className="relative mx-auto w-[64px] h-[64px]">
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-border bg-muted group-hover:border-primary/50 transition-colors">
                    <UserAvatar userId={friend.user_id} size="lg" className="w-full h-full" />
                  </div>
                  {friend.is_online && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-accent border-[2.5px] border-card" />
                  )}
                </div>
                <span className="block mt-1.5 text-[11px] text-foreground truncate leading-tight">{friend.username}</span>
                {friend.is_online ? (
                  <span className="text-[10px] text-accent leading-tight">Online</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground leading-tight">Offline</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ══════════ RECOMMENDED FOR YOU (Featured Items) ══════════ */}
      {featuredItems.length > 0 && (
        <section>
          <SectionHeader title="Recommended For You" seeAllTo="/catalog" />
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {featuredItems.map(item => (
              <Link
                key={item.id}
                to={`/catalog/${toSlug(item.name)}`}
                className="flex-shrink-0 w-[150px] md:w-[170px] group"
              >
                {/* Thumbnail */}
                <div className="aspect-square rounded-xl bg-muted/50 border border-border overflow-hidden group-hover:border-primary/40 transition-colors relative">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-contain p-3"
                    loading="lazy"
                  />
                  {item.item_type === 'limited' && (
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-secondary text-secondary-foreground">
                      Limited
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="mt-2 px-0.5">
                  <div className="text-xs font-medium text-foreground truncate leading-tight">{item.name}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[11px] text-muted-foreground">💎</span>
                    <span className="text-[11px] font-semibold text-foreground">{item.price.toLocaleString()}</span>
                  </div>
                </div>
                {/* Action button */}
                <div className="mt-2">
                  <div className="w-full py-1.5 text-center text-xs font-semibold rounded-lg bg-primary text-primary-foreground group-hover:bg-primary/90 transition-colors">
                    View
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ══════════ CONTINUE (Recent / Updated Items) ══════════ */}
      {recentItems.length > 0 && (
        <section>
          <SectionHeader title="Continue" seeAllTo="/catalog" />
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {recentItems.map(item => (
              <Link
                key={item.id}
                to={`/catalog/${toSlug(item.name)}`}
                className="flex-shrink-0 w-[130px] md:w-[150px] group"
              >
                <div className="aspect-square rounded-xl bg-muted/50 border border-border overflow-hidden group-hover:border-primary/40 transition-colors relative">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-contain p-3"
                    loading="lazy"
                  />
                  {item.item_type === 'limited' && (
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-secondary text-secondary-foreground">
                      Limited
                    </div>
                  )}
                </div>
                <div className="mt-2 px-0.5">
                  <div className="text-xs font-medium text-foreground truncate leading-tight">{item.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">💎 {item.price.toLocaleString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ══════════ MY FEED (Announcements) ══════════ */}
      {announcements.length > 0 && (
        <section>
          <SectionHeader title="My Feed" />
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
            {announcements.map(a => (
              <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center bg-primary">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-primary-foreground">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug text-foreground">{a.text}</p>
                  {a.link_url && (
                    <a href={a.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-0.5 inline-block">
                      {a.link_text || 'Learn more'}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════ QUICK ACTIONS ══════════ */}
      <section>
        <SectionHeader title="Quick Actions" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { label: 'Avatar Shop', href: '/catalog', icon: '🛒', desc: 'Browse items' },
            { label: 'Trading', href: '/trading', icon: '🔄', desc: 'Trade with others' },
            { label: 'Customize', href: '/avatar', icon: '👤', desc: 'Edit your look' },
            { label: 'Promo Codes', href: '/promocodes', icon: '🎁', desc: 'Redeem codes' },
            { label: 'Leaderboards', href: '/leaderboards', icon: '🏆', desc: 'Top players' },
            { label: 'Find People', href: '/users', icon: '👥', desc: 'Meet players' },
            { label: 'Inbox', href: '/inbox', icon: '✉️', desc: 'Messages' },
            ...(isAdmin ? [{ label: 'Admin', href: '/admin', icon: '⚙️', desc: 'Manage site' }] : []),
          ].map(item => (
            <Link
              key={item.href}
              to={item.href}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:bg-muted/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════ MY PROFILE CARD ══════════ */}
      <section>
        <SectionHeader title="My Profile" seeAllTo={`/profile/${user.id}`} />
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-4">
            <Link to={`/profile/${user.id}`} className="shrink-0">
              <div className="w-[72px] h-[72px] rounded-full overflow-hidden border-2 border-border bg-muted hover:border-primary/50 transition-colors">
                <UserAvatar userId={user.id} size="xl" className="w-full h-full" />
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-foreground">{profile.username}</h3>
                {profile.is_verified && <img src="/images/verified-badge.png" alt="Verified" className="w-4 h-4" />}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>💎 <span className="font-semibold text-foreground">{profile.emeralds.toLocaleString()}</span></span>
                <span>·</span>
                <span>{friends.length} Friends</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Link to="/avatar" className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  Customize
                </Link>
                <Link to="/catalog" className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-muted border border-border text-foreground hover:bg-muted/80 transition-colors">
                  Shop
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
