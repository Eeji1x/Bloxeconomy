import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { 
  BAD_DECISIONS_NUMERIC_ID, 
  PROTECTED_USER_IDS, 
  BANNED_USERNAME_PREFIX 
} from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  Users, 
  ShoppingBag, 
  Gift, 
  Megaphone,
  Gem,
  Ban,
  UserCheck,
  Plus,
  Trash2,
  Save,
  BadgeCheck,
  RefreshCw,
  RotateCcw,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { id: 'catalog', label: 'Catalog', icon: <ShoppingBag className="w-4 h-4" /> },
  { id: 'promocodes', label: 'Promocodes', icon: <Gift className="w-4 h-4" /> },
  { id: 'announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" /> },
];

const Admin = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <Shield className="w-8 h-8 text-destructive" />
          Admin Panel
        </h1>
        <p className="text-muted-foreground">Manage users, catalog, promocodes, and announcements</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            onClick={() => setActiveTab(tab.id)}
            className="gap-2"
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="cyber-card p-6">
        {activeTab === 'users' && <UsersPanel />}
        {activeTab === 'catalog' && <CatalogPanel />}
        {activeTab === 'promocodes' && <PromocodesPanel />}
        {activeTab === 'announcements' && <AnnouncementsPanel />}
      </div>
    </div>
  );
};

