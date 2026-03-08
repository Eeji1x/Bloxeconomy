import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { UserAvatar } from '@/components/avatar/UserAvatar';
import { Gem, ChevronRight, Megaphone, ExternalLink } from 'lucide-react';

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
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch friends & announcements in parallel
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

    if (announcementsRes.data) {
      setAnnouncements(announcementsRes.data);
    }

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

  return (
    <div className="max-w-[960px] mx-auto space-y-5">
      {/* ── Profile Header ── */}
      <div className="rbx-panel">
        <div className="p-6 flex items-center gap-6">
          {/* Large circular avatar */}
          <Link to="/profile" className="shrink-0">
            <div className="w-[100px] h-[100px] rounded-full overflow-hidden border-[3px] border-border bg-muted">
              <UserAvatar userId={user.id} size="xl" className="w-full h-full" />
            </div>
          </Link>
          {/* Username + info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {profile.is_verified && (
                <img src="/images/verified-badge.png" alt="Verified" className="w-5 h-5" />
              )}
              <h1 className="text-xl font-bold text-foreground truncate">
                {profile.username}
              </h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Gem className="w-4 h-4 text-[#02b757]" />
                <span className="font-medium text-foreground">{profile.emeralds.toLocaleString()}</span>
              </span>
              <span>ID: #{profile.numeric_id}</span>
            </div>
            {/* Action links */}
            <div className="flex items-center gap-3 mt-3">
              <Link
                to="/avatar"
                className="px-4 py-1.5 rounded text-xs font-semibold text-white"
                style={{ background: '#335FFF' }}
              >
                Edit Avatar
              </Link>
              <Link
                to={`/profile/${user.id}`}
                className="px-4 py-1.5 rounded text-xs font-semibold border text-foreground"
                style={{ borderColor: '#E5E7EB' }}
              >
                View Profile
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-4 py-1.5 rounded text-xs font-semibold text-white bg-destructive"
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Announcements ── */}
      {announcements.length > 0 && (
        <div className="rbx-panel">
          <div className="rbx-panel-header">
            <span className="text-sm font-bold text-foreground flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              Announcements
            </span>
          </div>
          <div className="p-4 space-y-2">
            {announcements.map((a) => (
              <div key={a.id} className="p-3 rounded border border-border bg-muted/30 text-sm text-foreground">
                {a.text}
                {a.link_url && (
                  <a href={a.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 ml-2 text-primary hover:underline">
                    {a.link_text || 'Learn more'} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Friends Section ── */}
      <div className="rbx-panel">
        <div className="rbx-panel-header">
          <span className="text-sm font-bold text-foreground">
            Friends ({friends.length})
          </span>
          <Link to="/friends" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            See All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-2">You haven't added any friends yet.</p>
              <Link to="/users" className="text-sm text-primary hover:underline">Find people to add</Link>
            </div>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-2">
              {friends.slice(0, 9).map((friend) => (
                <Link
                  key={friend.user_id}
                  to={`/profile/${friend.user_id}`}
                  className="flex flex-col items-center gap-1.5 shrink-0 group"
                >
                  <div className="relative">
                    <div className="w-[72px] h-[72px] rounded-full overflow-hidden border-2 border-border bg-muted group-hover:border-primary/40 transition-colors">
                      <UserAvatar userId={friend.user_id} size="lg" className="w-full h-full" />
                    </div>
                    {friend.is_online && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#02b757] border-2 border-white" />
                    )}
                  </div>
                  <span className="text-[11px] text-foreground font-medium text-center w-[72px] truncate">
                    {friend.username}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Links Grid ── */}
      <div className="rbx-panel">
        <div className="rbx-panel-header">
          <span className="text-sm font-bold text-foreground">Quick Links</span>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Catalog', href: '/catalog', emoji: '🛒' },
            { label: 'Trading', href: '/trading', emoji: '🔄' },
            { label: 'Promo Codes', href: '/promocodes', emoji: '🎁' },
            { label: 'Leaderboards', href: '/leaderboards', emoji: '🏆' },
          ].map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <span className="text-lg">{item.emoji}</span>
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
