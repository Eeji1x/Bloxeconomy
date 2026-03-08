import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import DatabaseWipePanel from '@/components/admin/DatabaseWipePanel';
import AdminCreateUserPanel from '@/components/admin/AdminCreateUserPanel';
import InviteKeysPanel from '@/components/admin/InviteKeysPanel';
import MaintenancePanel from '@/components/admin/MaintenancePanel';
import GlobalMessagePanel from '@/components/admin/GlobalMessagePanel';
import LotteryPanel from '@/components/admin/LotteryPanel';
import SodamonsValueManager from '@/components/admin/SodamonsValueManager';
import AdminCMD from '@/components/admin/AdminCMD';
import AdminPlayers from '@/pages/AdminPlayers';
import AltDetectionPanel from '@/components/admin/AltDetectionPanel';
import ApplicationsPanel from '@/components/admin/ApplicationsPanel';
import {
  Shield, Users, ShoppingBag, Gift, Megaphone, Gem, Ban, UserCheck,
  Plus, Trash2, Save, BadgeCheck, RefreshCw, RotateCcw, Edit,
  AlertTriangle, Wrench, Trophy, Mail, Clock, Terminal, Eye, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { forceDeleteItem } from '@/lib/forceDeleteItem';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'cmd', label: 'CMD', icon: <Terminal className="w-4 h-4" /> },
  { id: 'players', label: 'Player Management', icon: <Users className="w-4 h-4" /> },
  { id: 'catalog', label: 'Catalog', icon: <ShoppingBag className="w-4 h-4" /> },
  { id: 'create-user', label: 'Create User', icon: <Plus className="w-4 h-4" /> },
  { id: 'promocodes', label: 'Promocodes', icon: <Gift className="w-4 h-4" /> },
  { id: 'announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" /> },
  { id: 'invite-keys', label: 'Invite Keys', icon: <Shield className="w-4 h-4" /> },
  { id: 'maintenance', label: 'Maintenance', icon: <Wrench className="w-4 h-4" /> },
  { id: 'messaging', label: 'Messaging', icon: <Mail className="w-4 h-4" /> },
  { id: 'lottery', label: 'Lottery', icon: <Trophy className="w-4 h-4" /> },
  { id: 'sodamons', label: 'Sodamons Values', icon: <Gem className="w-4 h-4" /> },
  { id: 'alt-detection', label: 'Alt Detection', icon: <Eye className="w-4 h-4" /> },
  { id: 'applications', label: 'Applications', icon: <FileText className="w-4 h-4" /> },
  { id: 'wipe', label: 'Database Wipe', icon: <AlertTriangle className="w-4 h-4" /> },
];

