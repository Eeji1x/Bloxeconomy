import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BAD_DECISIONS_NUMERIC_ID } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trophy, Gift, Clock, CheckCircle, Check, StopCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Lottery {
  id: string;
  status: string;
  duration_minutes: number;
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
  serial_number?: number;
}

interface BdItem {
  id: string;
  item_id: string;
  item_name: string;
  item_image: string;
  serial_number: number | null;
}

interface ActiveLotteryData {
  lottery: Lottery;
  prizes: Prize[];
  timeRemaining: string;
}

const LotteryPanel = () => {
  const { user } = useAuth();
  const [activeLotteries, setActiveLotteries] = useState<ActiveLotteryData[]>([]);
  const [pastLotteries, setPastLotteries] = useState<Lottery[]>([]);
  const [durationValue, setDurationValue] = useState(24);
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours'>('hours');
  const [creating, setCreating] = useState(false);
  const [drawingId, setDrawingId] = useState<string | null>(null);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [bdItems, setBdItems] = useState<BdItem[]>([]);
  const [selectedPrizeIds, setSelectedPrizeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLotteries();
    fetchBdItems();
  }, []);

  // Countdown timer for all active lotteries
  useEffect(() => {
    if (activeLotteries.length === 0) return;
    const interval = setInterval(() => {
      setActiveLotteries(prev => prev.map(ld => {
        const end = new Date(ld.lottery.ends_at).getTime();
        const now = Date.now();
        const diff = end - now;
        if (diff <= 0) {
          return { ...ld, timeRemaining: 'Ended - Draw Winners' };
        }
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        return { ...ld, timeRemaining: `${h}h ${m}m ${s}s` };
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeLotteries.length]);

  const fetchBdItems = async () => {
    const { data: bdProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('numeric_id', BAD_DECISIONS_NUMERIC_ID)
      .maybeSingle();

    if (!bdProfile) return;

    const { data: items } = await supabase
      .from('user_inventory')
      .select('id, item_id, catalog_items!inner(name, image_url, item_type)')
      .eq('user_id', bdProfile.user_id);

    if (!items) return;

    const limited = items.filter((i: any) => i.catalog_items?.item_type === 'limited');

    const inventoryIds = limited.map((i: any) => i.id);
    const { data: serials } = inventoryIds.length > 0
      ? await supabase.from('item_serials').select('inventory_id, serial_number').in('inventory_id', inventoryIds)
      : { data: [] };

    const serialMap = new Map((serials || []).map(s => [s.inventory_id, s.serial_number]));

    const enriched: BdItem[] = limited.map((i: any) => ({
      id: i.id,
      item_id: i.item_id,
      item_name: i.catalog_items?.name || 'Unknown',
      item_image: i.catalog_items?.image_url || '',
      serial_number: serialMap.get(i.id) ?? null,
    }));

    enriched.sort((a, b) => {
      if (a.item_name !== b.item_name) return a.item_name.localeCompare(b.item_name);
      return (a.serial_number ?? 0) - (b.serial_number ?? 0);
    });

    setBdItems(enriched);
  };

  const fetchLotteries = async () => {
    // Fetch ALL active lotteries
    const { data: activeList } = await supabase
      .from('lotteries')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (activeList && activeList.length > 0) {
      const lotteryDataList: ActiveLotteryData[] = [];

      for (const active of activeList) {
        const { data: prizeData } = await supabase
          .from('lottery_prizes')
          .select('*')
          .eq('lottery_id', active.id);

        let enrichedPrizes: Prize[] = [];

        if (prizeData && prizeData.length > 0) {
          const itemIds = prizeData.map(p => p.item_id);
          const invIds = prizeData.map(p => p.inventory_id);
          const winnerIds = prizeData.filter(p => p.winner_id).map(p => p.winner_id!);

          const [{ data: items }, { data: serials }, { data: winners }] = await Promise.all([
            supabase.from('catalog_items').select('id, name, image_url').in('id', itemIds),
            invIds.length > 0
              ? supabase.from('item_serials').select('inventory_id, serial_number').in('inventory_id', invIds)
              : Promise.resolve({ data: [] }),
            winnerIds.length > 0
              ? supabase.from('profiles').select('user_id, username').in('user_id', winnerIds)
              : Promise.resolve({ data: [] }),
          ]);

          const itemMap = new Map((items || []).map(i => [i.id, i]));
          const serialMap = new Map((serials || []).map(s => [s.inventory_id, s.serial_number]));
          const winnerMap = new Map((winners || []).map(w => [w.user_id, w.username]));

          enrichedPrizes = prizeData.map(p => ({
            ...p,
            item_name: itemMap.get(p.item_id)?.name || 'Unknown',
            item_image: itemMap.get(p.item_id)?.image_url || '',
            serial_number: serialMap.get(p.inventory_id) ?? undefined,
            winner_name: p.winner_id ? (winnerMap.get(p.winner_id) || 'Unknown') : undefined,
          }));
        }

        const end = new Date(active.ends_at).getTime();
        const diff = end - Date.now();
        let timeRemaining: string;
        if (diff <= 0) {
          timeRemaining = 'Ended - Draw Winners';
        } else {
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          timeRemaining = `${h}h ${m}m ${s}s`;
        }

        lotteryDataList.push({ lottery: active, prizes: enrichedPrizes, timeRemaining });
      }

      setActiveLotteries(lotteryDataList);
    } else {
      setActiveLotteries([]);
    }

    const { data: past } = await supabase
      .from('lotteries')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    setPastLotteries(past || []);
  };

  const togglePrize = (inventoryId: string) => {
    setSelectedPrizeIds(prev => {
      const next = new Set(prev);
      if (next.has(inventoryId)) next.delete(inventoryId);
      else next.add(inventoryId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedPrizeIds.size === bdItems.length) {
      setSelectedPrizeIds(new Set());
    } else {
      setSelectedPrizeIds(new Set(bdItems.map(i => i.id)));
    }
  };

  const createLottery = async () => {
    if (!user) return;
    if (selectedPrizeIds.size === 0) {
      toast.error('Select at least one prize');
      return;
    }

    setCreating(true);
    try {
      const startsAt = new Date();
      const totalMinutes = durationUnit === 'hours' ? durationValue * 60 : durationValue;
      const endsAt = new Date(startsAt.getTime() + totalMinutes * 60000);

      const { data: lottery, error } = await supabase
        .from('lotteries')
        .insert({
          duration_minutes: totalMinutes,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          created_by: user.id,
        })
        .select()
        .single();

      if (error || !lottery) throw error || new Error('Failed to create lottery');

      const selected = bdItems.filter(i => selectedPrizeIds.has(i.id));
      const prizeInserts = selected.map(item => ({
        lottery_id: lottery.id,
        item_id: item.item_id,
        inventory_id: item.id,
      }));

      await supabase.from('lottery_prizes').insert(prizeInserts);

      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        action: 'lottery_created',
        details: {
          lottery_id: lottery.id,
          prize_count: selected.length,
          duration: `${durationValue} ${durationUnit}`,
          prizes: selected.map(s => `#${s.serial_number} ${s.item_name}`),
        },
      });

      toast.success(`Lottery created with ${selected.length} prizes!`);
      setSelectedPrizeIds(new Set());
      fetchLotteries();
      fetchBdItems();
    } catch (error) {
      console.error('Error creating lottery:', error);
      toast.error('Failed to create lottery');
    } finally {
      setCreating(false);
    }
  };

  const drawWinnersForLottery = async (lotteryData: ActiveLotteryData) => {
    if (!user) return;
    const { lottery, prizes } = lotteryData;

    setDrawingId(lottery.id);
    try {
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

      const shuffledUsers = [...activeUsers].sort(() => Math.random() - 0.5);
      const winners: { prizeId: string; userId: string; username: string; itemName: string; inventoryId: string; serial?: number }[] = [];
      const usedUserIds = new Set<string>();

      for (let i = 0; i < unclaimedPrizes.length && i < shuffledUsers.length; i++) {
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
          serial: unclaimedPrizes[i].serial_number,
        });
      }

      for (const w of winners) {
        await supabase
          .from('user_inventory')
          .update({ user_id: w.userId, is_equipped: false })
          .eq('id', w.inventoryId);

        await supabase
          .from('item_serials')
          .update({ owner_id: w.userId })
          .eq('inventory_id', w.inventoryId);

        await supabase
          .from('lottery_prizes')
          .update({ winner_id: w.userId })
          .eq('id', w.prizeId);

        const serialText = w.serial ? ` (Serial #${w.serial})` : '';
        await supabase.from('messages').insert({
          sender_id: user.id,
          receiver_id: w.userId,
          message: `🎉 You have won a limited item from the SODABLOX lottery!\n\nItem: ${w.itemName}${serialText}\n\nCongratulations!`,
          is_system: true,
        });
      }

      await supabase
        .from('lotteries')
        .update({ status: 'completed' })
        .eq('id', lottery.id);

      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        action: 'lottery_drawn',
        details: { lottery_id: lottery.id, winners: winners.map(w => ({ user: w.username, item: w.itemName, serial: w.serial })) },
      });

      toast.success(`Drew ${winners.length} winners!`);
      fetchLotteries();
      fetchBdItems();
    } catch (error) {
      console.error('Error drawing winners:', error);
      toast.error('Failed to draw winners');
    } finally {
      setDrawingId(null);
    }
  };

  const stopLottery = async (lotteryData: ActiveLotteryData) => {
    if (!user) return;
    const { lottery } = lotteryData;

    setStoppingId(lottery.id);
    try {
      // End the lottery now by updating ends_at to now
      await supabase
        .from('lotteries')
        .update({ ends_at: new Date().toISOString() })
        .eq('id', lottery.id);

      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        action: 'lottery_stopped_early',
        details: { lottery_id: lottery.id },
      });

      toast.success('Lottery stopped! Drawing winners now...');

      // Refresh to get updated data, then draw
      await fetchLotteries();

      // Draw winners immediately with current data
      await drawWinnersForLottery(lotteryData);
    } catch (error) {
      console.error('Error stopping lottery:', error);
      toast.error('Failed to stop lottery');
    } finally {
      setStoppingId(null);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-xl flex items-center gap-2">
        <Trophy className="w-5 h-5" style={{ color: 'hsl(var(--neon-yellow))' }} />
        Lottery Control
      </h2>

      {/* Active Lotteries */}
      {activeLotteries.map((ld) => {
        const ended = new Date(ld.lottery.ends_at).getTime() <= Date.now();
        const isDrawing = drawingId === ld.lottery.id;
        const isStopping = stoppingId === ld.lottery.id;

        return (
          <div key={ld.lottery.id} className="p-6 bg-muted/30 rounded-lg space-y-4 neon-border">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Active Lottery
              </h3>
              <span className="text-sm font-mono text-primary">{ld.timeRemaining}</span>
            </div>

            <div className="text-sm text-muted-foreground">
              Started: {new Date(ld.lottery.starts_at).toLocaleString()} •
              Ends: {new Date(ld.lottery.ends_at).toLocaleString()} •
              Duration: {formatDuration(ld.lottery.duration_minutes)}
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-sm">Prize Pool ({ld.prizes.length} items)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ld.prizes.map((p) => (
                  <div key={p.id} className="p-2 bg-muted/30 rounded flex items-center gap-2">
                    <img src={p.item_image} alt="" className="w-8 h-8 object-contain" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">
                        {p.serial_number != null && <span className="text-primary">#{p.serial_number}</span>}{' '}
                        {p.item_name}
                      </p>
                      {p.winner_name && (
                        <p className="text-xs text-accent">Won by: {p.winner_name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              {!ended && (
                <Button
                  variant="destructive"
                  onClick={() => stopLottery(ld)}
                  disabled={isStopping || isDrawing}
                  className="gap-2"
                >
                  {isStopping ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <StopCircle className="w-4 h-4" />
                  )}
                  Stop & Draw Winners
                </Button>
              )}
              {ended && (
                <Button
                  onClick={() => drawWinnersForLottery(ld)}
                  disabled={isDrawing}
                  className="gap-2"
                >
                  {isDrawing ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <Gift className="w-4 h-4" />
                  )}
                  Draw Winners
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {/* Create New Lottery - always visible */}
      <div className="p-6 bg-muted/30 rounded-lg space-y-4">
        <h3 className="font-display font-bold">Start New Lottery</h3>

        <p className="text-sm text-muted-foreground">
          Available limited items from BadDecisions: <strong className="text-accent">{bdItems.length}</strong>
        </p>

        {/* Duration */}
        <div className="space-y-2">
          <Label>Duration</Label>
          <div className="flex gap-2 max-w-sm">
            <Input
              type="number"
              min={1}
              max={9999}
              value={durationValue}
              onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1"
              placeholder="e.g. 10"
            />
            <select
              value={durationUnit}
              onChange={(e) => setDurationUnit(e.target.value as 'minutes' | 'hours')}
              className="w-28 h-10 rounded-md border bg-input px-3"
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
            </select>
          </div>
        </div>

        {/* Prize Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Select Prizes ({selectedPrizeIds.size} selected)</Label>
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {selectedPrizeIds.size === bdItems.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          {bdItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No limited items in BadDecisions inventory</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
              {bdItems.map((item) => {
                const selected = selectedPrizeIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => togglePrize(item.id)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border text-left transition-all",
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/20 hover:border-muted-foreground/50"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded border flex items-center justify-center shrink-0",
                      selected ? "bg-primary border-primary" : "border-muted-foreground/30"
                    )}>
                      {selected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <img src={item.item_image} alt="" className="w-8 h-8 object-contain shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">
                        {item.serial_number != null && (
                          <span className="text-primary">#{item.serial_number} </span>
                        )}
                        {item.item_name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Button onClick={createLottery} disabled={creating || selectedPrizeIds.size === 0} className="gap-2">
          {creating ? (
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <Trophy className="w-4 h-4" />
          )}
          Start Lottery ({selectedPrizeIds.size} prizes)
        </Button>
      </div>

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
              <span className="text-xs text-muted-foreground">{formatDuration(l.duration_minutes)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LotteryPanel;
