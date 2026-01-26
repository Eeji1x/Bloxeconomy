import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingBag, Search, Gem, Star, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  item_type: 'normal' | 'limited' | 'giftbox';
  price: number;
  stock: number | null;
  max_stock: number | null;
  is_on_sale: boolean | null;
  is_giftbox: boolean | null;
  created_at: string;
}

const Catalog = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [userInventory, setUserInventory] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'normal' | 'limited' | 'giftbox'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [buyingItem, setBuyingItem] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
    if (user) {
      fetchUserInventory();
    }
  }, [user]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('catalog_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItems(data as CatalogItem[]);
    }
    setIsLoading(false);
  };

  const fetchUserInventory = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_inventory')
      .select('item_id')
      .eq('user_id', user.id);

    if (data) {
      setUserInventory(data.map(i => i.item_id));
    }
  };

  const handleBuy = async (item: CatalogItem) => {
    if (!user || !profile) {
      toast.error('Please log in to purchase items');
      return;
    }

    // Check if banned
    if (profile.is_banned) {
      toast.error('You are banned and cannot purchase items');
      return;
    }

    if (profile.emeralds < item.price) {
      toast.error('Not enough emeralds!');
      return;
    }

    if (!item.is_on_sale) {
      toast.error('This item is not for sale');
      return;
    }

    if (item.stock !== null && item.stock <= 0) {
      toast.error('This item is out of stock');
      return;
    }

    // For limited and giftbox items, check if user already owns one
    if ((item.item_type === 'limited' || item.item_type === 'giftbox') && userInventory.includes(item.id)) {
      toast.error('You can only own one of this item');
      return;
    }

    setBuyingItem(item.id);

    try {
      // First, re-check stock from database (to prevent race conditions)
      const { data: freshItem, error: fetchError } = await supabase
        .from('catalog_items')
        .select('stock, is_on_sale')
        .eq('id', item.id)
        .single();

      if (fetchError || !freshItem) {
        throw new Error('Failed to verify item availability');
      }

      if (!freshItem.is_on_sale) {
        toast.error('This item is no longer for sale');
        await fetchItems();
        return;
      }

      if (freshItem.stock !== null && freshItem.stock <= 0) {
        toast.error('This item is now out of stock');
        await fetchItems();
        return;
      }

      // Deduct emeralds
      const { error: emeraldError } = await supabase
        .from('profiles')
        .update({ emeralds: profile.emeralds - item.price })
        .eq('user_id', user.id);

      if (emeraldError) throw emeraldError;

      // Add to inventory
      const { error: inventoryError } = await supabase
        .from('user_inventory')
        .insert({
          user_id: user.id,
          item_id: item.id,
          quantity: 1,
        });

      if (inventoryError) throw inventoryError;

      // Update stock if applicable (global stock)
      if (freshItem.stock !== null) {
        const newStock = freshItem.stock - 1;
        const updates: { stock: number; is_on_sale?: boolean } = { stock: newStock };
        
        // Auto off-sale if stock reaches 0
        if (newStock <= 0) {
          updates.is_on_sale = false;
        }

        await supabase
          .from('catalog_items')
          .update(updates)
          .eq('id', item.id);
      }

      await refreshProfile();
      await fetchItems();
      await fetchUserInventory();
      
      toast.success(`Successfully purchased ${item.name}!`);

    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to purchase item');
      // Refresh to show correct state
      await fetchItems();
    } finally {
      setBuyingItem(null);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || item.item_type === filter;
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-primary" />
            Catalog
          </h1>
          <p className="text-muted-foreground">
            {items.length} items available
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-64 h-12 bg-input border-border"
            />
          </div>
          
          <div className="flex gap-2">
            {(['all', 'normal', 'limited', 'giftbox'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f === 'all' ? <Filter className="w-4 h-4 mr-1" /> : null}
                {f}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredItems.map((item) => {
            const alreadyOwned = userInventory.includes(item.id);
            const isLimitedOrGiftbox = item.item_type === 'limited' || item.item_type === 'giftbox';
            const canBuy = item.is_on_sale && (item.stock === null || item.stock > 0) && !(isLimitedOrGiftbox && alreadyOwned);
            
            return (
              <div key={item.id} className="cyber-card group">
                {/* Image */}
                <div className="aspect-square rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 mb-3 overflow-hidden relative">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-contain p-2"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                  {item.item_type === 'limited' && (
                    <div className="absolute top-2 right-2 limited-badge">
                      <Star className="w-3 h-3" />
                      Limited
                    </div>
                  )}
                  {item.is_giftbox && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold uppercase rounded bg-secondary/80 text-secondary-foreground">
                      Giftbox
                    </div>
                  )}
                  {alreadyOwned && isLimitedOrGiftbox && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 text-xs font-bold uppercase rounded bg-accent/80 text-accent-foreground">
                      Owned
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-2">
                  <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Gem className="w-4 h-4 text-accent" />
                      <span className="font-bold text-accent">{item.price.toLocaleString()}</span>
                    </div>
                    
                    {item.stock !== null && (
                      <span className={`text-xs ${item.stock <= 5 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {item.stock} left
                      </span>
                    )}
                  </div>

                  {/* Buy Button */}
                  {canBuy ? (
                    <Button
                      variant="emerald"
                      size="sm"
                      className="w-full"
                      onClick={() => handleBuy(item)}
                      disabled={buyingItem === item.id || !user}
                    >
                      {buyingItem === item.id ? (
                        <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                      ) : (
                        'Buy Now'
                      )}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      {!item.is_on_sale ? 'Off Sale' : 
                       item.stock === 0 ? 'Sold Out' : 
                       alreadyOwned ? 'Already Owned' : 'Unavailable'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-xl font-display font-bold text-muted-foreground">
            {items.length === 0 ? 'Catalog is empty' : 'No items found'}
          </h2>
          <p className="text-muted-foreground mt-2">
            {items.length === 0
              ? 'Check back later for new items!'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Catalog;
