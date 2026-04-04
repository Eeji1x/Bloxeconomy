import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

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

    const { data: emeraldData } = await (supabase as any)
      .from('public_profiles')
      .select('user_id, username, numeric_id, emeralds, is_verified, is_online')
      .order('emeralds', { ascending: false })
      .limit(50);

    if (emeraldData) {
      setEmeraldLeaders(emeraldData);
    }

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

    setLoading(false);
  };

  const currentLeaders = activeTab === 'emeralds' ? emeraldLeaders : limitedLeaders;

  const getRankStyle = (index: number): React.CSSProperties => {
    if (index === 0) return { background: '#fff9e6', fontWeight: 700 };
    if (index === 1) return { background: '#f5f5f5', fontWeight: 700 };
    if (index === 2) return { background: '#fef3e8', fontWeight: 700 };
    return {};
  };

  const getRankLabel = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  };

  return (
    <div style={{ maxWidth: 940, margin: '0 auto' }}>
      <div className="rbx16-panel">
        <div className="rbx16-panel-header">
          <span className="rbx16-panel-header-text">Leaderboards</span>
        </div>
        <div className="rbx16-panel-body" style={{ padding: 0 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e3e3e3' }}>
            <button
              onClick={() => setActiveTab('emeralds')}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: activeTab === 'emeralds' ? 700 : 400,
                color: activeTab === 'emeralds' ? '#0074BD' : '#666',
                background: activeTab === 'emeralds' ? '#fff' : '#f8f8f8',
                border: 'none',
                borderBottom: activeTab === 'emeralds' ? '2px solid #0074BD' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              💎 Most Emeralds
            </button>
            <button
              onClick={() => setActiveTab('limiteds')}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: activeTab === 'limiteds' ? 700 : 400,
                color: activeTab === 'limiteds' ? '#0074BD' : '#666',
                background: activeTab === 'limiteds' ? '#fff' : '#f8f8f8',
                border: 'none',
                borderBottom: activeTab === 'limiteds' ? '2px solid #0074BD' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              📦 Most Limiteds
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div className="rbx16-spinner" />
            </div>
          ) : currentLeaders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999', fontSize: 14 }}>
              No data available yet
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f2f2f2', borderBottom: '1px solid #e3e3e3' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#666', width: 60 }}>Rank</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#666' }}>Player</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#666', width: 130 }}>
                    {activeTab === 'emeralds' ? 'Emeralds' : 'Limiteds'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentLeaders.map((u, index) => (
                  <tr key={u.user_id} style={{ ...getRankStyle(index), borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: index < 3 ? 18 : 14 }}>
                      {getRankLabel(index)}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <Link to={`/profile/${u.user_id}`} className="rbx16-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {u.username}
                        {u.is_verified && <img src="/images/verified-badge.png" alt="Verified" style={{ width: 14, height: 14 }} />}
                        {u.is_online && <span style={{ fontSize: 10, color: '#00b06f' }}>●</span>}
                      </Link>
                      <span style={{ fontSize: 12, color: '#999', marginLeft: 6 }}>#{u.numeric_id}</span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#393b3d' }}>
                      {activeTab === 'emeralds'
                        ? `💎 ${u.emeralds.toLocaleString()}`
                        : `📦 ${u.limited_count}`
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboards;