const Admin = () => {
  const { user, isAdmin, isOwner, isEconomyManager, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('');

  const isStaff = isAdmin || isOwner || isEconomyManager;

  // Determine visible tabs based on role
  const getVisibleTabs = () => {
    if (isAdmin) return tabs;
    if (isOwner) return tabs; // Owners see everything
    // Economy managers see catalog, promocodes, sodamons
    return tabs.filter((t) => ['catalog', 'promocodes', 'sodamons'].includes(t.id));
  };
  
  const visibleTabs = getVisibleTabs();

  // Set default tab based on role
  useEffect(() => {
    if (!activeTab && visibleTabs.length > 0) {
      setActiveTab((isAdmin || isOwner) ? 'cmd' : 'catalog');
    }
  }, [isAdmin, isOwner, isEconomyManager]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isStaff) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <Shield className="w-8 h-8 text-destructive" />
          {isAdmin ? 'Admin Panel' : isOwner ? 'Owner Panel' : 'Economy Panel'}
        </h1>
        <p className="text-muted-foreground">
          {isAdmin ? 'Manage players, catalog, site settings' : isOwner ? 'Full access — manage everything' : 'Manage catalog items and promocodes'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {visibleTabs.map((tab) => (
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
      <div>
        {activeTab === 'cmd' && (isAdmin || isOwner) && <div className="cyber-card p-6"><AdminCMD /></div>}
        {activeTab === 'players' && (isAdmin || isOwner) && <AdminPlayers embedded />}
        {activeTab === 'catalog' && <div className="cyber-card p-6"><CatalogPanel /></div>}
        {activeTab === 'create-user' && (isAdmin || isOwner) && <div className="cyber-card p-6"><AdminCreateUserPanel /></div>}
        {activeTab === 'promocodes' && <div className="cyber-card p-6"><PromocodesPanel /></div>}
        {activeTab === 'announcements' && (isAdmin || isOwner) && <div className="cyber-card p-6"><AnnouncementsPanel /></div>}
        {activeTab === 'invite-keys' && (isAdmin || isOwner) && <div className="cyber-card p-6"><InviteKeysPanel /></div>}
        {activeTab === 'maintenance' && (isAdmin || isOwner) && <div className="cyber-card p-6"><MaintenancePanel /></div>}
        {activeTab === 'messaging' && (isAdmin || isOwner) && <div className="cyber-card p-6"><GlobalMessagePanel /></div>}
        {activeTab === 'lottery' && (isAdmin || isOwner) && <div className="cyber-card p-6"><LotteryPanel /></div>}
        {activeTab === 'sodamons' && (isAdmin || isOwner || isEconomyManager) && <div className="cyber-card p-6"><SodamonsValueManager /></div>}
        {activeTab === 'alt-detection' && (isAdmin || isOwner) && <div className="cyber-card p-6"><AltDetectionPanel /></div>}
        {activeTab === 'applications' && (isAdmin || isOwner) && <div className="cyber-card p-6"><ApplicationsPanel /></div>}
        {activeTab === 'wipe' && (isAdmin || isOwner) && <div className="cyber-card p-6"><DatabaseWipePanel /></div>}
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
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [uploadingModel, setUploadingModel] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    item_type: 'normal' as 'normal' | 'limited',
    price: 1,
    stock: null as number | null,
    is_on_sale: true,
    resell_enabled: true,
    sale_start_time: '',
    sale_end_time: '',
    model_url: '' as string,
  });

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    const { data } = await supabase.from('catalog_items').select('*').order('created_at', { ascending: false });
    if (data) setItems(data);
  };

  const uploadModelFile = async (file: File, itemName: string): Promise<string | null> => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'obj') { toast.error('Only .obj files are supported'); return null; }
    const fileName = `${Date.now()}_${itemName.replace(/[^a-z0-9]/gi, '_')}.obj`;
    setUploadingModel(true);
    const { data, error } = await supabase.storage.from('item-models').upload(fileName, file, { contentType: 'model/obj' });
    setUploadingModel(false);
    if (error) { toast.error('Failed to upload model'); return null; }
    const { data: urlData } = supabase.storage.from('item-models').getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', image_url: '', item_type: 'normal', price: 1, stock: null, is_on_sale: true, resell_enabled: true, sale_start_time: '', sale_end_time: '', model_url: '' });
    setEditingItem(null);
    setShowForm(false);
    setModelFile(null);
  };

  const handleStartEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name, description: item.description || '', image_url: item.image_url,
      item_type: item.item_type === 'giftbox' ? 'normal' : item.item_type,
      price: item.price, stock: item.stock, is_on_sale: item.is_on_sale ?? true,
      resell_enabled: item.resell_enabled ?? true,
      sale_start_time: item.sale_start_time ? new Date(item.sale_start_time).toISOString().slice(0, 16) : '',
      sale_end_time: item.sale_end_time ? new Date(item.sale_end_time).toISOString().slice(0, 16) : '',
      model_url: item.model_url || '',
    });
    setModelFile(null);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    let modelUrl = formData.model_url || null;
    if (modelFile) {
      const uploaded = await uploadModelFile(modelFile, formData.name);
      if (uploaded) modelUrl = uploaded;
      else return;
    }

    if (editingItem) {
      const wasNormal = editingItem.item_type === 'normal';
      const becomingLimited = formData.item_type === 'limited';
      const { error } = await supabase.from('catalog_items').update({
        name: formData.name, description: formData.description || null, image_url: formData.image_url,
        item_type: formData.item_type, price: formData.price, stock: formData.stock, max_stock: formData.stock,
        is_on_sale: formData.is_on_sale, is_giftbox: false, resell_enabled: formData.resell_enabled,
        sale_start_time: formData.sale_start_time ? new Date(formData.sale_start_time).toISOString() : null,
        sale_end_time: formData.sale_end_time ? new Date(formData.sale_end_time).toISOString() : null,
        model_url: modelUrl,
      }).eq('id', editingItem.id);
      if (error) { toast.error('Failed to update item'); } else {
        if (wasNormal && becomingLimited) {
          const { data: existingInventory } = await supabase.from('user_inventory').select('id, user_id').eq('item_id', editingItem.id);
          if (existingInventory && existingInventory.length > 0) {
            for (let i = 0; i < existingInventory.length; i++) {
              const inv = existingInventory[i];
              await supabase.from('item_serials').insert({ item_id: editingItem.id, serial_number: i + 1, inventory_id: inv.id, owner_id: inv.user_id, original_owner_id: inv.user_id });
            }
            toast.success(`Assigned ${existingInventory.length} serials to existing owners`);
          }
        }
        toast.success('Item updated!'); resetForm(); fetchItems();
      }
    } else {
      const { error } = await supabase.from('catalog_items').insert({
        name: formData.name, description: formData.description || null, image_url: formData.image_url,
        item_type: formData.item_type, price: formData.price, stock: formData.stock, max_stock: formData.stock,
        is_on_sale: formData.is_on_sale, is_giftbox: false, resell_enabled: formData.resell_enabled,
        sale_start_time: formData.sale_start_time ? new Date(formData.sale_start_time).toISOString() : null,
        sale_end_time: formData.sale_end_time ? new Date(formData.sale_end_time).toISOString() : null,
        model_url: modelUrl,
      });
      if (error) { toast.error('Failed to create item'); } else { toast.success('Item created!'); resetForm(); fetchItems(); }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item? This will remove it from all inventories, serials, listings, and value history.')) return;
    const { success, error, deletedName } = await forceDeleteItem(id);
    if (success) {
      toast.success(`"${deletedName}" deleted`);
      fetchItems();
    } else {
      toast.error(`Failed to delete: ${error}`);
    }
  };

  const toggleOnSale = async (id: string, current: boolean) => {
    await supabase.from('catalog_items').update({ is_on_sale: !current }).eq('id', id);
    toast.success(current ? 'Item taken off sale' : 'Item put on sale'); fetchItems();
  };

  const handleRestock = async (id: string) => {
    const amount = parseInt(restockAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Invalid amount'); return; }
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newStock = (item.stock || 0) + amount;
    await supabase.from('catalog_items').update({ stock: newStock, is_on_sale: true }).eq('id', id);
    toast.success(`Added ${amount} to stock`); setRestockingItem(null); setRestockAmount(''); fetchItems();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-display font-bold">Catalog Items ({items.length})</h2>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}><Plus className="w-4 h-4 mr-2" />Add Item</Button>
      </div>
      {showForm && (
        <div className="p-6 bg-muted/30 rounded-lg space-y-4">
          <h3 className="font-bold">{editingItem ? 'Edit Item' : 'Create New Item'}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Item name" /></div>
            <div className="space-y-2"><Label>Image URL</Label><Input value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-2"><Label>Type</Label>
              <select value={formData.item_type} onChange={(e) => setFormData({ ...formData, item_type: e.target.value as any })} className="w-full h-10 rounded-md border bg-input px-3">
                <option value="normal">Normal</option><option value="limited">Limited</option>
              </select>
              {editingItem && editingItem.item_type === 'normal' && formData.item_type === 'limited' && <p className="text-xs text-primary">⚠️ Existing owners will receive serial numbers</p>}
            </div>
            <div className="space-y-2"><Label>Price (Emeralds)</Label><Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 1 })} /></div>
            <div className="space-y-2"><Label>Stock (empty = unlimited)</Label><Input type="number" value={formData.stock || ''} onChange={(e) => setFormData({ ...formData, stock: e.target.value ? parseInt(e.target.value) : null })} placeholder="Unlimited" /></div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><input type="checkbox" checked={formData.is_on_sale} onChange={(e) => setFormData({ ...formData, is_on_sale: e.target.checked })} className="w-4 h-4" />On Sale</Label>
              {formData.item_type === 'limited' && <Label className="flex items-center gap-2"><input type="checkbox" checked={formData.resell_enabled} onChange={(e) => setFormData({ ...formData, resell_enabled: e.target.checked })} className="w-4 h-4" />Resell Enabled</Label>}
            </div>
            <div className="space-y-2"><Label>Sale Start Time</Label><input type="datetime-local" value={formData.sale_start_time} onChange={(e) => setFormData({ ...formData, sale_start_time: e.target.value })} className="w-full h-10 rounded-md border bg-input px-3 text-sm" /></div>
            <div className="space-y-2"><Label>Sale End Time</Label><input type="datetime-local" value={formData.sale_end_time} onChange={(e) => setFormData({ ...formData, sale_end_time: e.target.value })} className="w-full h-10 rounded-md border bg-input px-3 text-sm" /></div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Item description..." /></div>
          <div className="flex gap-2"><Button onClick={handleSubmit}><Save className="w-4 h-4 mr-2" />{editingItem ? 'Update' : 'Create'}</Button><Button variant="outline" onClick={resetForm}>Cancel</Button></div>
        </div>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="p-4 bg-muted/30 rounded-lg space-y-3">
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-lg bg-primary/10 overflow-hidden shrink-0"><img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{item.name}</h3>
                <div className="text-sm text-muted-foreground">{item.price} 💎 • {item.item_type}</div>
                <div className="text-xs text-muted-foreground">Stock: {item.stock ?? '∞'} • {item.is_on_sale ? 'On Sale' : 'Off Sale'}{item.item_type === 'limited' && <span> • {item.resell_enabled !== false ? 'Resell On' : 'Resell Off'}</span>}</div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => handleStartEdit(item)}><Edit className="w-4 h-4" /></Button>
              <Button size="sm" variant={item.is_on_sale ? 'outline' : 'default'} onClick={() => toggleOnSale(item.id, item.is_on_sale)}>{item.is_on_sale ? 'Off Sale' : 'On Sale'}</Button>
              {restockingItem === item.id ? (
                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="Amount" value={restockAmount} onChange={(e) => setRestockAmount(e.target.value)} className="w-20 h-8" />
                  <Button size="sm" onClick={() => handleRestock(item.id)}>Add</Button>
                  <Button size="sm" variant="outline" onClick={() => setRestockingItem(null)}>✕</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setRestockingItem(item.id)}><RefreshCw className="w-4 h-4 mr-1" />Restock</Button>
              )}
              <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
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
  const [formData, setFormData] = useState({ code: '', emerald_reward: 0, item_reward_id: null as string | null, max_uses: null as number | null });

  useEffect(() => { fetchCodes(); fetchItems(); }, []);

  const fetchCodes = async () => { const { data } = await supabase.from('promocodes').select('*').order('created_at', { ascending: false }); if (data) setCodes(data); };
  const fetchItems = async () => { const { data } = await supabase.from('catalog_items').select('id, name').order('name'); if (data) setItems(data); };

  const handleSubmit = async () => {
    const { error } = await supabase.from('promocodes').insert({ code: formData.code.toUpperCase(), emerald_reward: formData.emerald_reward, item_reward_id: formData.item_reward_id, max_uses: formData.max_uses });
    if (error) { toast.error('Failed to create code'); } else { toast.success('Code created!'); setShowForm(false); setFormData({ code: '', emerald_reward: 0, item_reward_id: null, max_uses: null }); fetchCodes(); }
  };

  const handleDelete = async (id: string) => { await supabase.from('promocodes').delete().eq('id', id); toast.success('Code deleted'); fetchCodes(); };
  const toggleActive = async (id: string, current: boolean) => { await supabase.from('promocodes').update({ is_active: !current }).eq('id', id); toast.success(current ? 'Deactivated' : 'Activated'); fetchCodes(); };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-display font-bold">Promocodes ({codes.length})</h2>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-2" />Add Code</Button>
      </div>
      {showForm && (
        <div className="p-6 bg-muted/30 rounded-lg space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Code</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="WELCOME2024" /></div>
            <div className="space-y-2"><Label>Emerald Reward</Label><Input type="number" value={formData.emerald_reward} onChange={(e) => setFormData({ ...formData, emerald_reward: parseInt(e.target.value) || 0 })} /></div>
            <div className="space-y-2"><Label>Item Reward</Label>
              <select value={formData.item_reward_id || ''} onChange={(e) => setFormData({ ...formData, item_reward_id: e.target.value || null })} className="w-full h-10 rounded-md border bg-input px-3">
                <option value="">No item</option>{items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Max Uses</Label><Input type="number" value={formData.max_uses || ''} onChange={(e) => setFormData({ ...formData, max_uses: e.target.value ? parseInt(e.target.value) : null })} placeholder="Unlimited" /></div>
          </div>
          <div className="flex gap-2"><Button onClick={handleSubmit}><Save className="w-4 h-4 mr-2" />Create</Button><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
        </div>
      )}
      <div className="space-y-3">
        {codes.map((code) => (
          <div key={code.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <div className="font-mono font-bold">{code.code}</div>
              <div className="text-sm text-muted-foreground">
                {code.emerald_reward > 0 && `${code.emerald_reward} 💎`}{code.emerald_reward > 0 && code.item_reward_id && ' + '}{code.item_reward_id && 'Item reward'}
                {' • '}{code.current_uses}/{code.max_uses ?? '∞'} uses{' • '}<span className={code.is_active ? 'text-accent' : 'text-destructive'}>{code.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={code.is_active ? 'outline' : 'default'} onClick={() => toggleActive(code.id, code.is_active)}>{code.is_active ? 'Deactivate' : 'Activate'}</Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(code.id)}><Trash2 className="w-4 h-4" /></Button>
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
  const [formData, setFormData] = useState({ text: '', link_url: '', link_text: '' });

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => { const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }); if (data) setAnnouncements(data); };

  const handleSubmit = async () => {
    const { error } = await supabase.from('announcements').insert({ text: formData.text, link_url: formData.link_url || null, link_text: formData.link_text || null, is_active: true });
    if (error) { toast.error('Failed'); } else { toast.success('Created!'); setFormData({ text: '', link_url: '', link_text: '' }); fetchAnnouncements(); }
  };

  const toggleActive = async (id: string, current: boolean) => { await supabase.from('announcements').update({ is_active: !current }).eq('id', id); fetchAnnouncements(); };
  const handleDelete = async (id: string) => { await supabase.from('announcements').delete().eq('id', id); toast.success('Deleted'); fetchAnnouncements(); };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-muted/30 rounded-lg space-y-4">
        <h3 className="font-display font-bold">Create Announcement</h3>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Message</Label><Input value={formData.text} onChange={(e) => setFormData({ ...formData, text: e.target.value })} placeholder="Welcome to SODABLOX!" /></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Link URL</Label><Input value={formData.link_url} onChange={(e) => setFormData({ ...formData, link_url: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-2"><Label>Link Text</Label><Input value={formData.link_text} onChange={(e) => setFormData({ ...formData, link_text: e.target.value })} placeholder="JOIN DISCORD" /></div>
          </div>
          <Button onClick={handleSubmit}><Save className="w-4 h-4 mr-2" />Create</Button>
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="font-display font-bold">All Announcements</h3>
        {announcements.map((ann) => (
          <div key={ann.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <div className="font-medium">{ann.text}</div>
              {ann.link_url && <div className="text-sm text-primary">{ann.link_text} → {ann.link_url}</div>}
              <div className="text-xs text-muted-foreground">{ann.is_active ? 'Active' : 'Inactive'}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={ann.is_active ? 'outline' : 'default'} onClick={() => toggleActive(ann.id, ann.is_active)}>{ann.is_active ? 'Deactivate' : 'Activate'}</Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(ann.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;
