import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
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
  item_type: 'normal' | 'limited' | 'giftbox';
  price: number;
  stock: number | null;
  is_on_sale: boolean | null;
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
      toast.error('Not enough emeralds');
      return;
    }

    setBuyingItem(true);

    try {
      // Deduct emeralds
      await supabase
        .from('profiles')
        .update({ emeralds: profile.emeralds - item.price })
        .eq('user_id', user.id);

      // Add to inventory
      await supabase
        .from('user_inventory')
        .insert({
          user_id: user.id,
          item_id: item.id,
          quantity: 1,
        });

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
      toast.success(`Purchased ${item.name}!`);
    } catch (error) {
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

    if (profile.emeralds < listing.price) {
      toast.error('Not enough emeralds');
      return;
    }

    if (listing.seller_id === user.id) {
      toast.error('You cannot buy your own listing');
      return;
    }

    setBuyingResale(listing.id);

    try {
      // Get seller profile for emerald update
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('emeralds')
        .eq('user_id', listing.seller_id)
        .single();

      if (!sellerProfile) throw new Error('Seller not found');

      // Deduct emeralds from buyer
      await supabase
        .from('profiles')
        .update({ emeralds: profile.emeralds - listing.price })
        .eq('user_id', user.id);

      // Add emeralds to seller
      await supabase
        .from('profiles')
        .update({ emeralds: sellerProfile.emeralds + listing.price })
        .eq('user_id', listing.seller_id);

      // Transfer item ownership
      await supabase
        .from('user_inventory')
        .update({ user_id: user.id })
        .eq('id', listing.inventory_id);

      // Delete listing
      await supabase
        .from('resale_listings')
        .delete()
        .eq('id', listing.id);

      await refreshProfile();
      await fetchResaleListings();
      await fetchUserInventory();
      toast.success('Purchase successful!');
    } catch (error) {
      toast.error('Purchase failed');
    } finally {
      setBuyingResale(null);
    }
  };

  const handleCreateListing = async () => {
    if (!user || !selectedInventoryId) return;

    const price = parseInt(resellPrice);
    if (isNaN(price) || price < 1) {
      toast.error('Please enter a valid price');
      return;
    }

    setCreatingListing(true);

    try {
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

  const handleRemoveListing = async (listingId: string) => {
    try {
      await supabase
        .from('resale_listings')
        .delete()
        .eq('id', listingId);

      toast.success('Listing removed');
      await fetchResaleListings();
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

          {/* User owns - Resell option */}
          {userOwnsItem && isLimited && (
            <div className="space-y-3">
              {!showResellForm ? (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => setShowResellForm(true)}
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
                          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7mHpMTaGN4Tzw3V_Y35xes0BeIjFXaWZ3Kw&s" 
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
                        onClick={() => handleRemoveListing(listing.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    ) : isAdmin ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveListing(listing.id)}
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