// Users Panel
const UsersPanel = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [emeraldAmount, setEmeraldAmount] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banningUser, setBanningUser] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('numeric_id', { ascending: true });
    
    const { data: roles } = await supabase
      .from('user_roles')
      .select('*');
    
    if (profiles) {
      const usersWithRoles = profiles.map(p => ({
        ...p,
        isAdmin: roles?.some(r => r.user_id === p.user_id && r.role === 'admin'),
      }));
      setUsers(usersWithRoles);
    }
  };

  const handleBan = async (userId: string, ban: boolean) => {
    // Get the user to check if they're protected
    const targetUser = users.find(u => u.user_id === userId);
    
    // Check if user is protected (ID #1 or ID #5)
    if (targetUser && PROTECTED_USER_IDS.includes(targetUser.numeric_id)) {
      toast.error(`User ID #${targetUser.numeric_id} cannot be banned`);
      return;
    }
    
    const reason = ban ? banReason || 'Banned by admin' : null;
    
    const updates: any = { 
      is_banned: ban, 
      ban_reason: reason,
    };
    
    if (ban && targetUser) {
      updates.banned_at = new Date().toISOString();
      
      // Rename user to SODABLOX_User_[ID]
      updates.username = `${BANNED_USERNAME_PREFIX}${targetUser.numeric_id}`;
      
      // Get BadDecisions user_id by numeric_id
      const { data: badDecisionsProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('numeric_id', BAD_DECISIONS_NUMERIC_ID)
        .maybeSingle();
      
      const systemUserId = badDecisionsProfile?.user_id || '00000000-0000-0000-0000-000000000000';
      
      // Get all limited items owned by the banned user
      const { data: userItems } = await supabase
        .from('user_inventory')
        .select('id, item_id, catalog_items!inner(item_type)')
        .eq('user_id', userId);
      
      if (userItems && userItems.length > 0) {
        // Filter to only limited items
        const limitedItemIds = userItems
          .filter((item: any) => item.catalog_items?.item_type === 'limited')
          .map((item: any) => item.id);
        
        if (limitedItemIds.length > 0) {
          // Transfer limited items to BadDecisions
          await supabase
            .from('user_inventory')
            .update({ user_id: systemUserId })
            .in('id', limitedItemIds);
          
          // Mark serials as seized
          await supabase
            .from('item_serials')
            .update({ is_seized: true })
            .in('inventory_id', limitedItemIds);
        }
      }
      
      // Cancel all active resale listings
      await supabase
        .from('resale_listings')
        .delete()
        .eq('seller_id', userId);
      
      // Cancel all pending trades (both sent and received)
      await supabase
        .from('trades')
        .update({ status: 'cancelled' })
        .eq('status', 'pending')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
        
    } else {
      updates.banned_at = null;
      updates.banned_by = null;
      // Note: Items are NOT returned on unban - this is intentional
    }
    
    await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId);
    
    toast.success(ban ? 'User banned - limited items seized by BadDecisions' : 'User unbanned (items not returned)');
    setBanningUser(null);
    setBanReason('');
    fetchUsers();
  };

  const handleGiveEmeralds = async (userId: string, amount: number) => {
    const user = users.find(u => u.user_id === userId);
    if (!user) return;

    const newAmount = Math.max(0, user.emeralds + amount);

    await supabase
      .from('profiles')
      .update({ emeralds: newAmount })
      .eq('user_id', userId);
    
    toast.success(`${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} emeralds (new total: ${newAmount})`);
    setEmeraldAmount('');
    setSelectedUser(null);
    fetchUsers();
  };

  const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (isCurrentlyAdmin) {
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');
      toast.success('Admin removed');
    } else {
      await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });
      toast.success('Admin granted');
    }
    fetchUsers();
  };

  const handleToggleVerified = async (userId: string, isCurrentlyVerified: boolean) => {
    await supabase
      .from('profiles')
      .update({ is_verified: !isCurrentlyVerified })
      .eq('user_id', userId);
    
    toast.success(isCurrentlyVerified ? 'Verified badge removed' : 'Verified badge granted');
    fetchUsers();
  };

  const handleResetUser = async (userId: string) => {
    // Reset emeralds, inventory, and avatar
    await supabase
      .from('profiles')
      .update({ emeralds: 100, avatar_data: {} })
      .eq('user_id', userId);
    
    await supabase
      .from('user_inventory')
      .delete()
      .eq('user_id', userId);
    
    toast.success('User data reset to defaults');
    fetchUsers();
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.numeric_id.toString().includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <Input
        placeholder="Search by username or ID..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />

      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <div key={user.id} className="p-4 bg-muted/30 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  {user.username[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{user.username}</span>
                    <span className="text-xs text-muted-foreground">#{user.numeric_id}</span>
                    {user.isAdmin && <span className="admin-badge text-xs">Admin</span>}
                    {user.is_verified && (
                      <img 
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7mHpMTaGN4Tzw3V_Y35xes0BeIjFXaWZ3Kw&s" 
                        alt="Verified" 
                        className="w-4 h-4"
                      />
                    )}
                    {user.is_banned && <span className="text-xs text-destructive bg-destructive/20 px-2 py-0.5 rounded">Banned</span>}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Gem className="w-3 h-3 text-accent" />
                    {user.emeralds.toLocaleString()}
                    {user.is_online && <span className="text-accent">• Online</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Emerald controls */}
                {selectedUser === user.user_id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Amount (+/-)"
                      value={emeraldAmount}
                      onChange={(e) => setEmeraldAmount(e.target.value)}
                      className="w-28 h-8"
                    />
                    <Button
                      size="sm"
                      variant="emerald"
                      onClick={() => handleGiveEmeralds(user.user_id, parseInt(emeraldAmount) || 0)}
                    >
                      Apply
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedUser(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedUser(user.user_id)}
                    title="Give/Remove Emeralds"
                  >
                    <Gem className="w-4 h-4" />
                  </Button>
                )}

                {/* Verified toggle */}
                <Button
                  size="sm"
                  variant={user.is_verified ? 'default' : 'outline'}
                  onClick={() => handleToggleVerified(user.user_id, user.is_verified)}
                  title="Toggle Verified Badge"
                >
                  <BadgeCheck className="w-4 h-4" />
                </Button>

                {/* Admin toggle (only for non-ID-1 users) */}
                {user.numeric_id !== 1 && (
                  <Button
                    size="sm"
                    variant={user.isAdmin ? 'destructive' : 'outline'}
                    onClick={() => handleToggleAdmin(user.user_id, user.isAdmin)}
                    title="Toggle Admin"
                  >
                    <Shield className="w-4 h-4" />
                  </Button>
                )}

                {/* Reset user */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm(`Reset ${user.username}'s emeralds to 100 and clear inventory?`)) {
                      handleResetUser(user.user_id);
                    }
                  }}
                  title="Reset User Data"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>

                {/* Ban toggle - only show for non-protected users */}
                {PROTECTED_USER_IDS.includes(user.numeric_id) ? (
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">Protected</span>
                ) : user.is_banned ? (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleBan(user.user_id, false)}
                    title="Unban User (items NOT returned)"
                  >
                    <UserCheck className="w-4 h-4" />
                  </Button>
                ) : banningUser === user.user_id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Ban reason..."
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      className="w-40 h-8"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleBan(user.user_id, true)}
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setBanningUser(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setBanningUser(user.user_id)}
                    title="Ban User"
                  >
                    <Ban className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {user.is_banned && user.ban_reason && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                <strong>Ban reason:</strong> {user.ban_reason}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Catalog Panel
const CatalogPanel = () => {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [restockingItem, setRestockingItem] = useState<string | null>(null);
  const [restockAmount, setRestockAmount] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    item_type: 'normal' as 'normal' | 'limited' | 'giftbox',
    price: 1,
    stock: null as number | null,
    is_on_sale: true,
    is_giftbox: false,
    resell_enabled: true,
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase
      .from('catalog_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image_url: '',
      item_type: 'normal',
      price: 1,
      stock: null,
      is_on_sale: true,
      is_giftbox: false,
      resell_enabled: true,
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleStartEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      image_url: item.image_url,
      item_type: item.item_type,
      price: item.price,
      stock: item.stock,
      is_on_sale: item.is_on_sale ?? true,
      is_giftbox: item.is_giftbox ?? false,
      resell_enabled: item.resell_enabled ?? true,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (editingItem) {
      // Update existing item
      const wasNormal = editingItem.item_type === 'normal';
      const becomingLimited = formData.item_type === 'limited';
      
      const { error } = await supabase
        .from('catalog_items')
        .update({
          name: formData.name,
          description: formData.description || null,
          image_url: formData.image_url,
          item_type: formData.item_type,
          price: formData.price,
          stock: formData.stock,
          max_stock: formData.stock,
          is_on_sale: formData.is_on_sale,
          is_giftbox: formData.item_type === 'giftbox',
          resell_enabled: formData.resell_enabled,
        })
        .eq('id', editingItem.id);
      
      if (error) {
        toast.error('Failed to update item');
      } else {
        // If converting from normal to limited, assign serials to existing owners
        if (wasNormal && becomingLimited) {
          const { data: existingInventory } = await supabase
            .from('user_inventory')
            .select('id, user_id')
            .eq('item_id', editingItem.id);
          
          if (existingInventory && existingInventory.length > 0) {
            // Create serial records for existing owners
            for (let i = 0; i < existingInventory.length; i++) {
              const inv = existingInventory[i];
              await supabase
                .from('item_serials')
                .insert({
                  item_id: editingItem.id,
                  serial_number: i + 1,
                  inventory_id: inv.id,
                  owner_id: inv.user_id,
                  original_owner_id: inv.user_id,
                });
            }
            toast.success(`Assigned ${existingInventory.length} serials to existing owners`);
          }
        }
        
        toast.success('Item updated!');
        resetForm();
        fetchItems();
      }
    } else {
      // Create new item
      const { error } = await supabase
        .from('catalog_items')
        .insert({
          name: formData.name,
          description: formData.description || null,
          image_url: formData.image_url,
          item_type: formData.item_type,
          price: formData.price,
          stock: formData.stock,
          max_stock: formData.stock,
          is_on_sale: formData.is_on_sale,
          is_giftbox: formData.item_type === 'giftbox',
          resell_enabled: formData.resell_enabled,
        });
      
      if (error) {
        toast.error('Failed to create item');
      } else {
        toast.success('Item created!');
        resetForm();
        fetchItems();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    await supabase.from('catalog_items').delete().eq('id', id);
    toast.success('Item deleted');
    fetchItems();
  };

  const toggleOnSale = async (id: string, current: boolean) => {
    await supabase.from('catalog_items').update({ is_on_sale: !current }).eq('id', id);
    toast.success(current ? 'Item taken off sale' : 'Item put on sale');
    fetchItems();
  };

  const handleRestock = async (id: string) => {
    const amount = parseInt(restockAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const item = items.find(i => i.id === id);
    if (!item) return;

    const newStock = (item.stock || 0) + amount;

    await supabase
      .from('catalog_items')
      .update({ stock: newStock, is_on_sale: true })
      .eq('id', id);
    
    toast.success(`Added ${amount} to stock (new total: ${newStock})`);
    setRestockingItem(null);
    setRestockAmount('');
    fetchItems();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-display font-bold">Catalog Items ({items.length})</h2>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {showForm && (
        <div className="p-6 bg-muted/30 rounded-lg space-y-4">
          <h3 className="font-bold">{editingItem ? 'Edit Item' : 'Create New Item'}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Item name"
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                value={formData.item_type}
                onChange={(e) => setFormData({ ...formData, item_type: e.target.value as any })}
                className="w-full h-10 rounded-md border bg-input px-3"
              >
                <option value="normal">Normal</option>
                <option value="limited">Limited</option>
                <option value="giftbox">Giftbox</option>
              </select>
              {editingItem && editingItem.item_type === 'normal' && formData.item_type === 'limited' && (
                <p className="text-xs text-primary">⚠️ Existing owners will receive serial numbers</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Price (Emeralds)</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Stock (leave empty for unlimited)</Label>
              <Input
                type="number"
                value={formData.stock || ''}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_on_sale}
                  onChange={(e) => setFormData({ ...formData, is_on_sale: e.target.checked })}
                  className="w-4 h-4"
                />
                On Sale
              </Label>
              {formData.item_type === 'limited' && (
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.resell_enabled}
                    onChange={(e) => setFormData({ ...formData, resell_enabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Resell Enabled
                </Label>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Item description..."
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSubmit}>
              <Save className="w-4 h-4 mr-2" />
              {editingItem ? 'Update Item' : 'Create Item'}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="p-4 bg-muted/30 rounded-lg space-y-3">
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-lg bg-primary/10 overflow-hidden shrink-0">
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{item.name}</h3>
                <div className="text-sm text-muted-foreground">
                  {item.price} 💎 • {item.item_type}
                </div>
                <div className="text-xs text-muted-foreground">
                  Stock: {item.stock ?? '∞'} • {item.is_on_sale ? 'On Sale' : 'Off Sale'}
                  {item.item_type === 'limited' && (
                    <span> • {item.resell_enabled !== false ? 'Resell On' : 'Resell Off'}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {/* Edit button */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStartEdit(item)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant={item.is_on_sale ? 'outline' : 'default'}
                onClick={() => toggleOnSale(item.id, item.is_on_sale)}
              >
                {item.is_on_sale ? 'Off Sale' : 'On Sale'}
              </Button>
              
              {/* Restock */}
              {restockingItem === item.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={restockAmount}
                    onChange={(e) => setRestockAmount(e.target.value)}
                    className="w-20 h-8"
                  />
                  <Button size="sm" onClick={() => handleRestock(item.id)}>
                    Add
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRestockingItem(null)}>
                    ✕
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRestockingItem(item.id)}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Restock
                </Button>
              )}
              
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(item.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Promocodes Panel
const PromocodesPanel = () => {
  const [codes, setCodes] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    emerald_reward: 0,
    item_reward_id: null as string | null,
    max_uses: null as number | null,
  });

  useEffect(() => {
    fetchCodes();
    fetchItems();
  }, []);

  const fetchCodes = async () => {
    const { data } = await supabase
      .from('promocodes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCodes(data);
  };

  const fetchItems = async () => {
    const { data } = await supabase
      .from('catalog_items')
      .select('id, name')
      .order('name');
    if (data) setItems(data);
  };

  const handleSubmit = async () => {
    const { error } = await supabase
      .from('promocodes')
      .insert({
        code: formData.code.toUpperCase(),
        emerald_reward: formData.emerald_reward,
        item_reward_id: formData.item_reward_id,
        max_uses: formData.max_uses,
      });
    
    if (error) {
      toast.error('Failed to create code');
    } else {
      toast.success('Code created!');
      setShowForm(false);
      setFormData({ code: '', emerald_reward: 0, item_reward_id: null, max_uses: null });
      fetchCodes();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('promocodes').delete().eq('id', id);
    toast.success('Code deleted');
    fetchCodes();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('promocodes').update({ is_active: !current }).eq('id', id);
    toast.success(current ? 'Code deactivated' : 'Code activated');
    fetchCodes();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-display font-bold">Promocodes ({codes.length})</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Code
        </Button>
      </div>

      {showForm && (
        <div className="p-6 bg-muted/30 rounded-lg space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="WELCOME2024"
              />
            </div>
            <div className="space-y-2">
              <Label>Emerald Reward</Label>
              <Input
                type="number"
                value={formData.emerald_reward}
                onChange={(e) => setFormData({ ...formData, emerald_reward: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Item Reward (optional)</Label>
              <select
                value={formData.item_reward_id || ''}
                onChange={(e) => setFormData({ ...formData, item_reward_id: e.target.value || null })}
                className="w-full h-10 rounded-md border bg-input px-3"
              >
                <option value="">No item</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Max Uses (empty = unlimited)</Label>
              <Input
                type="number"
                value={formData.max_uses || ''}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Unlimited"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSubmit}>
              <Save className="w-4 h-4 mr-2" />
              Create Code
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {codes.map((code) => (
          <div key={code.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <div className="font-mono font-bold">{code.code}</div>
              <div className="text-sm text-muted-foreground">
                {code.emerald_reward > 0 && `${code.emerald_reward} 💎`}
                {code.emerald_reward > 0 && code.item_reward_id && ' + '}
                {code.item_reward_id && 'Item reward'}
                {' • '}{code.current_uses}/{code.max_uses ?? '∞'} uses 
                {' • '}<span className={code.is_active ? 'text-accent' : 'text-destructive'}>{code.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant={code.is_active ? 'outline' : 'default'}
                onClick={() => toggleActive(code.id, code.is_active)}
              >
                {code.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(code.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Announcements Panel
const AnnouncementsPanel = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    text: '',
    link_url: '',
    link_text: '',
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAnnouncements(data);
  };

  const handleSubmit = async () => {
    const { error } = await supabase
      .from('announcements')
      .insert({
        text: formData.text,
        link_url: formData.link_url || null,
        link_text: formData.link_text || null,
        is_active: true,
      });
    
    if (error) {
      toast.error('Failed to create announcement');
    } else {
      toast.success('Announcement created!');
      setFormData({ text: '', link_url: '', link_text: '' });
      fetchAnnouncements();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('announcements').update({ is_active: !current }).eq('id', id);
    fetchAnnouncements();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id);
    toast.success('Announcement deleted');
    fetchAnnouncements();
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-muted/30 rounded-lg space-y-4">
        <h3 className="font-display font-bold">Create Announcement</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Message</Label>
            <Input
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              placeholder="Welcome to SODABLOX!"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Link URL (optional)</Label>
              <Input
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                placeholder="https://discord.gg/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Link Text</Label>
              <Input
                value={formData.link_text}
                onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                placeholder="JOIN DISCORD"
              />
            </div>
          </div>
          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Create Announcement
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-display font-bold">All Announcements</h3>
        {announcements.map((ann) => (
          <div key={ann.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <div className="font-medium">{ann.text}</div>
              {ann.link_url && (
                <div className="text-sm text-primary">{ann.link_text} → {ann.link_url}</div>
              )}
              <div className="text-xs text-muted-foreground">{ann.is_active ? 'Active' : 'Inactive'}</div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={ann.is_active ? 'outline' : 'default'}
                onClick={() => toggleActive(ann.id, ann.is_active)}
              >
                {ann.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(ann.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;
