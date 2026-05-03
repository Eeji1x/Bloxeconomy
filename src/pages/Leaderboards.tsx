import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Trophy, Gem, Package, Swords } from 'lucide-react';

interface LeaderboardUser {
  user_id: string;
  username: string;
  numeric_id: number;
  emeralds: number;
  is_verified: boolean | null;
  is_online: boolean | null;
  limited_count?: number;
}

interface SwordFightRow {
  user_id: string;
  username: string;
  kills: number;
  deaths: number;
}

type Tab = 'emeralds' | 'limiteds' | 'sword_fight';

const Leaderboards = () => {
  const [activeTab, setActiveTab] = useState<Tab>('emeralds');
  const [emeraldLeaders, setEmeraldLeaders] = useState<LeaderboardUser[]>([]);
  const [limitedLeaders, setLimitedLeaders] = useState<LeaderboardUser[]>([]);
  const [swordLeaders, setSwordLeaders] = useState<SwordFightRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboards();

    // Live updates for sword fight kills
    const channel = supabase
      .channel('sword_fight_lb')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sword_fight_kills' }, () => {
        fetchSwordLeaders();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSwordLeaders = async () => {
    const { data } = await (supabase as any)
      .from('sword_fight_kills')
      .select('user_id, username, kills, deaths')
      .order('kills', { ascending: false })
      .limit(50);
    if (data) setSwordLeaders(data as SwordFightRow[]);
  };

  const fetchLeaderboards = async () => {
    setLoading(true);

    const { data: emeraldData } = await (supabase as any)
      .from('public_profiles')
      .select('user_id, username, numeric_id, emeralds, is_verified, is_online')
      .order('emeralds', { ascending: false })
      .limit(50);
    if (emeraldData) setEmeraldLeaders(emeraldData);

    const { data: profiles } = await (supabase as any)
      .from('public_profiles')
      .select('user_id, username, numeric_id, emeralds, is_verified, is_online');

    if (profiles) {
      const { data: limitedItems } = await supabase
        .from('catalog_items')
        .select('id')
        .eq('item_type', 'limited');
      const limitedItemIds = limitedItems?.map(i => i.id) || [];

      const { data: inventory } = await supabase
        .from('user_inventory')
        .select('user_id, item_id, quantity');

      const limitedCounts: Record<string, number> = {};
      inventory?.forEach(inv => {
        if (limitedItemIds.includes(inv.item_id)) {
          limitedCounts[inv.user_id] = (limitedCounts[inv.user_id] || 0) + inv.quantity;
        }
      });

      const withLimitedCounts = profiles
        .map((p: any) => ({ ...p, limited_count: limitedCounts[p.user_id] || 0 }))
        .filter((p: any) => p.limited_count > 0)
        .sort((a: any, b: any) => b.limited_count - a.limited_count)
        .slice(0, 50);

      setLimitedLeaders(withLimitedCounts);
    }

    await fetchSwordLeaders();
    setLoading(false);
  };

  const getRankLabel = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'emeralds', label: 'Most Emeralds', icon: <Gem className="w-4 h-4" /> },
    { id: 'limiteds', label: 'Most Limiteds', icon: <Package className="w-4 h-4" /> },
    { id: 'sword_fight', label: 'Sword Fight Kills', icon: <Swords className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-[940px] mx-auto">
      <h1
        className="text-3xl font-bold mb-5 flex items-center gap-3"
        style={{
          fontFamily: 'Orbitron, sans-serif',
          color: 'hsl(180 100% 95%)',
          textShadow: '0 0 16px hsl(180 100% 50% / 0.5)',
          letterSpacing: '0.04em',
        }}
      >
        <Trophy className="w-7 h-7 text-primary" />
        Leaderboards
      </h1>

      <div
        className="rounded-xl border border-primary/30 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(260 40% 10%) 0%, hsl(260 35% 6%) 100%)',
          boxShadow: '0 0 30px hsl(180 100% 50% / 0.1)',
        }}
      >
        {/* Tabs */}
        <div className="flex border-b border-primary/20 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              style={{
                color: activeTab === t.id ? 'hsl(180 100% 60%)' : 'hsl(180 40% 70%)',
                background: activeTab === t.id ? 'hsl(260 40% 12%)' : 'transparent',
                borderBottom: activeTab === t.id ? '2px solid hsl(180 100% 50%)' : '2px solid transparent',
                boxShadow: activeTab === t.id ? 'inset 0 -1px 16px hsl(180 100% 50% / 0.2)' : 'none',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : activeTab === 'sword_fight' ? (
          <SwordFightTable rows={swordLeaders} getRankLabel={getRankLabel} />
        ) : (
          <UserTable
            rows={activeTab === 'emeralds' ? emeraldLeaders : limitedLeaders}
            mode={activeTab}
            getRankLabel={getRankLabel}
          />
        )}
      </div>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const rankRowStyle = (index: number): React.CSSProperties => {
  if (index === 0) return { background: 'linear-gradient(90deg, hsl(50 100% 50% / 0.12), transparent)' };
  if (index === 1) return { background: 'linear-gradient(90deg, hsl(0 0% 70% / 0.08), transparent)' };
  if (index === 2) return { background: 'linear-gradient(90deg, hsl(30 80% 50% / 0.12), transparent)' };
  return {};
};

