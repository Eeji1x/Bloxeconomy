import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowUpDown } from 'lucide-react';

interface LimitedItem {
  id: string;
  name: string;
  image_url: string;
  price: number;
  stock: number | null;
  max_stock: number | null;
  item_values: {
    value: number;
    demand: string;
    trend: string;
  } | null;
  owner_count: number;
  tags: string[];
}

type SortKey = 'value' | 'rap' | 'demand' | 'trend' | 'name';

const demandOrder: Record<string, number> = { 'Very High': 4, 'High': 3, 'Normal': 2, 'Low': 1 };
const trendOrder: Record<string, number> = { 'Rising': 4, 'Stable': 3, 'Dropping': 2, 'Unstable': 1 };

const TrendIcon = ({ trend }: { trend: string }) => {
  switch (trend) {
    case 'Rising': return <TrendingUp className="w-4 h-4 text-green-500" />;
    case 'Dropping': return <TrendingDown className="w-4 h-4 text-red-500" />;
    case 'Unstable': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    default: return <Minus className="w-4 h-4 text-muted-foreground" />;
  }
};

const DemandBadge = ({ demand }: { demand: string }) => {
  const colors: Record<string, string> = {
    'Very High': 'bg-green-500/20 text-green-400 border-green-500/30',
    'High': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Normal': 'bg-muted text-muted-foreground border-border',
    'Low': 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[demand] || colors['Normal']}`}>{demand}</span>;
};

const Sodamons = () => {
  const [items, setItems] = useState<LimitedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    // Get limited items with their values
    const { data: catalogData } = await supabase
      .from('catalog_items')
      .select('id, name, image_url, price, stock, max_stock')
      .eq('item_type', 'limited');

    if (!catalogData) { setLoading(false); return; }

    const itemIds = catalogData.map(i => i.id);

    // Fetch values, tags, and owner counts in parallel
    const [valuesRes, tagsRes, ownersRes] = await Promise.all([
      supabase.from('item_values').select('item_id, value, demand, trend, rap').in('item_id', itemIds),
      supabase.from('item_tags').select('item_id, tag').in('item_id', itemIds),
      supabase.from('user_inventory').select('item_id').in('item_id', itemIds),
    ]);

    const valuesMap = new Map<string, { value: number; demand: string; trend: string }>();
    valuesRes.data?.forEach(v => valuesMap.set(v.item_id, { value: v.value, demand: v.demand, trend: v.trend }));

    const tagsMap = new Map<string, string[]>();
    tagsRes.data?.forEach(t => {
      const existing = tagsMap.get(t.item_id) || [];
      existing.push(t.tag);
      tagsMap.set(t.item_id, existing);
    });

    // Count unique owners per item
    const ownerCountMap = new Map<string, Set<string>>();
    ownersRes.data?.forEach((inv: any) => {
      if (!ownerCountMap.has(inv.item_id)) ownerCountMap.set(inv.item_id, new Set());
      // We count inventory rows as owner count approximation
    });
    const ownerCounts = new Map<string, number>();
    ownersRes.data?.forEach((inv: any) => {
      ownerCounts.set(inv.item_id, (ownerCounts.get(inv.item_id) || 0) + 1);
    });

    const result: LimitedItem[] = catalogData.map(item => ({
      ...item,
      item_values: valuesMap.get(item.id) || null,
      owner_count: ownerCounts.get(item.id) || 0,
      tags: tagsMap.get(item.id) || [],
    }));

    setItems(result);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let list = items.filter(i =>
      i.name.toLowerCase().includes(search.toLowerCase())
    );

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'value':
          cmp = (a.item_values?.value || 0) - (b.item_values?.value || 0);
          break;
        case 'rap':
          cmp = a.price - b.price;
          break;
        case 'demand':
          cmp = (demandOrder[a.item_values?.demand || 'Normal'] || 0) - (demandOrder[b.item_values?.demand || 'Normal'] || 0);
          break;
        case 'trend':
          cmp = (trendOrder[a.item_values?.trend || 'Stable'] || 0) - (trendOrder[b.item_values?.trend || 'Stable'] || 0);
          break;
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [items, search, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortHeader = ({ label, sortKeyVal }: { label: string; sortKeyVal: SortKey }) => (
    <th
      className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
      onClick={() => handleSort(sortKeyVal)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="w-3 h-3" />
      </span>
    </th>
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">SODAMONS</h1>
          <p className="text-muted-foreground text-sm">Limited item value tracker</p>
        </div>
        <Link
          to="/sodamons/top"
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-block text-center"
        >
          🏆 Top Items
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Items Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase w-12">Img</th>
                <SortHeader label="Item Name" sortKeyVal="name" />
                <SortHeader label="RAP" sortKeyVal="rap" />
                <SortHeader label="Value" sortKeyVal="value" />
                <SortHeader label="Demand" sortKeyVal="demand" />
                <SortHeader label="Trend" sortKeyVal="trend" />
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Owners</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    {search ? 'No items match your search' : 'No limited items found'}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2">
                      <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded object-cover" />
                    </td>
                    <td className="px-3 py-2">
                      <Link to={`/sodamons/item/${item.id}`} className="font-medium text-primary hover:underline">
                        {item.name}
                      </Link>
                      {item.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {item.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">💎 {item.price.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-xs font-bold">
                      {item.item_values ? `💎 ${item.item_values.value.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <DemandBadge demand={item.item_values?.demand || 'Normal'} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <TrendIcon trend={item.item_values?.trend || 'Stable'} />
                        <span className="text-xs">{item.item_values?.trend || 'Stable'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">{item.owner_count}</td>
                    <td className="px-3 py-2 text-xs">{item.stock ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Sodamons;
