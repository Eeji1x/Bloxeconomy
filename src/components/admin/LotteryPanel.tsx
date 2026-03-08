import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BAD_DECISIONS_NUMERIC_ID } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trophy, Gift, Clock, CheckCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Lottery {
  id: string;
  status: string;
  duration_hours: number;
  starts_at: string;
  ends_at: string;
  created_at: string;
}

interface Prize {
  id: string;
  item_id: string;
  inventory_id: string;
  winner_id: string | null;
  item_name?: string;
  item_image?: string;
  winner_name?: string;
}

const LotteryPanel = () => {
  const { user } = useAuth();
  const [activeLottery, setActiveLottery] = useState<Lottery | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [pastLotteries, setPastLotteries] = useState<Lottery[]>([]);
  const [durationValue, setDurationValue] = useState(24);
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours'>('hours');
  const [prizeCount, setPrizeCount] = useState(3);
  const [creating, setCreating] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [bdItems, setBdItems] = useState<any[]>([]);

  useEffect(() => {
    fetchLotteries();
    fetchBdItems();
  }, []);

  useEffect(() => {
    if (!activeLottery) return;
    const interval = setInterval(() => {
      const end = new Date(activeLottery.ends_at).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        setTimeRemaining('Ended - Draw Winners');
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeLottery]);

  const fetchBdItems = async () => {
    // Get BadDecisions user_id
    const { data: bdProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('numeric_id', BAD_DECISIONS_NUMERIC_ID)
      .maybeSingle();

    if (!bdProfile) return;

    // Get limited items from BD inventory
    const { data: items } = await supabase
      .from('user_inventory')
      .select('id, item_id, catalog_items!inner(name, image_url, item_type)')
      .eq('user_id', bdProfile.user_id);

    if (items) {
      const limited = items.filter((i: any) => i.catalog_items?.item_type === 'limited');
      setBdItems(limited);
    }
  };

  const fetchLotteries = async () => {
    const { data: active } = await supabase
      .from('lotteries')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (active) {
      setActiveLottery(active);
      // Fetch prizes
      const { data: prizeData } = await supabase
        .from('lottery_prizes')
        .select('*')
        .eq('lottery_id', active.id);

      if (prizeData) {
        // Enrich with item names
        const itemIds = prizeData.map(p => p.item_id);
        const { data: items } = await supabase
          .from('catalog_items')
          .select('id, name, image_url')
          .in('id', itemIds);

        const winnerIds = prizeData.filter(p => p.winner_id).map(p => p.winner_id!);
        const { data: winners } = winnerIds.length > 0
          ? await supabase.from('profiles').select('user_id, username').in('user_id', winnerIds)
          : { data: [] };

        const itemMap = new Map((items || []).map(i => [i.id, i]));
        const winnerMap = new Map((winners || []).map(w => [w.user_id, w.username]));

        setPrizes(prizeData.map(p => ({
          ...p,
          item_name: itemMap.get(p.item_id)?.name || 'Unknown',
          item_image: itemMap.get(p.item_id)?.image_url || '',
          winner_name: p.winner_id ? (winnerMap.get(p.winner_id) || 'Unknown') : undefined,
        })));
      }
    } else {
      setActiveLottery(null);
      setPrizes([]);
    }

    const { data: past } = await supabase
      .from('lotteries')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    setPastLotteries(past || []);
  };

  const createLottery = async () => {
    if (!user) return;
    if (bdItems.length === 0) {
      toast.error('No limited items in BadDecisions inventory');
      return;
    }

    const actualCount = Math.min(prizeCount, bdItems.length);
    if (actualCount <= 0) {
      toast.error('No items available for prizes');
      return;
    }

    setCreating(true);
    try {
      const startsAt = new Date();
      const durationMs = durationUnit === 'hours' ? durationValue * 3600000 : durationValue * 60000;
      const durationHours = durationUnit === 'hours' ? durationValue : durationValue / 60;
      const endsAt = new Date(startsAt.getTime() + durationMs);

      const { data: lottery, error } = await supabase
        .from('lotteries')
        .insert({
          duration_hours: durationHours,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          created_by: user.id,
        })
        .select()
        .single();

      if (error || !lottery) throw error || new Error('Failed to create lottery');

      // Randomly select prizes from BD items
      const shuffled = [...bdItems].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, actualCount);

      const prizeInserts = selected.map((item: any) => ({
        lottery_id: lottery.id,
        item_id: item.item_id,
        inventory_id: item.id,
      }));

      await supabase.from('lottery_prizes').insert(prizeInserts);

      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        action: 'lottery_created',
        details: { lottery_id: lottery.id, prize_count: actualCount, duration: `${durationValue} ${durationUnit}` },
      });

      toast.success(`Lottery created with ${actualCount} prizes!`);
      fetchLotteries();
      fetchBdItems();
    } catch (error) {
      console.error('Error creating lottery:', error);
      toast.error('Failed to create lottery');
    } finally {
      setCreating(false);
    }
  };

  const drawWinners = async () => {
    if (!activeLottery || !user) return;

    setDrawing(true);
    try {
      // Get active users (not banned, not system accounts)
      const { data: activeUsers } = await supabase
        .from('profiles')
        .select('user_id, username')
        .eq('is_banned', false)
        .not('numeric_id', 'in', `(1,${BAD_DECISIONS_NUMERIC_ID})`);

      if (!activeUsers || activeUsers.length === 0) {
        toast.error('No eligible users');
        return;
      }

      const unclaimedPrizes = prizes.filter(p => !p.winner_id);
      if (unclaimedPrizes.length === 0) {
        toast.error('All prizes already claimed');
        return;
      }

      // Shuffle users and assign
      const shuffledUsers = [...activeUsers].sort(() => Math.random() - 0.5);
      const winners: { prizeId: string; userId: string; username: string; itemName: string; inventoryId: string; itemId: string }[] = [];
      const usedUserIds = new Set<string>();

      for (let i = 0; i < unclaimedPrizes.length && i < shuffledUsers.length; i++) {
        // Avoid duplicate winners
        let winnerIdx = i;
        while (usedUserIds.has(shuffledUsers[winnerIdx]?.user_id) && winnerIdx < shuffledUsers.length) {
          winnerIdx++;
        }
        if (winnerIdx >= shuffledUsers.length) break;

        const winner = shuffledUsers[winnerIdx];
        usedUserIds.add(winner.user_id);

        winners.push({
          prizeId: unclaimedPrizes[i].id,
          userId: winner.user_id,
          username: winner.username,
          itemName: unclaimedPrizes[i].item_name || 'Unknown',
          inventoryId: unclaimedPrizes[i].inventory_id,
          itemId: unclaimedPrizes[i].item_id,
        });
      }

      // Transfer items and update prizes
      for (const w of winners) {
        // Transfer inventory item
        await supabase
          .from('user_inventory')
          .update({ user_id: w.userId, is_equipped: false })
          .eq('id', w.inventoryId);

        // Update serial ownership
        await supabase
          .from('item_serials')
          .update({ owner_id: w.userId })
          .eq('inventory_id', w.inventoryId);

        // Set winner on prize
        await supabase
          .from('lottery_prizes')
          .update({ winner_id: w.userId })
          .eq('id', w.prizeId);

        // Send inbox message to winner
        await supabase.from('messages').insert({
          sender_id: user.id,
          receiver_id: w.userId,
          message: `🎉 You have won a limited item from the SODABLOX lottery!\n\nItem: ${w.itemName}\n\nCongratulations!`,
          is_system: true,
        });
      }

      // Mark lottery as completed
      await supabase
        .from('lotteries')
        .update({ status: 'completed' })
        .eq('id', activeLottery.id);

      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        action: 'lottery_drawn',
        details: { lottery_id: activeLottery.id, winners: winners.map(w => ({ user: w.username, item: w.itemName })) },
      });

      toast.success(`Drew ${winners.length} winners!`);
      fetchLotteries();
      fetchBdItems();
    } catch (error) {
      console.error('Error drawing winners:', error);
      toast.error('Failed to draw winners');
    } finally {
      setDrawing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-xl flex items-center gap-2">
        <Trophy className="w-5 h-5 text-neon-yellow" />
        Lottery Control
      </h2>

      {/* Active Lottery */}
      {activeLottery ? (
        <div className="p-6 bg-muted/30 rounded-lg space-y-4 neon-border">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Active Lottery
            </h3>
            <span className="text-sm font-mono text-primary">{timeRemaining}</span>
          </div>

          <div className="text-sm text-muted-foreground">
            Started: {new Date(activeLottery.starts_at).toLocaleString()} •
            Ends: {new Date(activeLottery.ends_at).toLocaleString()}
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-sm">Prize Pool ({prizes.length} items)</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {prizes.map((p) => (
                <div key={p.id} className="p-2 bg-muted/30 rounded flex items-center gap-2">
                  <img src={p.item_image} alt="" className="w-8 h-8 object-contain" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{p.item_name}</p>
                    {p.winner_name && (
                      <p className="text-xs text-accent">Won by: {p.winner_name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {new Date(activeLottery.ends_at).getTime() <= Date.now() && (
            <Button onClick={drawWinners} disabled={drawing} className="gap-2">
              {drawing ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Gift className="w-4 h-4" />
              )}
              Draw Winners
            </Button>
          )}
        </div>
      ) : (
        <div className="p-6 bg-muted/30 rounded-lg space-y-4">
          <h3 className="font-display font-bold">Start New Lottery</h3>

          <p className="text-sm text-muted-foreground">
            Available limited items from BadDecisions: <strong className="text-accent">{bdItems.length}</strong>
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration</Label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-10 rounded-md border bg-input px-3"
              >
                <option value={1}>1 hour</option>
                <option value={6}>6 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Number of Prizes</Label>
              <select
                value={prizeCount}
                onChange={(e) => setPrizeCount(Number(e.target.value))}
                className="w-full h-10 rounded-md border bg-input px-3"
              >
                {[1, 2, 3, 5, 10].filter(n => n <= bdItems.length).map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <Button onClick={createLottery} disabled={creating || bdItems.length === 0} className="gap-2">
            {creating ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Trophy className="w-4 h-4" />
            )}
            Start Lottery
          </Button>
        </div>
      )}

      {/* Past Lotteries */}
      {pastLotteries.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-bold">Past Lotteries</h3>
          {pastLotteries.map(l => (
            <div key={l.id} className="p-3 bg-muted/20 rounded-lg flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</span>
                <span className="ml-2 text-xs text-accent"><CheckCircle className="w-3 h-3 inline" /> Completed</span>
              </div>
              <span className="text-xs text-muted-foreground">{l.duration_hours}h duration</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LotteryPanel;
