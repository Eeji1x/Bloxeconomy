import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { DEFAULT_AVATAR_URL } from '@/lib/constants';
import { User, Package, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  item_id: string;
  quantity: number;
  is_equipped: boolean | null;
  catalog_items: {
    id: string;
    name: string;
    image_url: string;
    item_type: string;
  } | null;
}

const Avatar = () => {
  const { user, profile, isLoading } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('user_inventory')
        .select(`
          id,
          item_id,
          quantity,
          is_equipped,
          catalog_items (
            id,
            name,
            image_url,
            item_type
          )
        `)
        .eq('user_id', user.id);

      if (!error && data) {
        setInventory(data as InventoryItem[]);
      }
      setLoadingInventory(false);
    };

    fetchInventory();
  }, [user]);

  const handleEquip = async (itemId: string, currentlyEquipped: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_inventory')
        .update({ is_equipped: !currentlyEquipped })
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) throw error;

      setInventory(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, is_equipped: !currentlyEquipped }
            : item
        )
      );

      toast.success(currentlyEquipped ? 'Item unequipped' : 'Item equipped');
    } catch (error) {
      console.error('Error equipping item:', error);
      toast.error('Failed to update item');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  const equippedItems = inventory.filter(i => i.is_equipped);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <User className="w-8 h-8 text-primary" />
          Avatar Editor
        </h1>
        <p className="text-muted-foreground">Customize your avatar with items from your inventory</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Avatar Preview */}
        <div className="cyber-card p-8">
          <h2 className="font-display font-bold mb-4">Preview</h2>
          <div className="aspect-[3/4] rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden relative">
            {/* Base Avatar */}
            <img
              src={DEFAULT_AVATAR_URL}
              alt="Your Avatar"
              className="w-full h-full object-contain p-4 absolute inset-0"
            />
            {/* Equipped items overlay - fully opaque, no transparency */}
            {equippedItems.map((item) => (
              <img
                key={item.id}
                src={item.catalog_items?.image_url}
                alt={item.catalog_items?.name}
                className="w-full h-full object-contain p-4 absolute inset-0"
                style={{ 
                  opacity: 1,
                  mixBlendMode: 'normal'
                }}
              />
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {equippedItems.length > 0 
              ? `${equippedItems.length} item(s) equipped`
              : 'Default Avatar'
            }
          </p>
        </div>

        {/* Inventory */}
        <div className="lg:col-span-2 cyber-card p-8">
          <h2 className="font-display font-bold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Your Inventory ({inventory.length} items)
          </h2>
          
          {loadingInventory ? (
            <div className="min-h-[300px] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : inventory.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {inventory.map((item) => (
                <div 
                  key={item.id} 
                  className={`aspect-square rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 border-2 overflow-hidden relative cursor-pointer group transition-all ${
                    item.is_equipped 
                      ? 'border-accent shadow-lg shadow-accent/20' 
                      : 'border-primary/20 hover:border-primary/50'
                  }`}
                  onClick={() => handleEquip(item.id, !!item.is_equipped)}
                >
                  <img
                    src={item.catalog_items?.image_url || '/placeholder.svg'}
                    alt={item.catalog_items?.name || 'Item'}
                    className="w-full h-full object-contain p-2"
                  />
                  {item.catalog_items?.item_type === 'limited' && (
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-secondary/80 text-secondary-foreground">
                      LTD
                    </div>
                  )}
                  {item.is_equipped && (
                    <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                      <Check className="w-3 h-3 text-accent-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-xs text-white text-center px-1">
                      {item.is_equipped ? 'Unequip' : 'Equip'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="min-h-[300px] flex items-center justify-center">
              <div className="text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-bold text-muted-foreground">No Items Yet</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Purchase items from the catalog to customize your avatar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Avatar;
