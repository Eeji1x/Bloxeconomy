import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
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
  Save
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

  const handleBan = async (userId: string, ban: boolean, reason?: string) => {
    await supabase
      .from('profiles')
      .update({ is_banned: ban, ban_reason: ban ? reason || 'Banned by admin' : null })
      .eq('user_id', userId);
    
    toast.success(ban ? 'User banned' : 'User unbanned');
    fetchUsers();
  };

  const handleGiveEmeralds = async (userId: string, amount: number) => {
    const user = users.find(u => u.user_id === userId);
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ emeralds: user.emeralds + amount })
      .eq('user_id', userId);
    
    toast.success(`${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} emeralds`);
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
          <div key={user.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{user.username}</span>
                  <span className="text-xs text-muted-foreground">#{user.numeric_id}</span>
                  {user.isAdmin && <span className="admin-badge text-xs">Admin</span>}
                  {user.is_banned && <span className="text-xs text-destructive">Banned</span>}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Gem className="w-3 h-3 text-accent" />
                  {user.emeralds.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Emerald controls */}
              {selectedUser === user.user_id ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={emeraldAmount}
                    onChange={(e) => setEmeraldAmount(e.target.value)}
                    className="w-24 h-8"
                  />
                  <Button
                    size="sm"
                    variant="emerald"
                    onClick={() => handleGiveEmeralds(user.user_id, parseInt(emeraldAmount) || 0)}
                  >
                    Give
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
                >
                  <Gem className="w-4 h-4" />
                </Button>
              )}

              {/* Admin toggle (only for non-ID-1 users) */}
              {user.numeric_id !== 1 && (
                <Button
                  size="sm"
                  variant={user.isAdmin ? 'destructive' : 'outline'}
                  onClick={() => handleToggleAdmin(user.user_id, user.isAdmin)}
                >
                  <Shield className="w-4 h-4" />
                </Button>
              )}

              {/* Ban toggle */}
              <Button
                size="sm"
                variant={user.is_banned ? 'default' : 'destructive'}
                onClick={() => handleBan(user.user_id, !user.is_banned)}
              >
                {user.is_banned ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
              </Button>
            </div>
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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    item_type: 'normal' as 'normal' | 'limited' | 'giftbox',
    price: 1,
    stock: null as number | null,
    is_on_sale: true,
    is_giftbox: false,
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

  const handleSubmit = async () => {
    const { error } = await supabase
      .from('catalog_items')
      .insert({
        ...formData,
        is_giftbox: formData.item_type === 'giftbox',
      });
    
    if (error) {
      toast.error('Failed to create item');
    } else {
      toast.success('Item created!');
      setShowForm(false);
      setFormData({
        name: '',
        description: '',
        image_url: '',
        item_type: 'normal',
        price: 1,
        stock: null,
        is_on_sale: true,
        is_giftbox: false,
      });
      fetchItems();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('catalog_items').delete().eq('id', id);
    toast.success('Item deleted');
    fetchItems();
  };

  const toggleOnSale = async (id: string, current: boolean) => {
    await supabase.from('catalog_items').update({ is_on_sale: !current }).eq('id', id);
    fetchItems();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-display font-bold">Catalog Items ({items.length})</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {showForm && (
        <div className="p-6 bg-muted/30 rounded-lg space-y-4">
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
              Create Item
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="p-4 bg-muted/30 rounded-lg space-y-3">
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-lg bg-primary/10 overflow-hidden">
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold truncate">{item.name}</h3>
                <div className="text-sm text-muted-foreground">
                  {item.price} 💎 • {item.item_type}
                </div>
                <div className="text-xs text-muted-foreground">
                  Stock: {item.stock ?? '∞'} • {item.is_on_sale ? 'On Sale' : 'Off Sale'}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={item.is_on_sale ? 'outline' : 'default'}
                onClick={() => toggleOnSale(item.id, item.is_on_sale)}
              >
                {item.is_on_sale ? 'Take Off Sale' : 'Put On Sale'}
              </Button>
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
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    emerald_reward: 0,
    max_uses: null as number | null,
  });

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    const { data } = await supabase
      .from('promocodes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCodes(data);
  };

  const handleSubmit = async () => {
    const { error } = await supabase
      .from('promocodes')
      .insert({
        code: formData.code.toUpperCase(),
        emerald_reward: formData.emerald_reward,
        max_uses: formData.max_uses,
      });
    
    if (error) {
      toast.error('Failed to create code');
    } else {
      toast.success('Code created!');
      setShowForm(false);
      setFormData({ code: '', emerald_reward: 0, max_uses: null });
      fetchCodes();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('promocodes').delete().eq('id', id);
    toast.success('Code deleted');
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
          <div className="grid md:grid-cols-3 gap-4">
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
                {code.emerald_reward} 💎 • {code.current_uses}/{code.max_uses ?? '∞'} uses • {code.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
            <Button size="sm" variant="destructive" onClick={() => handleDelete(code.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
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
