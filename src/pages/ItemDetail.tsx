import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { updateItemRAP } from '@/lib/rap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OwnersPanel } from '@/components/catalog/OwnersPanel';
import { 
  ArrowLeft, 
  Gem, 
  Star, 
  Package, 
  Tag,
  User,
  Clock,
  ShoppingCart,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  item_type: 'normal' | 'limited';
  price: number;
  stock: number | null;
  is_on_sale: boolean | null;
  resell_enabled: boolean | null;
  created_at: string;
}

interface ResaleListing {
  id: string;
  seller_id: string;
  inventory_id: string;
  price: number;
  created_at: string;
  seller_profile?: {
    username: string;
    is_verified: boolean | null;
  };
}

interface UserInventoryItem {
  id: string;
  item_id: string;
  is_equipped: boolean | null;
}

const ItemDetail = () => {
  const { itemId } = useParams();
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [resaleListings, setResaleListings] = useState<ResaleListing[]>([]);
  const [userInventory, setUserInventory] = useState<UserInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingItem, setBuyingItem] = useState(false);
  const [buyingResale, setBuyingResale] = useState<string | null>(null);
  
  // Resell form state
  const [showResellForm, setShowResellForm] = useState(false);
  const [resellPrice, setResellPrice] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [creatingListing, setCreatingListing] = useState(false);

  useEffect(() => {
    if (itemId) {
      fetchItem();
      fetchResaleListings();
      if (user) {
        fetchUserInventory();
      }
    }
  }, [itemId, user]);

  const fetchItem = async () => {
    const { data, error } = await supabase
      .from('catalog_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (!error && data) {
      setItem(data as CatalogItem);
    }
    setLoading(false);
  };

  const fetchResaleListings = async () => {
    const { data } = await supabase
      .from('resale_listings')
      .select('*')
      .eq('item_id', itemId)
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (data) {
      // Fetch seller profiles
      const sellerIds = data.map(l => l.seller_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, is_verified')
        .in('user_id', sellerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      const listingsWithProfiles = data.map(l => ({
        ...l,
        seller_profile: profileMap.get(l.seller_id),
      }));

      setResaleListings(listingsWithProfiles);
    }
  };

  const fetchUserInventory = async () => {
    if (!user || !itemId) return;

    const { data } = await supabase
      .from('user_inventory')
      .select('id, item_id, is_equipped')
      .eq('user_id', user.id)
      .eq('item_id', itemId);

    if (data) {
      setUserInventory(data);
    }
  };

  const handleBuyOfficial = async () => {
    if (!user || !profile || !item) return;

    if (profile.is_banned) {
      toast.error('You are banned');
      return;
    }

    if (profile.emeralds < item.price) {
      const needed = item.price - profile.emeralds;
      toast.error(`You need ${needed.toLocaleString()} more Emeralds`);
      return;
    }

    setBuyingItem(true);

    try {
      // Deduct emeralds
      await supabase
        .from('profiles')
        .update({ emeralds: profile.emeralds - item.price })
        .eq('user_id', user.id);

      // Add to inventory - unique constraint prevents duplicates
      const { error: invError } = await supabase
        .from('user_inventory')
        .insert({
          user_id: user.id,
          item_id: item.id,
          quantity: 1,
        });
      
      if (invError) {
        // If duplicate error, refund emeralds
        if (invError.code === '23505') {
          await supabase
            .from('profiles')
            .update({ emeralds: profile.emeralds })
            .eq('user_id', user.id);
          toast.error('You already own this item');
          setBuyingItem(false);
          return;
        }
        throw invError;
      }

      // Update stock if applicable
      if (item.stock !== null) {
        const newStock = item.stock - 1;
        await supabase
          .from('catalog_items')
          .update({ 
            stock: newStock, 
            is_on_sale: newStock > 0 
          })
          .eq('id', item.id);
      }

      await refreshProfile();
      await fetchItem();
      await fetchUserInventory();
      
      // Update RAP for limited items
      if (item.item_type === 'limited') {
        await updateItemRAP(item.id, item.price);
      }
      
      toast.success(`Purchased ${item.name}!`);
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Purchase failed');
    } finally {
      setBuyingItem(false);
    }
  };

  const handleBuyResale = async (listing: ResaleListing) => {
    if (!user || !profile) return;

    if (profile.is_banned) {
      toast.error('You are banned');
      return;
    }

    if (listing.seller_id === user.id) {
      toast.error('You cannot buy your own listing');
      return;
    }

    setBuyingResale(listing.id);

    try {
      const { data, error } = await supabase.functions.invoke('process-resale-purchase', {
        body: { listing_id: listing.id },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        await fetchResaleListings();
        return;
      }

      await refreshProfile();
      await fetchResaleListings();
      await fetchUserInventory();
      
      toast.success('Purchase successful. Item has been added to your inventory.');
    } catch (error) {
      toast.error('Purchase failed');
    } finally {
      setBuyingResale(null);
    }
  };

  const handleCreateListing = async () => {
    if (!user || !profile || !selectedInventoryId || !item) return;

    if (profile.is_banned) {
      toast.error('Banned users cannot list items');
      return;
    }

    // Prevent system account from listing
    if (profile.numeric_id === 5) {
      toast.error('System accounts cannot list items');
      return;
    }

    const price = parseInt(resellPrice);
    if (isNaN(price) || price < 1) {
      toast.error('Price must be greater than 0');
      return;
    }

    // Verify ownership before listing
    const { data: ownedItem } = await supabase
      .from('user_inventory')
      .select('id')
      .eq('id', selectedInventoryId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!ownedItem) {
      toast.error('You do not own this item');
      await fetchUserInventory();
      return;
    }

    // Check if already listed
    const { data: existingListing } = await supabase
      .from('resale_listings')
      .select('id')
      .eq('inventory_id', selectedInventoryId)
      .eq('is_active', true)
      .maybeSingle();

    if (existingListing) {
      toast.error('This item is already listed for sale');
      return;
    }

    setCreatingListing(true);

    try {
      // Unequip item before listing
      await supabase
        .from('user_inventory')
        .update({ is_equipped: false })
        .eq('id', selectedInventoryId);

      const { error } = await supabase
        .from('resale_listings')
        .insert({
          seller_id: user.id,
          item_id: itemId,
          inventory_id: selectedInventoryId,
          price,
        });

      if (error) throw error;

      toast.success('Listing created!');
      setShowResellForm(false);
      setResellPrice('');
      setSelectedInventoryId(null);
      await fetchResaleListings();
      await fetchUserInventory();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('This item is already listed');
      } else {
        toast.error('Failed to create listing');
      }
    } finally {
      setCreatingListing(false);
    }
  };

  const handleRemoveListing = async (listing: ResaleListing) => {
    // Only the seller can delist their own items
    if (listing.seller_id !== user?.id) {
      toast.error('Only the seller can remove this listing');
      return;
    }

    try {
      // Return item to seller's inventory
      await supabase
        .from('user_inventory')
        .update({ user_id: listing.seller_id })
        .eq('id', listing.inventory_id);

      await supabase
        .from('resale_listings')
        .delete()
        .eq('id', listing.id);

      toast.success('Listing removed — item returned to seller');
      await fetchResaleListings();
      await fetchUserInventory();
    } catch (error) {
      toast.error('Failed to remove listing');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return <Navigate to="/catalog" replace />;
  }

  const userOwnsItem = userInventory.length > 0;
  const isLimited = item.item_type === 'limited';
  const canBuyOfficial = item.is_on_sale && (item.stock === null || item.stock > 0) && 
    !(isLimited && userOwnsItem);

  // Get inventory items not already listed
  const listedInventoryIds = resaleListings
    .filter(l => l.seller_id === user?.id)
    .map(l => l.inventory_id);
  const unlistedInventory = userInventory.filter(i => !listedInventoryIds.includes(i.id));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back Button */}
      <Link to="/catalog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Catalog
      </Link>

      {/* Item Header */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 overflow-hidden relative">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-contain p-8"
          />
          {isLimited && (
            <div className="absolute top-4 right-4 limited-badge">
              <Star className="w-4 h-4" />
              Limited
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-display font-bold">{item.name}</h1>
            {item.description && (
              <p className="text-muted-foreground mt-2">{item.description}</p>
            )}
          </div>

          {/* Price & Stock */}
          <div className="cyber-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Official Price</span>
              <div className="flex items-center gap-2">
                <Gem className="w-5 h-5 text-accent" />
                <span className="text-2xl font-bold text-accent">{item.price.toLocaleString()}</span>
              </div>
            </div>
            
            {item.stock !== null && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Stock</span>
                <span className={item.stock <= 5 ? 'text-destructive font-bold' : ''}>
                  {item.stock} remaining
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="capitalize">{item.item_type}</span>
            </div>
          </div>

          {/* Buy Official */}
          {canBuyOfficial && user && (
            <Button
              variant="emerald"
              size="lg"
              className="w-full"
              onClick={handleBuyOfficial}
              disabled={buyingItem}
            >
              {buyingItem ? (
                <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Buy for {item.price.toLocaleString()} 💎
                </>
              )}
            </Button>
          )}

          {!item.is_on_sale && (
            <Button variant="outline" size="lg" className="w-full" disabled>
              Off Sale
            </Button>
          )}

          {/* User owns - Resell option (only if resell_enabled) */}
          {userOwnsItem && isLimited && item.resell_enabled !== false && (
            <div className="space-y-3">
              {!showResellForm ? (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    setShowResellForm(true);
                    // Auto-select first unlisted inventory item
                    if (unlistedInventory.length > 0) {
                      setSelectedInventoryId(unlistedInventory[0].id);
                    }
                  }}
                  disabled={unlistedInventory.length === 0}
                >
                  <Tag className="w-5 h-5 mr-2" />
                  {unlistedInventory.length > 0 ? 'Sell This Item' : 'All Items Listed'}
                </Button>
              ) : (
                <div className="cyber-card p-4 space-y-3">
                  <h3 className="font-bold">Create Resale Listing</h3>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Price in emeralds"
                      value={resellPrice}
                      onChange={(e) => setResellPrice(e.target.value)}
                      min={1}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="emerald"
                      onClick={handleCreateListing}
                      disabled={creatingListing || !resellPrice}
                    >
                      {creatingListing ? 'Creating...' : 'List Item'}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowResellForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Owners Panel - Only for limited items */}
      {isLimited && (
        <OwnersPanel itemId={item.id} itemType={item.item_type} />
      )}

      {/* Resale Listings */}
      {isLimited && (
        <div className="space-y-4">
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Player Resales ({resaleListings.length})
          </h2>

          {resaleListings.length === 0 ? (
            <div className="cyber-card p-8 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No resale listings yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resaleListings.map((listing) => (
                <div key={listing.id} className="cyber-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Link 
                      to={`/profile/${listing.seller_id}`}
                      className="flex items-center gap-2 hover:text-primary"
                    >
                      <User className="w-4 h-4" />
                      <span className="font-medium">{listing.seller_profile?.username}</span>
                      {listing.seller_profile?.is_verified && (
                        <img 
                          src="/images/verified-badge.png" 
                          alt="Verified" 
                          className="w-4 h-4"
                        />
                      )}
                    </Link>
                    <div className="flex items-center gap-2">
                      <Gem className="w-4 h-4 text-accent" />
                      <span className="font-bold text-accent">{listing.price.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {listing.seller_id === user?.id ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveListing(listing)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    ) : isAdmin ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveListing(listing)}
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button
                        variant="emerald"
                        size="sm"
                        onClick={() => handleBuyResale(listing)}
                        disabled={buyingResale === listing.id || !user}
                      >
                        {buyingResale === listing.id ? (
                          <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                        ) : (
                          'Buy'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemDetail;
