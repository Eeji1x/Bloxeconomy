import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowLeft, Clock } from 'lucide-react';
import { format } from 'date-fns';

const TrendIcon = ({ trend }: { trend: string }) => {
  switch (trend) {
    case 'Rising': return <TrendingUp className="w-5 h-5 text-green-500" />;
    case 'Dropping': return <TrendingDown className="w-5 h-5 text-red-500" />;
    case 'Unstable': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    default: return <Minus className="w-5 h-5 text-muted-foreground" />;
  }
};

const SodamonsItem = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const [item, setItem] = useState<any>(null);
  const [values, setValues] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [ownerCount, setOwnerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (itemId) fetchAll();
  }, [itemId]);

  const fetchAll = async () => {
    const [itemRes, valuesRes, historyRes, tagsRes, ownersRes] = await Promise.all([
      supabase.from('catalog_items').select('*').eq('id', itemId!).maybeSingle(),
      supabase.from('item_values').select('*').eq('item_id', itemId!).maybeSingle(),
      supabase.from('value_history').select('*').eq('item_id', itemId!).order('created_at', { ascending: false }),
      supabase.from('item_tags').select('tag').eq('item_id', itemId!),
      supabase.from('user_inventory').select('id').eq('item_id', itemId!),
    ]);

    setItem(itemRes.data);
    setValues(valuesRes.data);
    setHistory(historyRes.data || []);
    setTags(tagsRes.data?.map(t => t.tag) || []);
    setOwnerCount(ownersRes.data?.length || 0);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Item not found</p>
        <Link to="/sodamons" className="text-primary hover:underline mt-2 inline-block">← Back to Sodamons</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link to="/sodamons" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Sodamons
      </Link>

      {/* Item Header */}
      <div className="rounded-lg border border-border p-6 flex flex-col sm:flex-row gap-6">
        <img src={item.image_url} alt={item.name} className="w-32 h-32 rounded-lg object-cover shrink-0" />
        <div className="flex-1 space-y-3">
          <div>
            <h1 className="text-2xl font-display font-bold">{item.name}</h1>
            {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
            {tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase">RAP</div>
              <div className="font-bold">💎 {(values?.rap || item.price).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase">Value</div>
              <div className="font-bold">{values ? `💎 ${values.value.toLocaleString()}` : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase">Demand</div>
              <div className="font-medium">{values?.demand || 'Normal'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase">Trend</div>
              <div className="flex items-center gap-1">
                <TrendIcon trend={values?.trend || 'Stable'} />
                <span className="font-medium">{values?.trend || 'Stable'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase">Owners</div>
              <div className="font-medium">{ownerCount}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase">Stock</div>
              <div className="font-medium">{item.stock ?? '∞'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Value History */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b border-border">
          <h2 className="font-bold flex items-center gap-2">
            <Clock className="w-4 h-4" /> Value History
          </h2>
        </div>
        <div className="divide-y divide-border">
          {history.length === 0 ? (
            <div className="px-4 py-6 text-center text-muted-foreground text-sm">No value history yet</div>
          ) : (
            history.map((h) => (
              <div key={h.id} className="px-4 py-3 text-sm flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground">{format(new Date(h.created_at), 'MMM d, yyyy')}</span>
                  <span className="mx-2">—</span>
                  {h.old_value !== null && (
                    <span>Value: <span className="text-red-400">💎 {h.old_value.toLocaleString()}</span> → </span>
                  )}
                  <span className="text-green-400 font-medium">💎 {h.new_value.toLocaleString()}</span>
                  {h.old_demand !== h.new_demand && h.new_demand && (
                    <span className="ml-3 text-muted-foreground">Demand: {h.new_demand}</span>
                  )}
                  {h.old_trend !== h.new_trend && h.new_trend && (
                    <span className="ml-3 text-muted-foreground">Trend: {h.new_trend}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SodamonsItem;
