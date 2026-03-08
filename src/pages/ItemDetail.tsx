import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { updateItemRAP } from '@/lib/rap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OwnersPanel } from '@/components/catalog/OwnersPanel';
import { ItemModel3DViewer } from '@/components/catalog/ItemModel3DViewer';
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
  Trash2,
  Box
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

const toSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const ItemDetail = () => {
  const { itemSlug } = useParams();
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [resaleListings, setResaleListings] = useState<ResaleListing[]>([]);
  const [userInventory, setUserInventory] = useState<UserInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingItem, setBuyingItem] = useState(false);
  const [buyingResale, setBuyingResale] = useState<string | null>(null);
  
  const [showResellForm, setShowResellForm] = useState(false);
  const [resellPrice, setResellPrice] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [creatingListing, setCreatingListing] = useState(false);
  const [view3D, setView3D] = useState(false);

  const [itemId, setItemId] = useState<string | null>(null);
  const is2016 = theme === 'roblox2016';
  const is2015 = theme === 'roblox2015';
  const isClassic = is2016 || is2015;
  const p = is2015 ? 'rbx15' : 'rbx16';

  useEffect(() => {
    const resolveItem = async () => {
      if (!itemSlug) return;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(itemSlug)) {
        setItemId(itemSlug);
        return;
      }
      const { data } = await supabase
        .from('catalog_items')
        .select('id, name')
        .order('created_at', { ascending: false });
      if (data) {
        const match = data.find(i => toSlug(i.name) === itemSlug);
        if (match) {
          setItemId(match.id);
          return;
        }
      }
      setItemId(null);
      setLoading(false);
    };
    resolveItem();
  }, [itemSlug]);

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
      const sellerIds = data.map(l => l.seller_id);
      const { data: profiles } = await (supabase as any)
        .from('public_profiles')
        .select('user_id, username, is_verified')
        .in('user_id', sellerIds);
      const profileRows = (profiles || []) as Array<{ user_id: string; username: string; is_verified: boolean | null }>;
      const profileMap = new Map(profileRows.map(p => [p.user_id, p]));
      setResaleListings(data.map(l => ({
        ...l,
        seller_profile: profileMap.get(l.seller_id) as { username: string; is_verified: boolean | null } | undefined,
      })));
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
    if (profile.is_banned) { toast.error('You are banned'); return; }
    if (profile.emeralds < item.price) {
      toast.error(`You need ${(item.price - profile.emeralds).toLocaleString()} more Emeralds`);
      return;
    }
    setBuyingItem(true);
    try {
      const { data, error } = await (supabase.rpc as any)('purchase_item', { p_item_id: item.id });
      if (error) throw error;
      const result = data as Record<string, unknown> | null;
      if (result?.error) {
        toast.error(String(result.error));
        setBuyingItem(false);
        return;
      }
      await refreshProfile();
      await fetchItem();
      await fetchUserInventory();
      if (item.item_type === 'limited') await updateItemRAP(item.id, item.price);
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
    if (profile.is_banned) { toast.error('You are banned'); return; }
    if (listing.seller_id === user.id) { toast.error('You cannot buy your own listing'); return; }
    setBuyingResale(listing.id);
    try {
      const { data, error } = await supabase.functions.invoke('process-resale-purchase', { body: { listing_id: listing.id } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); await fetchResaleListings(); return; }
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
    if (profile.is_banned) { toast.error('Banned users cannot list items'); return; }
    if (profile.numeric_id === 5) { toast.error('System accounts cannot list items'); return; }
    const price = parseInt(resellPrice);
    if (isNaN(price) || price < 1) { toast.error('Price must be greater than 0'); return; }
    const { data: ownedItem } = await supabase.from('user_inventory').select('id').eq('id', selectedInventoryId).eq('user_id', user.id).maybeSingle();
    if (!ownedItem) { toast.error('You do not own this item'); await fetchUserInventory(); return; }
    const { data: existingListing } = await supabase.from('resale_listings').select('id').eq('inventory_id', selectedInventoryId).eq('is_active', true).maybeSingle();
    if (existingListing) { toast.error('This item is already listed for sale'); return; }
    setCreatingListing(true);
    try {
      await supabase.from('user_inventory').update({ is_equipped: false }).eq('id', selectedInventoryId);
      const { error } = await supabase.from('resale_listings').insert({ seller_id: user.id, item_id: itemId, inventory_id: selectedInventoryId, price });
      if (error) throw error;
      toast.success('Listing created!');
      setShowResellForm(false);
      setResellPrice('');
      setSelectedInventoryId(null);
      await fetchResaleListings();
      await fetchUserInventory();
    } catch (error: any) {
      if (error.code === '23505') { toast.error('This item is already listed'); }
      else { toast.error('Failed to create listing'); }
    } finally {
      setCreatingListing(false);
    }
  };

  const handleRemoveListing = async (listing: ResaleListing) => {
    if (listing.seller_id !== user?.id) { toast.error('Only the seller can remove this listing'); return; }
    try {
      await supabase.from('user_inventory').update({ user_id: listing.seller_id }).eq('id', listing.inventory_id);
      await supabase.from('resale_listings').delete().eq('id', listing.id);
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
        <div className={isClassic ? `${p}-spinner` : "w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"} />
      </div>
    );
  }

  if (!item) {
    return <Navigate to="/catalog" replace />;
  }

  const userOwnsItem = userInventory.length > 0;
  const isLimited = item.item_type === 'limited';
  const canBuyOfficial = item.is_on_sale && (item.stock === null || item.stock > 0) && !(isLimited && userOwnsItem);

  const listedInventoryIds = resaleListings.filter(l => l.seller_id === user?.id).map(l => l.inventory_id);
  const unlistedInventory = userInventory.filter(i => !listedInventoryIds.includes(i.id));

  /* ═══════════════════════════════════════════
     ROBLOX 2016 ITEM DETAIL
     ═══════════════════════════════════════════ */
  if (isClassic) {
    return (
      <div className="rbx16-item-page">
        {/* Breadcrumb */}
        <div className="rbx16-breadcrumb">
          <Link to="/catalog" className="rbx16-link">Catalog</Link>
          <span style={{ margin: '0 6px', color: '#999' }}>›</span>
          <span style={{ color: '#666' }}>{item.name}</span>
        </div>

        <div className="rbx16-item-layout">
          {/* Left — Image */}
          <div className="rbx16-item-image-col">
            <div className="rbx16-panel">
              <div className="rbx16-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Preview</span>
                <button onClick={() => setView3D(!view3D)} style={{ fontSize: 11, color: '#00a2ff', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  {view3D ? '2D View' : '3D View'}
                </button>
              </div>
              <div className="rbx16-item-image-container">
                {view3D ? (
                  <div style={{ width: '100%', height: 300 }}>
                    <ItemModel3DViewer imageUrl={item.image_url} height={300} />
                  </div>
                ) : (
                  <>
                    <img src={item.image_url} alt={item.name} />
                    {isLimited && (
                      <img src="/images/2016/limitedOverlay_small.png" alt="Limited" className="rbx16-limited-overlay-detail" />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right — Info */}
          <div className="rbx16-item-info-col">
            <div className="rbx16-panel">
              <div className="rbx16-panel-header">{item.name}</div>
              <div className="rbx16-panel-body">
                {item.description && (
                  <p className="rbx16-text" style={{ marginBottom: 12 }}>{item.description}</p>
                )}

                <table className="rbx16-item-stats-table">
                  <tbody>
                    <tr>
                      <td className="rbx16-stat-label">Type</td>
                      <td className="rbx16-stat-value" style={{ textTransform: 'capitalize' }}>{item.item_type}</td>
                    </tr>
                    <tr>
                      <td className="rbx16-stat-label">Price</td>
                      <td className="rbx16-stat-value" style={{ color: '#02b757', fontWeight: 700 }}>
                        💎 {item.price.toLocaleString()}
                      </td>
                    </tr>
                    {item.stock !== null && (
                      <tr>
                        <td className="rbx16-stat-label">Stock</td>
                        <td className="rbx16-stat-value">{item.stock} remaining</td>
                      </tr>
                    )}
                    <tr>
                      <td className="rbx16-stat-label">Updated</td>
                      <td className="rbx16-stat-value">{new Date(item.created_at).toLocaleDateString()}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Buy button */}
                {canBuyOfficial && user && (
                  <button
                    className="rbx16-btn-buy"
                    style={{ marginTop: 12 }}
                    onClick={handleBuyOfficial}
                    disabled={buyingItem}
                  >
                    {buyingItem ? 'Purchasing...' : `Buy for ${item.price.toLocaleString()} 💎`}
                  </button>
                )}

                {!item.is_on_sale && (
                  <button className="rbx16-btn-cancel" style={{ marginTop: 12, width: '100%', opacity: 0.6, cursor: 'not-allowed' }} disabled>
                    Off Sale
                  </button>
                )}

                {/* Sell button */}
                {userOwnsItem && isLimited && item.resell_enabled !== false && (
                  <div style={{ marginTop: 12 }}>
                    {!showResellForm ? (
                      <button
                        className="rbx16-btn-legacy"
                        style={{ width: '100%' }}
                        onClick={() => {
                          setShowResellForm(true);
                          if (unlistedInventory.length > 0) setSelectedInventoryId(unlistedInventory[0].id);
                        }}
                        disabled={unlistedInventory.length === 0}
                      >
                        {unlistedInventory.length > 0 ? 'Sell This Item' : 'All Items Listed'}
                      </button>
                    ) : (
                      <div className="rbx16-panel" style={{ marginTop: 8 }}>
                        <div className="rbx16-panel-header">Create Resale Listing</div>
                        <div className="rbx16-panel-body">
                          <input
                            type="number"
                            placeholder="Price in emeralds"
                            value={resellPrice}
                            onChange={(e) => setResellPrice(e.target.value)}
                            min={1}
                            style={{ width: '100%', marginBottom: 8, padding: '6px 8px', border: '1px solid #c3c3c3' }}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="rbx16-btn-buy" onClick={handleCreateListing} disabled={creatingListing || !resellPrice}>
                              {creatingListing ? 'Creating...' : 'List Item'}
                            </button>
                            <button className="rbx16-btn-cancel" onClick={() => setShowResellForm(false)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Owners */}
        {isLimited && (
          <div style={{ marginTop: 16 }}>
            <OwnersPanel itemId={item.id} itemType={item.item_type} />
          </div>
        )}

        {/* Resale Listings */}
        {isLimited && (
          <div className="rbx16-panel" style={{ marginTop: 16 }}>
            <div className="rbx16-panel-header">Player Resales ({resaleListings.length})</div>
            <div className="rbx16-panel-body">
              {resaleListings.length === 0 ? (
                <p className="rbx16-text-muted" style={{ textAlign: 'center', padding: 20 }}>No resale listings yet</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #c3c3c3', fontSize: 13, color: '#666' }}>Seller</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '2px solid #c3c3c3', fontSize: 13, color: '#666' }}>Price</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '2px solid #c3c3c3', fontSize: 13, color: '#666' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resaleListings.map((listing) => (
                      <tr key={listing.id} style={{ borderBottom: '1px solid #e8e8e8' }}>
                        <td style={{ padding: '8px' }}>
                          <Link to={`/profile/${listing.seller_id}`} className="rbx16-link">
                            {listing.seller_profile?.username}
                            {listing.seller_profile?.is_verified && (
                              <img src="/images/verified-badge.png" alt="Verified" style={{ width: 14, height: 14, display: 'inline', marginLeft: 4, verticalAlign: 'middle' }} />
                            )}
                          </Link>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#02b757', fontWeight: 700 }}>
                          💎 {listing.price.toLocaleString()}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          {listing.seller_id === user?.id ? (
                            <button className="rbx16-btn-danger" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => handleRemoveListing(listing)}>
                              Remove
                            </button>
                          ) : (
                            <button
                              className="rbx16-btn-buy"
                              style={{ padding: '3px 10px', fontSize: 12, width: 'auto' }}
                              onClick={() => handleBuyResale(listing)}
                              disabled={buyingResale === listing.id || !user}
                            >
                              {buyingResale === listing.id ? '...' : 'Buy'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     DEFAULT SODABLOX LAYOUT
     ═══════════════════════════════════════════ */
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Link to="/catalog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Catalog
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="relative">
          {item.model_url && (
            <button
              onClick={() => setView3D(!view3D)}
              className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border text-xs font-semibold hover:bg-background transition-colors flex items-center gap-1.5"
            >
              <Box className="w-3.5 h-3.5" />
              {view3D ? '2D View' : '3D View'}
            </button>
          )}
          {view3D && item.model_url ? (
            <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: '1', minHeight: 350 }}>
              <ItemModel3DViewer modelUrl={item.model_url} height={400} />
            </div>
          ) : (
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 overflow-hidden relative">
              <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-8" />
              {isLimited && (
                <div className="absolute top-4 right-4 limited-badge">
                  <Star className="w-4 h-4" />
                  Limited
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-display font-bold">{item.name}</h1>
            {item.description && <p className="text-muted-foreground mt-2">{item.description}</p>}
          </div>

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

          {canBuyOfficial && user && (
            <Button variant="emerald" size="lg" className="w-full" onClick={handleBuyOfficial} disabled={buyingItem}>
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
            <Button variant="outline" size="lg" className="w-full" disabled>Off Sale</Button>
          )}

          {userOwnsItem && isLimited && item.resell_enabled !== false && (
            <div className="space-y-3">
              {!showResellForm ? (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    setShowResellForm(true);
                    if (unlistedInventory.length > 0) setSelectedInventoryId(unlistedInventory[0].id);
                  }}
                  disabled={unlistedInventory.length === 0}
                >
                  <Tag className="w-5 h-5 mr-2" />
                  {unlistedInventory.length > 0 ? 'Sell This Item' : 'All Items Listed'}
                </Button>
              ) : (
                <div className="cyber-card p-4 space-y-3">
                  <h3 className="font-bold">Create Resale Listing</h3>
                  <Input type="number" placeholder="Price in emeralds" value={resellPrice} onChange={(e) => setResellPrice(e.target.value)} min={1} />
                  <div className="flex gap-2">
                    <Button variant="emerald" onClick={handleCreateListing} disabled={creatingListing || !resellPrice}>
                      {creatingListing ? 'Creating...' : 'List Item'}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowResellForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isLimited && <OwnersPanel itemId={item.id} itemType={item.item_type} />}

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
                    <Link to={`/profile/${listing.seller_id}`} className="flex items-center gap-2 hover:text-primary">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{listing.seller_profile?.username}</span>
                      {listing.seller_profile?.is_verified && (
                        <img src="/images/verified-badge.png" alt="Verified" className="w-4 h-4" />
                      )}
                    </Link>
                    <div className="flex items-center gap-2">
                      <Gem className="w-4 h-4 text-accent" />
                      <span className="font-bold text-accent">{listing.price.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {listing.seller_id === user?.id ? (
                      <Button variant="destructive" size="sm" onClick={() => handleRemoveListing(listing)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button variant="emerald" size="sm" onClick={() => handleBuyResale(listing)} disabled={buyingResale === listing.id || !user}>
                        {buyingResale === listing.id ? (
                          <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                        ) : 'Buy'}
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
