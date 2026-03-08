import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Search, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

const DEMANDS = ['Low', 'Normal', 'High', 'Very High'];
const TRENDS = ['Rising', 'Stable', 'Dropping', 'Unstable'];
const TAG_OPTIONS = ['Rare', 'Projected', 'Unstable', 'Hyped', 'Stable', 'Declining'];

const SodamonsValueManager = () => {
  const { user } = useAuth();
  const [itemUrl, setItemUrl] = useState('');
  const [item, setItem] = useState<any>(null);
  const [currentValues, setCurrentValues] = useState<any>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [value, setValue] = useState('');
  const [demand, setDemand] = useState('Normal');
  const [trend, setTrend] = useState('Stable');
  const [loading, setLoading] = useState(false);

  const extractItemId = (url: string): string | null => {
    // Try URL pattern: /catalog/{id} or /catalog/{id}/...
    const match = url.match(/\/catalog\/([a-f0-9-]+)/i);
    if (match) return match[1];
    // Maybe it's just a UUID
    const uuidMatch = url.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (uuidMatch) return uuidMatch[1];
    return null;
  };

  const loadItem = async () => {
    const id = extractItemId(itemUrl);
    if (!id) { toast.error('Could not extract item ID from URL'); return; }

    setLoading(true);
    const [itemRes, valuesRes, tagsRes] = await Promise.all([
      supabase.from('catalog_items').select('*').eq('id', id).maybeSingle(),
      supabase.from('item_values').select('*').eq('item_id', id).maybeSingle(),
      supabase.from('item_tags').select('tag').eq('item_id', id),
    ]);

    if (!itemRes.data) { toast.error('Item not found'); setLoading(false); return; }
    if (itemRes.data.item_type !== 'limited') { toast.error('Only limited items can have values'); setLoading(false); return; }

    setItem(itemRes.data);
    setCurrentValues(valuesRes.data);
    setTags(tagsRes.data?.map(t => t.tag) || []);

    if (valuesRes.data) {
      setValue(valuesRes.data.value.toString());
      setDemand(valuesRes.data.demand);
      setTrend(valuesRes.data.trend);
    } else {
      setValue(itemRes.data.price.toString());
      setDemand('Normal');
      setTrend('Stable');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!item || !user) return;
    const newValue = parseInt(value) || 0;

    // Save value history
    await supabase.from('value_history').insert({
      item_id: item.id,
      old_value: currentValues?.value || null,
      new_value: newValue,
      old_demand: currentValues?.demand || null,
      new_demand: demand,
      old_trend: currentValues?.trend || null,
      new_trend: trend,
      changed_by: user.id,
    });

    // Upsert item values
    if (currentValues) {
      await supabase.from('item_values').update({
        value: newValue,
        demand,
        trend,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }).eq('item_id', item.id);
    } else {
      await supabase.from('item_values').insert({
        item_id: item.id,
        value: newValue,
        demand,
        trend,
        updated_by: user.id,
      });
    }

    setCurrentValues({ value: newValue, demand, trend });
    toast.success('Value updated!');
  };

  const toggleTag = async (tag: string) => {
    if (!item) return;
    if (tags.includes(tag)) {
      await supabase.from('item_tags').delete().eq('item_id', item.id).eq('tag', tag);
      setTags(tags.filter(t => t !== tag));
      toast.success(`Removed tag: ${tag}`);
    } else {
      await supabase.from('item_tags').insert({ item_id: item.id, tag });
      setTags([...tags, tag]);
      toast.success(`Added tag: ${tag}`);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-lg">Sodamons Value Manager</h2>

      {/* Item URL Input */}
      <div className="space-y-2">
        <Label>Item Link or ID</Label>
        <div className="flex gap-2">
          <Input
            value={itemUrl}
            onChange={(e) => setItemUrl(e.target.value)}
            placeholder="https://sodablx.lovable.app/catalog/abc-123 or paste item ID"
            className="flex-1"
          />
          <Button onClick={loadItem} disabled={loading || !itemUrl}>
            <Search className="w-4 h-4 mr-2" /> Load
          </Button>
        </div>
      </div>

      {/* Item Editor */}
      {item && (
        <div className="p-6 bg-muted/30 rounded-lg space-y-6">
          <div className="flex gap-4 items-center">
            <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
            <div>
              <h3 className="font-bold text-lg">{item.name}</h3>
              <p className="text-sm text-muted-foreground">Current RAP: 💎 {item.price.toLocaleString()}</p>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setItem(null); setItemUrl(''); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Value</Label>
              <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Demand</Label>
              <select
                value={demand}
                onChange={(e) => setDemand(e.target.value)}
                className="w-full h-10 rounded-md border bg-input px-3"
              >
                {DEMANDS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Trend</Label>
              <select
                value={trend}
                onChange={(e) => setTrend(e.target.value)}
                className="w-full h-10 rounded-md border bg-input px-3"
              >
                {TRENDS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map(tag => (
                <Badge
                  key={tag}
                  variant={tags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tags.includes(tag) ? '✓ ' : '+ '}{tag}
                </Badge>
              ))}
            </div>
          </div>

          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Save Value
          </Button>
        </div>
      )}
    </div>
  );
};

export default SodamonsValueManager;
