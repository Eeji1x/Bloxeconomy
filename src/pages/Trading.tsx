import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { UserAvatar } from '@/components/avatar/UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeftRight, 
  Search, 
  Plus, 
  Minus, 
  Check, 
  X, 
  Gem,
  Package,
  Send,
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  user_id: string;
  username: string;
  numeric_id: number;
  emeralds: number;
  is_verified: boolean | null;
  is_banned?: boolean | null;
}

interface InventoryItem {
  id: string;
  item_id: string;
  quantity: number;
  catalog_items: {
    id: string;
    name: string;
    image_url: string;
    item_type: string;
  };
}

interface Trade {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_items: string[];
  receiver_items: string[];
  sender_emeralds: number;
  receiver_emeralds: number;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  created_at: string;
  sender_profile?: Profile;
  receiver_profile?: Profile;
}

const ITEMS_PER_PAGE = 14;

const Trading = () => {
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const is2016 = theme === 'roblox2016' || theme === 'roblox2015';
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'send' | 'pending' | 'history'>('pending');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [searching, setSearching] = useState(false);
  
  // Trade creation state
  const [myInventory, setMyInventory] = useState<InventoryItem[]>([]);
  const [theirInventory, setTheirInventory] = useState<InventoryItem[]>([]);
  const [selectedMyItems, setSelectedMyItems] = useState<string[]>([]);
  const [selectedTheirItems, setSelectedTheirItems] = useState<string[]>([]);
  const [myEmeralds, setMyEmeralds] = useState(0);
  const [theirEmeralds, setTheirEmeralds] = useState(0);
  const [sendingTrade, setSendingTrade] = useState(false);
  
  // Trades state
  const [pendingTrades, setPendingTrades] = useState<Trade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);

  // Inventory browsing state
  const [myInvPage, setMyInvPage] = useState(1);
  const [theirInvPage, setTheirInvPage] = useState(1);
  const [myInvSearch, setMyInvSearch] = useState('');
  const [theirInvSearch, setTheirInvSearch] = useState('');
  const [myInvCategory, setMyInvCategory] = useState('All');
  const [theirInvCategory, setTheirInvCategory] = useState('All');

  useEffect(() => {
    if (user) {
      fetchMyInventory();
      fetchTrades();
      
      const targetUserId = searchParams.get('user');
      if (targetUserId && targetUserId !== user.id) {
        fetchUserById(targetUserId);
        setActiveTab('send');
      }
    }
  }, [user, searchParams]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('trades')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `sender_id=eq.${user.id}` }, () => fetchTrades())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `receiver_id=eq.${user.id}` }, () => fetchTrades())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchUserById = async (userId: string) => {
    const { data } = await supabase
      .from('public_profiles')
      .select('user_id, username, numeric_id, is_verified')
      .eq('user_id', userId)
      .single();

    if (data) {
      setSelectedUser({ ...data, emeralds: 0, is_banned: false } as Profile);
      fetchTheirInventory(userId);
    }
  };

  const fetchMyInventory = async () => {
    const { data } = await supabase
      .from('user_inventory')
      .select(`id, item_id, quantity, catalog_items (id, name, image_url, item_type)`)
      .eq('user_id', user?.id);

    if (data) {
      const limitedItems = data.filter((item: any) => item.catalog_items?.item_type === 'limited');
      setMyInventory(limitedItems as InventoryItem[]);
    }
  };

  const fetchTheirInventory = async (userId: string) => {
    const { data } = await supabase
      .from('user_inventory')
      .select(`id, item_id, quantity, catalog_items (id, name, image_url, item_type)`)
      .eq('user_id', userId);

    if (data) {
      const limitedItems = data.filter((item: any) => item.catalog_items?.item_type === 'limited');
      setTheirInventory(limitedItems as InventoryItem[]);
    }
  };

  const fetchTrades = async () => {
    if (!user) return;

    const { data: pending } = await supabase
      .from('trades').select('*').eq('status', 'pending')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    const { data: history } = await supabase
      .from('trades').select('*').neq('status', 'pending')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false }).limit(50);

    const allUserIds = new Set<string>();
    [...(pending || []), ...(history || [])].forEach(t => {
      allUserIds.add(t.sender_id);
      allUserIds.add(t.receiver_id);
    });

    const { data: profiles } = await supabase
      .from('public_profiles').select('user_id, username, numeric_id, is_verified')
      .in('user_id', Array.from(allUserIds));

    const profileMap = new Map(profiles?.map(p => [p.user_id!, { ...p, emeralds: 0 }]));
    const addProfiles = (trades: Trade[]) => trades.map(t => ({
      ...t,
      sender_profile: profileMap.get(t.sender_id),
      receiver_profile: profileMap.get(t.receiver_id),
    }));

    if (pending) setPendingTrades(addProfiles(pending as Trade[]));
    if (history) setTradeHistory(addProfiles(history as Trade[]));
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from('public_profiles').select('user_id, username, numeric_id, is_verified')
      .neq('user_id', user?.id)
      .or(`username.ilike.%${searchQuery}%,numeric_id.eq.${parseInt(searchQuery) || 0}`)
      .limit(10);

    if (data) setSearchResults(data.map(d => ({ ...d, emeralds: 0, is_banned: false })) as Profile[]);
    setSearching(false);
  };

  const selectUser = (targetUser: Profile) => {
    setSelectedUser(targetUser);
    setSearchResults([]);
    setSearchQuery('');
    setSelectedMyItems([]);
    setSelectedTheirItems([]);
    setMyEmeralds(0);
    setTheirEmeralds(0);
    setMyInvPage(1);
    setTheirInvPage(1);
    setMyInvSearch('');
    setTheirInvSearch('');
    fetchTheirInventory(targetUser.user_id);
  };

  const toggleMyItem = (itemId: string) => {
    setSelectedMyItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : prev.length < 4 ? [...prev, itemId] : prev
    );
  };

  const toggleTheirItem = (itemId: string) => {
    setSelectedTheirItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : prev.length < 4 ? [...prev, itemId] : prev
    );
  };

  const sendTrade = async () => {
    if (!user || !selectedUser || !profile) return;

    if (selectedMyItems.length === 0 && selectedTheirItems.length === 0 && myEmeralds === 0 && theirEmeralds === 0) {
      toast.error('Please add items or emeralds to the trade');
      return;
    }

    if (myEmeralds > profile.emeralds) {
      toast.error('You don\'t have enough emeralds');
      return;
    }

    setSendingTrade(true);

    try {
      const { error } = await supabase.from('trades').insert({
        sender_id: user.id,
        receiver_id: selectedUser.user_id,
        sender_items: selectedMyItems,
        receiver_items: selectedTheirItems,
        sender_emeralds: myEmeralds,
        receiver_emeralds: theirEmeralds,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Trade request sent!');
      setSelectedUser(null);
      setSelectedMyItems([]);
      setSelectedTheirItems([]);
      setMyEmeralds(0);
      setTheirEmeralds(0);
      setActiveTab('pending');
      fetchTrades();
    } catch (error) {
      console.error('Error sending trade:', error);
      toast.error('Failed to send trade');
    } finally {
      setSendingTrade(false);
    }
  };

  const handleTrade = async (tradeId: string, action: 'accept' | 'decline' | 'cancel') => {
    if (!user || !profile) return;

    try {
      const { data, error } = await supabase.functions.invoke('execute-trade', {
        body: { trade_id: tradeId, action },
      });

      if (error) throw new Error(error.message || 'Failed to process trade');
      if (data?.error) throw new Error(data.error);

      const messages: Record<string, string> = {
        accept: 'Trade completed successfully!',
        decline: 'Trade declined',
        cancel: 'Trade cancelled',
      };
      toast.success(messages[action]);

      if (action === 'accept') {
        await refreshProfile();
        fetchMyInventory();
      }

      fetchTrades();
    } catch (error: any) {
      console.error('Error handling trade:', error);
      toast.error(error.message || 'Failed to process trade');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (profile?.is_banned) return <Navigate to="/banned" replace />;

  /* ═══════════════════════════════════════════
     ROBLOX 2016 TRADING LAYOUT
     ═══════════════════════════════════════════ */
  if (is2016) {
    // Filter helpers
    const filterItems = (items: InventoryItem[], search: string) =>
      search.trim()
        ? items.filter(i => i.catalog_items.name.toLowerCase().includes(search.toLowerCase()))
        : items;

    const myFiltered = filterItems(myInventory, myInvSearch);
    const theirFiltered = filterItems(theirInventory, theirInvSearch);

    const myTotalPages = Math.max(1, Math.ceil(myFiltered.length / ITEMS_PER_PAGE));
    const theirTotalPages = Math.max(1, Math.ceil(theirFiltered.length / ITEMS_PER_PAGE));

    const myPageItems = myFiltered.slice((myInvPage - 1) * ITEMS_PER_PAGE, myInvPage * ITEMS_PER_PAGE);
    const theirPageItems = theirFiltered.slice((theirInvPage - 1) * ITEMS_PER_PAGE, theirInvPage * ITEMS_PER_PAGE);

    // When no user selected — show find user + tabs
    if (!selectedUser || activeTab !== 'send') {
      return (
        <div style={{ maxWidth: 900 }}>
          <h1 className="rbx16-page-title">Trading</h1>
          <div className="rbx16-panel" style={{ marginBottom: 12 }}>
            <div className="rbx16-panel-body">
              <p style={{ fontSize: 13, color: '#666' }}>Trade limited items and emeralds with other players.</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #c3c3c3', marginBottom: 12 }}>
            {([['pending', `Pending (${pendingTrades.length})`], ['send', 'Send Trade'], ['history', 'History']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                style={{
                  padding: '8px 16px', fontSize: 14,
                  fontWeight: activeTab === key ? 700 : 400,
                  color: activeTab === key ? '#0074BD' : '#666',
                  background: activeTab === key ? '#fff' : '#f2f2f2',
                  border: '1px solid #c3c3c3',
                  borderBottom: activeTab === key ? '2px solid #fff' : '1px solid #c3c3c3',
                  marginBottom: -2, cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Send Trade — find user */}
          {activeTab === 'send' && (
            <div className="rbx16-panel">
              <div className="rbx16-panel-header">Find a User</div>
              <div className="rbx16-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text" placeholder="Search by username or ID..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                    style={{ flex: 1, padding: '6px 10px' }}
                  />
                  <button className="rbx16-btn-continue" onClick={searchUsers} disabled={searching}>Search</button>
                </div>
                {searchResults.length > 0 && searchResults.map((result) => (
                  <div
                    key={result.user_id}
                    onClick={() => { selectUser(result); setActiveTab('send'); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', border: '1px solid #e8e8e8', cursor: 'pointer', background: '#fafafa' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <UserAvatar userId={result.user_id} size="md" />
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#0055b3' }}>{result.username}</span>
                        <span style={{ fontSize: 11, color: '#999', marginLeft: 6 }}>#{result.numeric_id}</span>
                      </div>
                    </div>
                    <button className="rbx16-btn-continue" style={{ fontSize: 11, padding: '2px 8px' }}>Select</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending */}
          {activeTab === 'pending' && (
            <div>
              {pendingTrades.length === 0 ? (
                <div className="rbx16-panel">
                  <div className="rbx16-panel-body" style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 13 }}>No pending trades</div>
                </div>
              ) : pendingTrades.map((trade) => (
                <TradeCard key={trade.id} trade={trade} currentUserId={user.id} onAction={handleTrade} />
              ))}
            </div>
          )}

          {/* History */}
          {activeTab === 'history' && (
            <div>
              {tradeHistory.length === 0 ? (
                <div className="rbx16-panel">
                  <div className="rbx16-panel-body" style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 13 }}>No trade history</div>
                </div>
              ) : tradeHistory.map((trade) => (
                <TradeCard key={trade.id} trade={trade} currentUserId={user.id} isHistory />
              ))}
            </div>
          )}
        </div>
      );
    }

    // ─── Full trading window (image-style layout) ───
    return (
      <div style={{ maxWidth: 960, background: '#c8c8c8', border: '1px solid #999', fontFamily: 'Arial, sans-serif' }}>
        {/* Orange top bar */}
        <div style={{ background: '#f7941d', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #d4780a' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#000', letterSpacing: 0.5 }}>
            TRADING{' '}
            <span style={{ fontWeight: 400, fontSize: 13 }}>with {selectedUser.username}</span>
          </span>
          <button
            onClick={() => setSelectedUser(null)}
            style={{ background: '#aaa', border: '1px solid #888', padding: '2px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, borderRadius: 2 }}
          >
            Exit Trading &nbsp;✕
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', gap: 0 }}>
          {/* ── LEFT PANEL ── */}
          <div style={{ width: 300, minWidth: 300, background: '#d8d8d8', borderRight: '1px solid #b0b0b0', padding: 10, display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Your Offer */}
            <div style={{ background: '#e8e8e8', border: '1px solid #b8b8b8', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 8px 4px', borderBottom: '1px solid #c8c8c8' }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Your Offer</span>
                <div style={{ textAlign: 'right', fontSize: 10, color: '#333', lineHeight: 1.6 }}>
                  <div>Total RAP: <span style={{ color: '#339900', fontWeight: 700 }}>R$</span><span style={{ color: '#339900' }}>0</span></div>
                  <div>Total Value: <span style={{ color: '#339900', fontWeight: 700 }}>R$</span><span style={{ color: '#339900' }}>0</span></div>
                </div>
              </div>
              {/* Item slots */}
              <div style={{ display: 'flex', gap: 4, padding: '8px 8px 4px' }}>
                {[0, 1, 2, 3].map((i) => {
                  const itemId = selectedMyItems[i];
                  const item = itemId ? myInventory.find(x => x.id === itemId) : null;
                  return (
                    <div
                      key={i}
                      onClick={() => item && toggleMyItem(item.id)}
                      style={{
                        width: 62, height: 62, border: '1px solid #999',
                        background: item ? '#fff' : '#c0c0c0',
                        cursor: item ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', position: 'relative',
                      }}
                      title={item ? `Remove: ${item.catalog_items.name}` : 'Empty slot'}
                    >
                      {item && (
                        <>
                          <img src={item.catalog_items.image_url} alt={item.catalog_items.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          <div style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(200,0,0,0.75)', color: '#fff', fontSize: 9, padding: '0 2px', lineHeight: '13px', cursor: 'pointer' }}>✕</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Plus Robux */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px 8px', fontSize: 12 }}>
                <span>Plus</span>
                <span style={{ color: '#339900', fontWeight: 700, fontSize: 12 }}>R$</span>
                <input
                  type="number" min={0} max={profile?.emeralds || 0}
                  value={myEmeralds || ''}
                  placeholder="Enter amount"
                  onChange={(e) => setMyEmeralds(Math.min(parseInt(e.target.value) || 0, profile?.emeralds || 0))}
                  style={{ width: 110, padding: '2px 5px', fontSize: 12, border: '1px solid #aaa' }}
                />
                <span style={{ color: '#cc0000', fontWeight: 700 }}>*</span>
              </div>
            </div>

            {/* Horizontal divider */}
            <div style={{ height: 6, background: '#c0c0c0', border: '1px solid #aaa', marginBottom: 8 }} />

            {/* Your Request */}
            <div style={{ background: '#e8e8e8', border: '1px solid #b8b8b8', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 8px 4px', borderBottom: '1px solid #c8c8c8' }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Your Request</span>
                <div style={{ textAlign: 'right', fontSize: 10, color: '#333', lineHeight: 1.6 }}>
                  <div>Total RAP: <span style={{ color: '#339900', fontWeight: 700 }}>R$</span><span style={{ color: '#339900' }}>0</span></div>
                  <div>Total Value: <span style={{ color: '#339900', fontWeight: 700 }}>R$</span><span style={{ color: '#339900' }}>0</span></div>
                </div>
              </div>
              {/* Item slots */}
              <div style={{ display: 'flex', gap: 4, padding: '8px 8px 4px' }}>
                {[0, 1, 2, 3].map((i) => {
                  const itemId = selectedTheirItems[i];
                  const item = itemId ? theirInventory.find(x => x.id === itemId) : null;
                  return (
                    <div
                      key={i}
                      onClick={() => item && toggleTheirItem(item.id)}
                      style={{
                        width: 62, height: 62, border: '1px solid #999',
                        background: item ? '#fff' : '#c0c0c0',
                        cursor: item ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', position: 'relative',
                      }}
                      title={item ? `Remove: ${item.catalog_items.name}` : 'Empty slot'}
                    >
                      {item && (
                        <>
                          <img src={item.catalog_items.image_url} alt={item.catalog_items.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          <div style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(200,0,0,0.75)', color: '#fff', fontSize: 9, padding: '0 2px', lineHeight: '13px', cursor: 'pointer' }}>✕</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Plus Robux */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px 8px', fontSize: 12 }}>
                <span>Plus</span>
                <span style={{ color: '#339900', fontWeight: 700, fontSize: 12 }}>R$</span>
                <input
                  type="number" min={0}
                  value={theirEmeralds || ''}
                  placeholder="Enter amount"
                  onChange={(e) => setTheirEmeralds(parseInt(e.target.value) || 0)}
                  style={{ width: 110, padding: '2px 5px', fontSize: 12, border: '1px solid #aaa' }}
                />
                <span style={{ color: '#cc0000', fontWeight: 700 }}>*</span>
              </div>
            </div>

            {/* Send Request button */}
            <button
              onClick={sendTrade}
              disabled={sendingTrade || (selectedMyItems.length === 0 && selectedTheirItems.length === 0 && myEmeralds === 0 && theirEmeralds === 0)}
              style={{
                background: sendingTrade ? '#5a9e5a' : '#28a428',
                color: '#fff', border: 'none', width: '100%',
                padding: '10px 0', fontSize: 16, fontWeight: 700,
                cursor: sendingTrade ? 'not-allowed' : 'pointer',
                letterSpacing: 0.3,
              }}
            >
              {sendingTrade ? 'Sending...' : 'Send Request'}
            </button>

            {/* Fee note */}
            <p style={{ fontSize: 10, color: '#555', marginTop: 8 }}>* A 30% fee will be taken from the amount.</p>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{ flex: 1, background: '#fff', padding: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* My Inventory */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>My Inventory</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 12 }}>Category:</span>
                  <select
                    value={myInvCategory}
                    onChange={(e) => { setMyInvCategory(e.target.value); setMyInvPage(1); }}
                    style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #bbb' }}
                  >
                    <option>All</option>
                    <option>Hats</option>
                    <option>Gear</option>
                    <option>Faces</option>
                    <option>Packages</option>
                  </select>
                </div>
              </div>
              <input
                type="text" placeholder="Search"
                value={myInvSearch}
                onChange={(e) => { setMyInvSearch(e.target.value); setMyInvPage(1); }}
                style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #bbb', marginBottom: 8, boxSizing: 'border-box' }}
              />

              {/* Item grid */}
              <div style={{ border: '1px solid #ddd', minHeight: 240 }}>
                {myPageItems.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>No items found</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {myPageItems.map((item) => {
                      const selected = selectedMyItems.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleMyItem(item.id)}
                          style={{
                            border: `1px solid ${selected ? '#0074BD' : '#ddd'}`,
                            cursor: 'pointer',
                            background: selected ? '#deeeff' : '#fff',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            padding: '3px 2px',
                          }}
                          title={item.catalog_items.name}
                        >
                          <span style={{ fontSize: 9, color: '#0055b3', textAlign: 'center', lineHeight: 1.2, marginBottom: 1, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.catalog_items.name}
                          </span>
                          <img
                            src={item.catalog_items.image_url}
                            alt={item.catalog_items.name}
                            style={{ width: '100%', aspectRatio: '1', objectFit: 'contain' }}
                          />
                          <span style={{ fontSize: 9, color: '#0055b3', marginTop: 1 }}>R$0</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <button
                  onClick={() => setMyInvPage(p => Math.max(1, p - 1))}
                  disabled={myInvPage === 1}
                  style={{ background: '#e0e0e0', border: '1px solid #bbb', padding: '2px 8px', cursor: myInvPage === 1 ? 'not-allowed' : 'pointer', opacity: myInvPage === 1 ? 0.5 : 1 }}
                >◄</button>
                <span style={{ fontSize: 13 }}>Page {myInvPage}</span>
                <button
                  onClick={() => setMyInvPage(p => Math.min(myTotalPages, p + 1))}
                  disabled={myInvPage === myTotalPages}
                  style={{ background: '#e0e0e0', border: '1px solid #bbb', padding: '2px 8px', cursor: myInvPage === myTotalPages ? 'not-allowed' : 'pointer', opacity: myInvPage === myTotalPages ? 0.5 : 1 }}
                >►</button>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid #ddd' }} />

            {/* Partner's Inventory */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Partner's Inventory</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 12 }}>Category:</span>
                  <select
                    value={theirInvCategory}
                    onChange={(e) => { setTheirInvCategory(e.target.value); setTheirInvPage(1); }}
                    style={{ fontSize: 12, padding: '2px 4px', border: '1px solid #bbb' }}
                  >
                    <option>All</option>
                    <option>Hats</option>
                    <option>Gear</option>
                    <option>Faces</option>
                    <option>Packages</option>
                  </select>
                </div>
              </div>
              <input
                type="text" placeholder="Search"
                value={theirInvSearch}
                onChange={(e) => { setTheirInvSearch(e.target.value); setTheirInvPage(1); }}
                style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid #bbb', marginBottom: 8, boxSizing: 'border-box' }}
              />

              {/* Item grid */}
              <div style={{ border: '1px solid #ddd', minHeight: 240 }}>
                {theirPageItems.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>No items found</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {theirPageItems.map((item) => {
                      const selected = selectedTheirItems.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleTheirItem(item.id)}
                          style={{
                            border: `1px solid ${selected ? '#28a428' : '#ddd'}`,
                            cursor: 'pointer',
                            background: selected ? '#deffde' : '#fff',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            padding: '3px 2px',
                          }}
                          title={item.catalog_items.name}
                        >
                          <span style={{ fontSize: 9, color: '#0055b3', textAlign: 'center', lineHeight: 1.2, marginBottom: 1, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.catalog_items.name}
                          </span>
                          <img
                            src={item.catalog_items.image_url}
                            alt={item.catalog_items.name}
                            style={{ width: '100%', aspectRatio: '1', objectFit: 'contain' }}
                          />
                          <span style={{ fontSize: 9, color: '#0055b3', marginTop: 1 }}>R$0</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <button
                  onClick={() => setTheirInvPage(p => Math.max(1, p - 1))}
                  disabled={theirInvPage === 1}
                  style={{ background: '#e0e0e0', border: '1px solid #bbb', padding: '2px 8px', cursor: theirInvPage === 1 ? 'not-allowed' : 'pointer', opacity: theirInvPage === 1 ? 0.5 : 1 }}
                >◄</button>
                <span style={{ fontSize: 13 }}>Page {theirInvPage}</span>
                <button
                  onClick={() => setTheirInvPage(p => Math.min(theirTotalPages, p + 1))}
                  disabled={theirInvPage === theirTotalPages}
                  style={{ background: '#e0e0e0', border: '1px solid #bbb', padding: '2px 8px', cursor: theirInvPage === theirTotalPages ? 'not-allowed' : 'pointer', opacity: theirInvPage === theirTotalPages ? 0.5 : 1 }}
                >►</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-primary mb-4">
          <ArrowLeftRight className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-display font-bold">Trading</h1>
        <p className="text-muted-foreground">Trade limited items and emeralds with other players</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2">
        <Button variant={activeTab === 'pending' ? 'default' : 'outline'} onClick={() => setActiveTab('pending')} className="gap-2">
          <Clock className="w-4 h-4" />
          Pending ({pendingTrades.length})
        </Button>
        <Button variant={activeTab === 'send' ? 'neon' : 'outline'} onClick={() => setActiveTab('send')} className="gap-2">
          <Send className="w-4 h-4" />
          Send Trade
        </Button>
        <Button variant={activeTab === 'history' ? 'default' : 'outline'} onClick={() => setActiveTab('history')} className="gap-2">
          <Package className="w-4 h-4" />
          History
        </Button>
      </div>

      {/* Send Trade */}
      {activeTab === 'send' && (
        <div className="space-y-6">
          {!selectedUser ? (
            <div className="cyber-card p-6 space-y-4">
              <h2 className="font-display font-bold text-xl">Find a User</h2>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by username or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                />
                <Button onClick={searchUsers} disabled={searching}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.user_id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => selectUser(result)}
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar userId={result.user_id} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{result.username}</span>
                            {result.is_verified && (
                              <img src="/images/verified-badge.png" alt="Verified" className="w-4 h-4" />
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">#{result.numeric_id}</span>
                        </div>
                      </div>
                      <Button size="sm">Select</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="cyber-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">Trading with:</span>
                  <div className="flex items-center gap-2">
                    <UserAvatar userId={selectedUser.user_id} size="sm" />
                    <span className="font-bold">{selectedUser.username}</span>
                    {selectedUser.is_verified && (
                      <img src="/images/verified-badge.png" alt="Verified" className="w-4 h-4" />
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Your Offer */}
                <div className="cyber-card p-6 space-y-4">
                  <h3 className="font-display font-bold text-lg text-accent">You are offering</h3>
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                    <Gem className="w-5 h-5 text-accent" />
                    <Input type="number" min={0} max={profile?.emeralds || 0} value={myEmeralds} onChange={(e) => setMyEmeralds(Math.min(parseInt(e.target.value) || 0, profile?.emeralds || 0))} className="w-24 h-8" />
                    <span className="text-sm text-muted-foreground">/ {profile?.emeralds.toLocaleString()}</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Your limited items:</p>
                    {myInventory.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No limited items</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {myInventory.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => toggleMyItem(item.id)}
                            className={`p-2 rounded-lg border-2 cursor-pointer transition-all ${selectedMyItems.includes(item.id) ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'}`}
                          >
                            <img src={item.catalog_items.image_url} alt={item.catalog_items.name} className="w-full aspect-square object-contain rounded" />
                            <p className="text-xs text-center truncate mt-1">{item.catalog_items.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Their Offer */}
                <div className="cyber-card p-6 space-y-4">
                  <h3 className="font-display font-bold text-lg text-primary">You are requesting</h3>
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                    <Gem className="w-5 h-5 text-accent" />
                    <Input type="number" min={0} max={selectedUser.emeralds} value={theirEmeralds} onChange={(e) => setTheirEmeralds(Math.min(parseInt(e.target.value) || 0, selectedUser.emeralds))} className="w-24 h-8" />
                    <span className="text-sm text-muted-foreground">/ {selectedUser.emeralds.toLocaleString()}</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Their limited items:</p>
                    {theirInventory.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No limited items</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {theirInventory.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => toggleTheirItem(item.id)}
                            className={`p-2 rounded-lg border-2 cursor-pointer transition-all ${selectedTheirItems.includes(item.id) ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                          >
                            <img src={item.catalog_items.image_url} alt={item.catalog_items.name} className="w-full aspect-square object-contain rounded" />
                            <p className="text-xs text-center truncate mt-1">{item.catalog_items.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <Button variant="neon" size="lg" onClick={sendTrade} disabled={sendingTrade || (selectedMyItems.length === 0 && selectedTheirItems.length === 0 && myEmeralds === 0 && theirEmeralds === 0)}>
                  {sendingTrade ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Send Trade Request
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending Trades */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingTrades.length === 0 ? (
            <div className="cyber-card p-12 text-center">
              <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No pending trades</p>
            </div>
          ) : (
            pendingTrades.map((trade) => (
              <TradeCard key={trade.id} trade={trade} currentUserId={user.id} onAction={handleTrade} />
            ))
          )}
        </div>
      )}

      {/* Trade History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {tradeHistory.length === 0 ? (
            <div className="cyber-card p-12 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No trade history</p>
            </div>
          ) : (
            tradeHistory.map((trade) => (
              <TradeCard key={trade.id} trade={trade} currentUserId={user.id} isHistory />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Trade Card Component
const TradeCard = ({
  trade,
  currentUserId,
  onAction,
  isHistory = false
}: {
  trade: Trade;
  currentUserId: string;
  onAction?: (id: string, action: 'accept' | 'decline' | 'cancel') => void;
  isHistory?: boolean;
}) => {
  const [itemDetails, setItemDetails] = useState<Record<string, any>>({});
  const isSender = trade.sender_id === currentUserId;
  const otherUser = isSender ? trade.receiver_profile : trade.sender_profile;

  useEffect(() => {
    fetchItemDetails();
  }, []);

  const fetchItemDetails = async () => {
    const allItemIds = [...trade.sender_items, ...trade.receiver_items];
    if (allItemIds.length === 0) return;

    const { data } = await supabase
      .from('user_inventory')
      .select(`id, catalog_items (name, image_url)`)
      .in('id', allItemIds);

    if (data) {
      const details: Record<string, any> = {};
      data.forEach((item: any) => { details[item.id] = item.catalog_items; });
      setItemDetails(details);
    }
  };

  const getStatusColor = () => {
    switch (trade.status) {
      case 'accepted': return 'text-green-500';
      case 'declined': return 'text-red-500';
      case 'cancelled': return 'text-muted-foreground';
      default: return 'text-yellow-500';
    }
  };

  return (
    <div className="cyber-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">{isSender ? 'Trade to:' : 'Trade from:'}</span>
          <Link to={`/profile/${otherUser?.user_id}`} className="flex items-center gap-2 hover:text-primary">
            <span className="font-bold">{otherUser?.username}</span>
            {otherUser?.is_verified && (
              <img src="/images/verified-badge.png" alt="Verified" className="w-4 h-4" />
            )}
          </Link>
        </div>
        <span className={`text-sm font-medium uppercase ${getStatusColor()}`}>{trade.status}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 bg-muted/20 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            {isSender ? 'You offered:' : `${trade.sender_profile?.username} offered:`}
          </p>
          {trade.sender_emeralds > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <Gem className="w-4 h-4 text-accent" />
              <span className="font-bold text-accent">{trade.sender_emeralds.toLocaleString()}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {trade.sender_items.map((itemId) => (
              <div key={itemId} className="w-12 h-12 bg-muted/30 rounded-lg overflow-hidden">
                {itemDetails[itemId] && (
                  <img src={itemDetails[itemId].image_url} alt={itemDetails[itemId].name} className="w-full h-full object-contain" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-muted/20 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            {!isSender ? 'You offered:' : `${trade.receiver_profile?.username} offered:`}
          </p>
          {trade.receiver_emeralds > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <Gem className="w-4 h-4 text-accent" />
              <span className="font-bold text-accent">{trade.receiver_emeralds.toLocaleString()}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {trade.receiver_items.map((itemId) => (
              <div key={itemId} className="w-12 h-12 bg-muted/30 rounded-lg overflow-hidden">
                {itemDetails[itemId] && (
                  <img src={itemDetails[itemId].image_url} alt={itemDetails[itemId].name} className="w-full h-full object-contain" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {!isHistory && trade.status === 'pending' && onAction && (
        <div className="flex justify-end gap-2">
          {isSender ? (
            <Button variant="outline" onClick={() => onAction(trade.id, 'cancel')}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          ) : (
            <>
              <Button variant="destructive" onClick={() => onAction(trade.id, 'decline')}>
                <X className="w-4 h-4 mr-1" />
                Decline
              </Button>
              <Button variant="emerald" onClick={() => onAction(trade.id, 'accept')}>
                <Check className="w-4 h-4 mr-1" />
                Accept
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

