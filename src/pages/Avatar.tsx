import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { DEFAULT_AVATAR_URL } from '@/lib/constants';
import { User, Package, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Avatar3DViewer } from '@/components/avatar/Avatar3DViewer';

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

const toSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const Avatar = () => {
  const { user, profile, isLoading } = useAuth();
  const { theme } = useTheme();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [view3D, setView3D] = useState(false);

  const is2016 = theme === 'roblox2016';
  const is2015 = theme === 'roblox2015';
  const isClassic = is2016 || is2015;
  const p = is2015 ? 'rbx15' : 'rbx16';

  useEffect(() => {
    const fetchInventory = async () => {
      if (!user) return;
      const { data, error } = await supabase.from('user_inventory').select(`id, item_id, quantity, is_equipped, catalog_items (id, name, image_url, item_type)`).eq('user_id', user.id);
      if (!error && data) setInventory(data as InventoryItem[]);
      setLoadingInventory(false);
    };
    fetchInventory();
  }, [user]);

  const handleEquip = async (itemId: string, currentlyEquipped: boolean) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('user_inventory').update({ is_equipped: !currentlyEquipped }).eq('id', itemId).eq('user_id', user.id);
      if (error) throw error;
      setInventory(prev => prev.map(item => item.id === itemId ? { ...item, is_equipped: !currentlyEquipped } : item));
      toast.success(currentlyEquipped ? 'Item unequipped' : 'Item equipped');
    } catch (error) {
      console.error('Error equipping item:', error);
      toast.error('Failed to update item');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]">
      <div className={isClassic ? `${p}-spinner` : "w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"} />
    </div>;
  }

  if (!user || !profile) return <Navigate to="/login" replace />;

  const equippedItems = inventory.filter(i => i.is_equipped);

  /* ═══════════════════════════════════════════
     ROBLOX 2016 AVATAR EDITOR LAYOUT
     ═══════════════════════════════════════════ */
  if (isClassic) {
    return (
      <div>
        <h1 className="rbx16-page-title">Avatar Editor</h1>
        <div style={{ display: 'flex', gap: 16 }}>
        {/* Preview */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div className="rbx16-panel">
            <div className="rbx16-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Preview</span>
              <button onClick={() => setView3D(!view3D)} style={{ fontSize: 11, color: '#00a2ff', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                {view3D ? '2D View' : '3D View'}
              </button>
            </div>
            <div className="rbx16-panel-body" style={{ padding: 0 }}>
              {view3D ? (
                <div style={{ height: 350 }}>
                  <Avatar3DViewer equippedItems={equippedItems.filter(i => i.catalog_items).map(i => ({ image_url: i.catalog_items!.image_url, name: i.catalog_items!.name }))} />
                </div>
              ) : (
                <div style={{ aspectRatio: '3/4', border: '1px solid #e8e8e8', background: '#fff', position: 'relative', overflow: 'hidden', margin: 8 }}>
                  <img src={DEFAULT_AVATAR_URL} alt="Your Avatar" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8, position: 'absolute', inset: 0 }} />
                  {equippedItems.map((item) => (
                    <img key={item.id} src={item.catalog_items?.image_url} alt={item.catalog_items?.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8, position: 'absolute', inset: 0, opacity: 1 }} />
                  ))}
                </div>
              )}
              <div style={{ textAlign: 'center', fontSize: 12, color: '#666', padding: '6px 0' }}>
                {equippedItems.length > 0 ? `${equippedItems.length} item(s) equipped` : 'Default Avatar'}
                {view3D && <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>Drag to rotate • Scroll to zoom</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rbx16-panel">
            <div className="rbx16-panel-header">Your Inventory ({inventory.length} items)</div>
            <div className="rbx16-panel-body">
              {loadingInventory ? (
                <div style={{ textAlign: 'center', padding: 40 }}><div className="rbx16-spinner" style={{ margin: '0 auto' }} /></div>
              ) : inventory.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                  {inventory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleEquip(item.id, !!item.is_equipped)}
                      style={{
                        border: item.is_equipped ? '2px solid #02b757' : '1px solid #e8e8e8',
                        background: '#fff', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                      }}
                    >
                      <div style={{ aspectRatio: '1', position: 'relative' }}>
                        <img src={item.catalog_items?.image_url || '/placeholder.svg'} alt={item.catalog_items?.name || 'Item'} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
                        {item.catalog_items?.item_type === 'limited' && (
                          <img src="/images/2016/limitedOverlay_small.png" alt="Limited" className="rbx16-limited-overlay" />
                        )}
                        {item.is_equipped && (
                          <div style={{ position: 'absolute', bottom: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: '#02b757', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check className="w-3 h-3" style={{ color: '#fff' }} />
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '2px 4px', fontSize: 10, color: '#0055b3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.catalog_items?.name}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 13 }}>
                  <p>No items yet.</p>
                  <p style={{ marginTop: 4 }}>Purchase items from the <Link to="/catalog" className="rbx16-link">catalog</Link> to customize your avatar.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     DEFAULT SODABLOX LAYOUT
     ═══════════════════════════════════════════ */
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <User className="w-8 h-8 text-primary" />
          Avatar Editor
        </h1>
        <p className="text-muted-foreground">Customize your avatar with items from your inventory</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="cyber-card p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold">Preview</h2>
            <button onClick={() => setView3D(!view3D)} className="text-xs text-primary font-semibold hover:underline">
              {view3D ? 'Switch to 2D' : 'Switch to 3D'}
            </button>
          </div>
          {view3D ? (
            <div className="rounded-xl overflow-hidden" style={{ height: 400 }}>
              <Avatar3DViewer equippedItems={equippedItems.filter(i => i.catalog_items).map(i => ({ image_url: i.catalog_items!.image_url, name: i.catalog_items!.name }))} />
            </div>
          ) : (
            <div className="aspect-[3/4] rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden relative">
              <img src={DEFAULT_AVATAR_URL} alt="Your Avatar" className="w-full h-full object-contain p-4 absolute inset-0" />
              {equippedItems.map((item) => (
                <img key={item.id} src={item.catalog_items?.image_url} alt={item.catalog_items?.name} className="w-full h-full object-contain p-4 absolute inset-0" style={{ opacity: 1, mixBlendMode: 'normal' }} />
              ))}
            </div>
          )}
          <p className="text-center text-sm text-muted-foreground mt-4">
            {equippedItems.length > 0 ? `${equippedItems.length} item(s) equipped` : 'Default Avatar'}
            {view3D && <span className="block text-xs mt-1 opacity-60">Drag to rotate • Scroll to zoom</span>}
          </p>
        </div>

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
                <div key={item.id} className={`aspect-square rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 border-2 overflow-hidden relative cursor-pointer group transition-all ${item.is_equipped ? 'border-accent shadow-lg shadow-accent/20' : 'border-primary/20 hover:border-primary/50'}`} onClick={() => handleEquip(item.id, !!item.is_equipped)}>
                  <img src={item.catalog_items?.image_url || '/placeholder.svg'} alt={item.catalog_items?.name || 'Item'} className="w-full h-full object-contain p-2" />
                  {item.catalog_items?.item_type === 'limited' && <div className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-secondary/80 text-secondary-foreground">LTD</div>}
                  {item.is_equipped && <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center"><Check className="w-3 h-3 text-accent-foreground" /></div>}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-xs text-white text-center px-1">{item.is_equipped ? 'Unequip' : 'Equip'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="min-h-[300px] flex items-center justify-center">
              <div className="text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-bold text-muted-foreground">No Items Yet</h3>
                <p className="text-sm text-muted-foreground mt-2">Purchase items from the catalog to customize your avatar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Avatar;