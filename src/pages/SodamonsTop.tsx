import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Trophy, TrendingUp, Gem } from 'lucide-react';

const SodamonsTop = () => {
  const [highestValue, setHighestValue] = useState<any[]>([]);
  const [highestRAP, setHighestRAP] = useState<any[]>([]);
  const [mostDemanded, setMostDemanded] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTop();
  }, []);

  const fetchTop = async () => {
    // Get all limited items
    const { data: items } = await supabase
      .from('catalog_items')
      .select('id, name, image_url, price')
      .eq('item_type', 'limited');

    if (!items) { setLoading(false); return; }

    const ids = items.map(i => i.id);
    const { data: values } = await supabase.from('item_values').select('*').in('item_id', ids);

    const valMap = new Map(values?.map(v => [v.item_id, v]) || []);
    const merged = items.map(i => ({ ...i, values: valMap.get(i.id) }));

    // Highest value
    setHighestValue(
      [...merged].filter(i => i.values).sort((a, b) => (b.values?.value || 0) - (a.values?.value || 0)).slice(0, 10)
    );

    // Highest RAP
    setHighestRAP(
      [...merged].sort((a, b) => b.price - a.price).slice(0, 10)
    );

    // Most demanded
    const demandOrder: Record<string, number> = { 'Very High': 4, 'High': 3, 'Normal': 2, 'Low': 1 };
    setMostDemanded(
      [...merged].filter(i => i.values).sort((a, b) => (demandOrder[b.values?.demand || 'Normal'] || 0) - (demandOrder[a.values?.demand || 'Normal'] || 0)).slice(0, 10)
    );

    setLoading(false);
  };

  const ItemRow = ({ item, rank, metric }: { item: any; rank: number; metric: string }) => (
    <Link to={`/sodamons/item/${item.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      <span className="text-lg font-bold text-muted-foreground w-8 text-center">#{rank}</span>
      <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded object-cover" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{item.name}</div>
        <div className="text-xs text-muted-foreground">{metric}</div>
      </div>
    </Link>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/sodamons" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Sodamons
      </Link>

      <h1 className="text-3xl font-display font-bold flex items-center gap-3">
        <Trophy className="w-8 h-8 text-yellow-500" /> Top Items
      </h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Highest Value */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b border-border font-bold flex items-center gap-2">
            <Gem className="w-4 h-4 text-primary" /> Highest Value
          </div>
          <div className="divide-y divide-border">
            {highestValue.map((item, i) => (
              <ItemRow key={item.id} item={item} rank={i + 1} metric={`💎 ${item.values?.value?.toLocaleString() || '0'}`} />
            ))}
            {highestValue.length === 0 && <div className="px-4 py-6 text-center text-muted-foreground text-sm">No data yet</div>}
          </div>
        </div>

        {/* Highest RAP */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b border-border font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" /> Highest RAP
          </div>
          <div className="divide-y divide-border">
            {highestRAP.map((item, i) => (
              <ItemRow key={item.id} item={item} rank={i + 1} metric={`💎 ${item.price.toLocaleString()}`} />
            ))}
            {highestRAP.length === 0 && <div className="px-4 py-6 text-center text-muted-foreground text-sm">No data yet</div>}
          </div>
        </div>

        {/* Most Demanded */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b border-border font-bold flex items-center gap-2">
            🔥 Most Demanded
          </div>
          <div className="divide-y divide-border">
            {mostDemanded.map((item, i) => (
              <ItemRow key={item.id} item={item} rank={i + 1} metric={item.values?.demand || 'Normal'} />
            ))}
            {mostDemanded.length === 0 && <div className="px-4 py-6 text-center text-muted-foreground text-sm">No data yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SodamonsTop;
