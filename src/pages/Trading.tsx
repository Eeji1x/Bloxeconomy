import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  is_banned: boolean | null;
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

const Trading = () => {
  const { user, profile, isLoading, refreshProfile } = useAuth();
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

  useEffect(() => {
    if (user) {
      fetchMyInventory();
      fetchTrades();
      
      // Check if coming from a profile
      const targetUserId = searchParams.get('user');
      if (targetUserId && targetUserId !== user.id) {
        fetchUserById(targetUserId);
        setActiveTab('send');
      }
    }
  }, [user, searchParams]);

  // Realtime subscription for trades
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('trades')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `sender_id=eq.${user.id}`,
        },
        () => fetchTrades()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => fetchTrades()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUserById = async (userId: string) => {
    const { data } = await supabase
      .from('public_profiles')
      .select('user_id, username, numeric_id, emeralds, is_verified')
      .eq('user_id', userId)
      .single();

    if (data) {
      setSelectedUser({ ...data, is_banned: false } as Profile);
      fetchTheirInventory(userId);
    }
  };

  const fetchMyInventory = async () => {
    const { data } = await supabase
      .from('user_inventory')
      .select(`
        id,
        item_id,
        quantity,
        catalog_items (
          id,
          name,
          image_url,
          item_type
        )
      `)
      .eq('user_id', user?.id);

    if (data) {
      // Only show limited items
      const limitedItems = data.filter((item: any) => item.catalog_items?.item_type === 'limited');
      setMyInventory(limitedItems as InventoryItem[]);
    }
  };

  const fetchTheirInventory = async (userId: string) => {
    const { data } = await supabase
      .from('user_inventory')
      .select(`
        id,
        item_id,
        quantity,
        catalog_items (
          id,
          name,
          image_url,
          item_type
        )
      `)
      .eq('user_id', userId);

    if (data) {
      // Only show limited items
      const limitedItems = data.filter((item: any) => item.catalog_items?.item_type === 'limited');
      setTheirInventory(limitedItems as InventoryItem[]);
    }
  };

  const fetchTrades = async () => {
    if (!user) return;

    // Fetch pending trades
    const { data: pending } = await supabase
      .from('trades')
      .select('*')
      .eq('status', 'pending')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    // Fetch trade history
    const { data: history } = await supabase
      .from('trades')
      .select('*')
      .neq('status', 'pending')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(50);

    // Fetch profiles for both
    const allUserIds = new Set<string>();
    [...(pending || []), ...(history || [])].forEach(t => {
      allUserIds.add(t.sender_id);
      allUserIds.add(t.receiver_id);
    });

    const { data: profiles } = await supabase
      .from('public_profiles')
      .select('user_id, username, numeric_id, emeralds, is_verified')
      .in('user_id', Array.from(allUserIds));

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

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
      .from('public_profiles')
      .select('user_id, username, numeric_id, emeralds, is_verified')
      .neq('user_id', user?.id)
      .or(`username.ilike.%${searchQuery}%,numeric_id.eq.${parseInt(searchQuery) || 0}`)
      .limit(10);

    if (data) {
      setSearchResults(data.map(d => ({ ...d, is_banned: false })) as Profile[]);
    }
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
    fetchTheirInventory(targetUser.user_id);
  };

  const toggleMyItem = (itemId: string) => {
    setSelectedMyItems(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleTheirItem = (itemId: string) => {
    setSelectedTheirItems(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const sendTrade = async () => {
    if (!user || !selectedUser || !profile) return;

    // Validation
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
      const { error } = await supabase
        .from('trades')
        .insert({
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

    const trade = pendingTrades.find(t => t.id === tradeId);
    if (!trade) return;

    try {
      if (action === 'accept') {
        // Validate both users still have the items and emeralds
        const isSender = trade.sender_id === user.id;
        const myItems = isSender ? trade.sender_items : trade.receiver_items;
        const myEmeraldOffer = isSender ? trade.sender_emeralds : trade.receiver_emeralds;

        if (myEmeraldOffer > profile.emeralds) {
          toast.error('You no longer have enough emeralds for this trade');
          return;
        }

        // Check if user still owns all items
        const { data: myCurrentInventory } = await supabase
          .from('user_inventory')
          .select('id')
          .eq('user_id', user.id)
          .in('id', myItems);

        if ((myCurrentInventory?.length || 0) !== myItems.length) {
          toast.error('You no longer own all the items in this trade');
          return;
        }

        // Get other user's profile to check their emeralds
        const otherUserId = isSender ? trade.receiver_id : trade.sender_id;
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('emeralds, is_banned')
          .eq('user_id', otherUserId)
          .single();

        if (otherProfile?.is_banned) {
          toast.error('The other user has been banned');
          await supabase.from('trades').update({ status: 'cancelled' }).eq('id', tradeId);
          fetchTrades();
          return;
        }

        const theirEmeraldOffer = isSender ? trade.receiver_emeralds : trade.sender_emeralds;
        if (theirEmeraldOffer > (otherProfile?.emeralds || 0)) {
          toast.error('The other user no longer has enough emeralds');
          return;
        }

        // Check if other user still owns all their items
        const theirItems = isSender ? trade.receiver_items : trade.sender_items;
        const { data: theirCurrentInventory } = await supabase
          .from('user_inventory')
          .select('id')
          .eq('user_id', otherUserId)
          .in('id', theirItems);

        if ((theirCurrentInventory?.length || 0) !== theirItems.length) {
          toast.error('The other user no longer owns all the items in this trade');
          return;
        }

        // Execute the trade atomically
        // 1. Transfer items from sender to receiver (unequip first)
        if (trade.sender_items.length > 0) {
          await supabase
            .from('user_inventory')
            .update({ user_id: trade.receiver_id, is_equipped: false })
            .in('id', trade.sender_items);
        }

        // 2. Transfer items from receiver to sender (unequip first)
        if (trade.receiver_items.length > 0) {
          await supabase
            .from('user_inventory')
            .update({ user_id: trade.sender_id, is_equipped: false })
            .in('id', trade.receiver_items);
        }

        // 3. Update emeralds
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('emeralds')
          .eq('user_id', trade.sender_id)
          .single();

        const { data: receiverProfile } = await supabase
          .from('profiles')
          .select('emeralds')
          .eq('user_id', trade.receiver_id)
          .single();

        const senderNewEmeralds = (senderProfile?.emeralds || 0) - trade.sender_emeralds + trade.receiver_emeralds;
        const receiverNewEmeralds = (receiverProfile?.emeralds || 0) - trade.receiver_emeralds + trade.sender_emeralds;

        await supabase
          .from('profiles')
          .update({ emeralds: senderNewEmeralds })
          .eq('user_id', trade.sender_id);

        await supabase
          .from('profiles')
          .update({ emeralds: receiverNewEmeralds })
          .eq('user_id', trade.receiver_id);

        // 4. Update trade status
        await supabase.from('trades').update({ status: 'accepted' }).eq('id', tradeId);

        toast.success('Trade completed successfully!');
        await refreshProfile();
        fetchMyInventory();
      } else {
        const newStatus = action === 'decline' ? 'declined' : 'cancelled';
        await supabase.from('trades').update({ status: newStatus }).eq('id', tradeId);
        toast.success(action === 'decline' ? 'Trade declined' : 'Trade cancelled');
      }

      fetchTrades();
    } catch (error) {
      console.error('Error handling trade:', error);
      toast.error('Failed to process trade');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.is_banned) {
    return <Navigate to="/banned" replace />;
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
        <Button
          variant={activeTab === 'pending' ? 'default' : 'outline'}
          onClick={() => setActiveTab('pending')}
          className="gap-2"
        >
          <Clock className="w-4 h-4" />
          Pending ({pendingTrades.length})
        </Button>
        <Button
          variant={activeTab === 'send' ? 'neon' : 'outline'}
          onClick={() => setActiveTab('send')}
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          Send Trade
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'outline'}
          onClick={() => setActiveTab('history')}
          className="gap-2"
        >
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
                              <img 
                                src="/images/verified-badge.png"
                                alt="Verified" 
                                className="w-4 h-4"
                              />
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
              {/* Trade Header */}
              <div className="cyber-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">Trading with:</span>
                  <div className="flex items-center gap-2">
                    <UserAvatar userId={selectedUser.user_id} size="sm" />
                    <span className="font-bold">{selectedUser.username}</span>
                    {selectedUser.is_verified && (
                      <img 
                        src="/images/verified-badge.png"
                        alt="Verified" 
                        className="w-4 h-4"
                      />
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>

              {/* Trade Editor */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Your Offer */}
                <div className="cyber-card p-6 space-y-4">
                  <h3 className="font-display font-bold text-lg text-accent">You are offering</h3>
                  
                  {/* Your Emeralds */}
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                    <Gem className="w-5 h-5 text-accent" />
                    <Input
                      type="number"
                      min={0}
                      max={profile?.emeralds || 0}
                      value={myEmeralds}
                      onChange={(e) => setMyEmeralds(Math.min(parseInt(e.target.value) || 0, profile?.emeralds || 0))}
                      className="w-24 h-8"
                    />
                    <span className="text-sm text-muted-foreground">/ {profile?.emeralds.toLocaleString()}</span>
                  </div>

                  {/* Your Items */}
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
                            className={`p-2 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedMyItems.includes(item.id)
                                ? 'border-accent bg-accent/10'
                                : 'border-border hover:border-accent/50'
                            }`}
                          >
                            <img
                              src={item.catalog_items.image_url}
                              alt={item.catalog_items.name}
                              className="w-full aspect-square object-contain rounded"
                            />
                            <p className="text-xs text-center truncate mt-1">{item.catalog_items.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Their Offer (Request) */}
                <div className="cyber-card p-6 space-y-4">
                  <h3 className="font-display font-bold text-lg text-primary">You are requesting</h3>
                  
                  {/* Their Emeralds */}
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                    <Gem className="w-5 h-5 text-accent" />
                    <Input
                      type="number"
                      min={0}
                      max={selectedUser.emeralds}
                      value={theirEmeralds}
                      onChange={(e) => setTheirEmeralds(Math.min(parseInt(e.target.value) || 0, selectedUser.emeralds))}
                      className="w-24 h-8"
                    />
                    <span className="text-sm text-muted-foreground">/ {selectedUser.emeralds.toLocaleString()}</span>
                  </div>

                  {/* Their Items */}
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
                            className={`p-2 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedTheirItems.includes(item.id)
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <img
                              src={item.catalog_items.image_url}
                              alt={item.catalog_items.name}
                              className="w-full aspect-square object-contain rounded"
                            />
                            <p className="text-xs text-center truncate mt-1">{item.catalog_items.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Send Button */}
              <div className="flex justify-center">
                <Button
                  variant="neon"
                  size="lg"
                  onClick={sendTrade}
                  disabled={sendingTrade || (selectedMyItems.length === 0 && selectedTheirItems.length === 0 && myEmeralds === 0 && theirEmeralds === 0)}
                >
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
              <TradeCard 
                key={trade.id} 
                trade={trade} 
                currentUserId={user.id} 
                onAction={handleTrade}
              />
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
              <TradeCard 
                key={trade.id} 
                trade={trade} 
                currentUserId={user.id}
                isHistory
              />
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
      .select(`
        id,
        catalog_items (
          name,
          image_url
        )
      `)
      .in('id', allItemIds);

    if (data) {
      const details: Record<string, any> = {};
      data.forEach((item: any) => {
        details[item.id] = item.catalog_items;
      });
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">{isSender ? 'Trade to:' : 'Trade from:'}</span>
          <Link to={`/profile/${otherUser?.user_id}`} className="flex items-center gap-2 hover:text-primary">
            <span className="font-bold">{otherUser?.username}</span>
            {otherUser?.is_verified && (
              <img 
                src="/images/verified-badge.png" 
                alt="Verified" 
                className="w-4 h-4"
              />
            )}
          </Link>
        </div>
        <span className={`text-sm font-medium uppercase ${getStatusColor()}`}>
          {trade.status}
        </span>
      </div>

      {/* Trade Contents */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Sender Offer */}
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
                  <img 
                    src={itemDetails[itemId].image_url} 
                    alt={itemDetails[itemId].name}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Receiver Offer */}
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
                  <img 
                    src={itemDetails[itemId].image_url} 
                    alt={itemDetails[itemId].name}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
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

export default Trading;
