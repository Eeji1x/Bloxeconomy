import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Trophy, Gem, Package, Crown, Medal, Award } from 'lucide-react';

interface LeaderboardUser {
  user_id: string;
  username: string;
  numeric_id: number;
  emeralds: number;
  is_verified: boolean | null;
  is_online: boolean | null;
  limited_count?: number;
}

const Leaderboards = () => {
  const [activeTab, setActiveTab] = useState<'emeralds' | 'limiteds'>('emeralds');
  const [emeraldLeaders, setEmeraldLeaders] = useState<LeaderboardUser[]>([]);
  const [limitedLeaders, setLimitedLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    setLoading(true);

    // Fetch top emerald holders
    const { data: emeraldData } = await supabase
      .from('public_profiles' as any)
      .select('user_id, username, numeric_id, emeralds, is_verified, is_online')
      .order('emeralds', { ascending: false })
      .limit(50);

    if (emeraldData) {
      setEmeraldLeaders(emeraldData);
    }

    // Fetch profiles for limited count
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, numeric_id, emeralds, is_verified, is_online')
      .eq('is_banned', false);

    if (profiles) {
      // Get all limited items
      const { data: limitedItems } = await supabase
        .from('catalog_items')
        .select('id')
        .eq('item_type', 'limited');

      const limitedItemIds = limitedItems?.map(i => i.id) || [];

      // Get inventory counts for limited items per user
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
        .map(p => ({
          ...p,
          limited_count: limitedCounts[p.user_id] || 0,
        }))
        .filter(p => p.limited_count > 0)
        .sort((a, b) => b.limited_count - a.limited_count)
        .slice(0, 50);

      setLimitedLeaders(withLimitedCounts);
    }

    setLoading(false);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-300" />;
    if (index === 2) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="text-lg font-bold text-muted-foreground w-6 text-center">{index + 1}</span>;
  };

  const getRankBg = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30';
    if (index === 1) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/30';
    if (index === 2) return 'bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-amber-600/30';
    return 'bg-muted/30';
  };

  const currentLeaders = activeTab === 'emeralds' ? emeraldLeaders : limitedLeaders;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 mb-4">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-display font-bold">Leaderboards</h1>
        <p className="text-muted-foreground">Top players on SODABLOX</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2">
        <Button
          variant={activeTab === 'emeralds' ? 'emerald' : 'outline'}
          onClick={() => setActiveTab('emeralds')}
          className="gap-2"
        >
          <Gem className="w-4 h-4" />
          Most Emeralds
        </Button>
        <Button
          variant={activeTab === 'limiteds' ? 'neon' : 'outline'}
          onClick={() => setActiveTab('limiteds')}
          className="gap-2"
        >
          <Package className="w-4 h-4" />
          Most Limiteds
        </Button>
      </div>

      {/* Leaderboard */}
      <div className="cyber-card p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : currentLeaders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No data available yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentLeaders.map((user, index) => (
              <Link
                key={user.user_id}
                to={`/profile/${user.user_id}`}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.02] ${getRankBg(index)}`}
              >
                {/* Rank */}
                <div className="shrink-0">
                  {getRankIcon(index)}
                </div>

                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center font-bold text-lg">
                    {user.username[0].toUpperCase()}
                  </div>
                  {user.is_online && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-background" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold truncate">{user.username}</span>
                    {user.is_verified && (
                      <img 
                        src="/images/verified-badge.png" 
                        alt="Verified" 
                        className="w-4 h-4"
                      />
                    )}
                    <span className="text-xs text-muted-foreground">#{user.numeric_id}</span>
                  </div>
                </div>

                {/* Value */}
                <div className="shrink-0 text-right">
                  {activeTab === 'emeralds' ? (
                    <div className="flex items-center gap-2">
                      <Gem className="w-5 h-5 text-accent" />
                      <span className="font-bold text-accent text-lg">
                        {user.emeralds.toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary" />
                      <span className="font-bold text-primary text-lg">
                        {user.limited_count}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboards;