const UserTable = ({
  rows,
  mode,
  getRankLabel,
}: {
  rows: LeaderboardUser[];
  mode: 'emeralds' | 'limiteds';
  getRankLabel: (i: number) => string;
}) => {
  if (rows.length === 0) {
    return <div className="text-center py-10 text-sm text-muted-foreground">No data available yet</div>;
  }
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr style={{ background: 'hsl(260 40% 14%)', color: 'hsl(180 60% 80%)' }}>
          <th className="py-2 px-3 text-left text-xs uppercase tracking-wider w-16">Rank</th>
          <th className="py-2 px-3 text-left text-xs uppercase tracking-wider">Player</th>
          <th className="py-2 px-3 text-right text-xs uppercase tracking-wider w-32">
            {mode === 'emeralds' ? 'Emeralds' : 'Limiteds'}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((u, index) => (
          <tr
            key={u.user_id}
            className="border-b border-primary/10 hover:bg-primary/5 transition-colors"
            style={rankRowStyle(index)}
          >
            <td className="py-2 px-3 text-center" style={{ fontSize: index < 3 ? 18 : 14 }}>
              {getRankLabel(index)}
            </td>
            <td className="py-2 px-3">
              <Link to={`/profile/${u.user_id}`} className="text-primary hover:underline inline-flex items-center gap-1.5">
                {u.username}
                {u.is_verified && <img src="/images/verified-badge.png" alt="Verified" className="w-3.5 h-3.5" />}
                {u.is_online && <span className="text-[10px]" style={{ color: 'hsl(150 100% 60%)' }}>●</span>}
              </Link>
              <span className="text-xs text-muted-foreground ml-2">#{u.numeric_id}</span>
            </td>
            <td className="py-2 px-3 text-right font-bold" style={{ color: mode === 'emeralds' ? 'hsl(150 100% 65%)' : 'hsl(180 100% 95%)' }}>
              {mode === 'emeralds'
                ? <span className="inline-flex items-center gap-1"><Gem className="w-3.5 h-3.5" />{u.emeralds.toLocaleString()}</span>
                : <span className="inline-flex items-center gap-1"><Package className="w-3.5 h-3.5" />{u.limited_count}</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const SwordFightTable = ({
  rows,
  getRankLabel,
}: {
  rows: SwordFightRow[];
  getRankLabel: (i: number) => string;
}) => {
  if (rows.length === 0) {
    return (
      <div className="text-center py-10 px-4">
        <Swords className="w-10 h-10 text-primary/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No sword fights yet — be the first!</p>
        <Link to="/games" className="text-primary hover:underline text-sm mt-2 inline-block">
          Join Sword Fight →
        </Link>
      </div>
    );
  }
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr style={{ background: 'hsl(260 40% 14%)', color: 'hsl(180 60% 80%)' }}>
          <th className="py-2 px-3 text-left text-xs uppercase tracking-wider w-16">Rank</th>
          <th className="py-2 px-3 text-left text-xs uppercase tracking-wider">Player</th>
          <th className="py-2 px-3 text-right text-xs uppercase tracking-wider w-24">Kills</th>
          <th className="py-2 px-3 text-right text-xs uppercase tracking-wider w-24">Deaths</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((u, index) => (
          <tr
            key={u.user_id}
            className="border-b border-primary/10 hover:bg-primary/5 transition-colors"
            style={rankRowStyle(index)}
          >
            <td className="py-2 px-3 text-center" style={{ fontSize: index < 3 ? 18 : 14 }}>
              {getRankLabel(index)}
            </td>
            <td className="py-2 px-3">
              <Link to={`/profile/${u.user_id}`} className="text-primary hover:underline">
                {u.username}
              </Link>
            </td>
            <td className="py-2 px-3 text-right font-bold" style={{ color: 'hsl(0 100% 70%)' }}>
              ⚔ {u.kills}
            </td>
            <td className="py-2 px-3 text-right text-muted-foreground">
              {u.deaths}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Leaderboards;
