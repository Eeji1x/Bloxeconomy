import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Users, Crown } from 'lucide-react';

interface SerialOwner {
  serial_number: number;
  owner_id: string;
  username: string;
  is_verified: boolean | null;
}

interface OwnersPanelProps {
  itemId: string;
  itemType: 'normal' | 'limited';
}

export const OwnersPanel = ({ itemId, itemType }: OwnersPanelProps) => {
  const [serialOwners, setSerialOwners] = useState<SerialOwner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (itemType === 'limited') {
      fetchSerialOwners();
    } else {
      setLoading(false);
    }
  }, [itemId, itemType]);

  const fetchSerialOwners = async () => {
    try {
      // Get all serials for this item
      const { data: serialsData, error: serialError } = await supabase
        .from('item_serials')
        .select('serial_number, owner_id')
        .eq('item_id', itemId)
        .order('serial_number', { ascending: true });

      if (serialError || !serialsData || serialsData.length === 0) {
        setSerialOwners([]);
        setLoading(false);
        return;
      }

      // Get profiles for each unique owner
      const ownerIds = [...new Set(serialsData.map(s => s.owner_id))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, is_verified')
        .in('user_id', ownerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const ownersData: SerialOwner[] = serialsData.map((serial) => {
        const profile = profileMap.get(serial.owner_id);
        return {
          serial_number: serial.serial_number,
          owner_id: serial.owner_id,
          username: profile?.username || 'Unknown',
          is_verified: profile?.is_verified || false,
        };
      });

      setSerialOwners(ownersData);
    } catch (error) {
      console.error('Error fetching serial owners:', error);
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

  return (
    <div className="cyber-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold">Owners</h3>
        </div>
        <span className="text-sm text-muted-foreground">{serialOwners.length} owned</span>
      </div>

      {serialOwners.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">No one owns this item yet</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {serialOwners.map((owner, index) => (
            <Link
              key={`${owner.serial_number}-${owner.owner_id}`}
              to={`/profile/${owner.owner_id}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-muted-foreground">#{owner.serial_number}</span>
                {index === 0 && serialOwners.length > 1 && (
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
