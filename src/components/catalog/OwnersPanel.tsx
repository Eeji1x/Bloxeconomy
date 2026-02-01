import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Users, Crown } from 'lucide-react';

interface Owner {
  user_id: string;
  username: string;
  is_verified: boolean | null;
  count: number;
}

interface OwnersPanelProps {
  itemId: string;
  itemType: 'normal' | 'limited' | 'giftbox';
}

export const OwnersPanel = ({ itemId, itemType }: OwnersPanelProps) => {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (itemType === 'limited') {
      fetchOwners();
    } else {
      setLoading(false);
    }
  }, [itemId, itemType]);

  const fetchOwners = async () => {
    try {
      // Get all inventory entries for this item
      const { data: inventoryData, error: invError } = await supabase
        .from('user_inventory')
        .select('user_id')
        .eq('item_id', itemId);

      if (invError || !inventoryData) {
        setLoading(false);
        return;
      }

      // Count by user_id
      const countMap = new Map<string, number>();
      inventoryData.forEach((item) => {
        const current = countMap.get(item.user_id) || 0;
        countMap.set(item.user_id, current + 1);
      });

      // Get profiles for each unique user
      const userIds = Array.from(countMap.keys());
      
      if (userIds.length === 0) {
        setOwners([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, is_verified')
        .in('user_id', userIds);

      if (profiles) {
        const ownersData: Owner[] = profiles.map((p) => ({
          user_id: p.user_id,
          username: p.username,
          is_verified: p.is_verified,
          count: countMap.get(p.user_id) || 0,
        }));

        // Sort by count descending, then by username
        ownersData.sort((a, b) => b.count - a.count || a.username.localeCompare(b.username));
        setOwners(ownersData);
      }
    } catch (error) {
      console.error('Error fetching owners:', error);
    } finally {
      setLoading(false);
    }
  };

  // Only show for limited items
  if (itemType !== 'limited') {
    return null;
  }

  if (loading) {
    return (
      <div className="cyber-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold">Owners</h3>
        </div>
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const totalOwned = owners.reduce((acc, o) => acc + o.count, 0);

  return (
    <div className="cyber-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold">Owners</h3>
        </div>
        <span className="text-sm text-muted-foreground">{totalOwned} owned</span>
      </div>

      {owners.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">No one owns this item yet</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {owners.map((owner, index) => (
            <Link
              key={owner.user_id}
              to={`/profile/${owner.user_id}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors group"
            >
              <div className="flex items-center gap-2">
                {index === 0 && owners.length > 1 && (
                  <Crown className="w-4 h-4 text-yellow-500" />
                )}
                <span className="font-medium group-hover:text-primary transition-colors">
                  {owner.username}
                </span>
                {owner.is_verified && (
                  <img 
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7mHpMTaGN4Tzw3V_Y35xes0BeIjFXaWZ3Kw&s" 
                    alt="Verified" 
                    className="w-4 h-4"
                  />
                )}
              </div>
              <span className="text-sm text-accent font-medium">
                {owner.count}x
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
