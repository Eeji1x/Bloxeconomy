import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Key, Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { hashKey, betaKeyPrefix } from '@/lib/hashKey';

const BetaKeysPanel = () => {
  const [keys, setKeys] = useState<any[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [feature, setFeature] = useState('games');
  const [loading, setLoading] = useState(false);
  const [revealKeys, setRevealKeys] = useState<string[] | null>(null);

  useEffect(() => { fetchKeys(); }, []);

  const fetchKeys = async () => {
    const { data } = await supabase
      .from('beta_keys')
      .select('id, key_prefix, feature, is_used, used_by, used_at, created_at')
      .order('created_at', { ascending: false });
    if (data) setKeys(data);
  };

  const generateKey = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `BETA-${seg()}-${seg()}`;
  };

  const handleGenerate = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Not authenticated'); setLoading(false); return; }

    const raw: string[] = Array.from({ length: quantity }, () => generateKey());
    const rows = await Promise.all(raw.map(async (k) => ({
      key_hash: await hashKey(k),
      key_prefix: betaKeyPrefix(k),
      feature,
      created_by: user.id,
    })));

    const { error } = await supabase.from('beta_keys').insert(rows);
    if (error) { toast.error('Failed to generate keys'); }
    else {
      setRevealKeys(raw);
      toast.success(`Generated ${quantity} beta key(s) — copy them now`);
      fetchKeys();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('beta_keys').delete().eq('id', id);
    toast.success('Key deleted');
    fetchKeys();
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-lg">Beta Keys</h2>
      <p className="text-sm text-muted-foreground">Generate beta keys to grant early access to features like Games. Keys are hashed at rest and shown only once.</p>

      <div className="p-4 bg-muted/30 rounded-lg space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Feature</Label>
            <select value={feature} onChange={(e) => setFeature(e.target.value)} className="w-full h-10 rounded-md border bg-input px-3">
              <option value="games">Games</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input type="number" min={1} max={50} value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} />
          </div>
          <div className="flex items-end">
            <Button onClick={handleGenerate} disabled={loading} className="w-full">
              <Plus className="w-4 h-4 mr-2" />Generate
            </Button>
          </div>
        </div>
      </div>

      {revealKeys && (
        <div className="p-4 border-2 border-accent rounded-lg bg-accent/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-accent">
              <Eye className="w-4 h-4" />
              <span className="font-bold text-sm">One-time reveal — save these keys now</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => copyText(revealKeys.join('\n'))}>
                <Copy className="w-4 h-4 mr-1" /> Copy all
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRevealKeys(null)}>
                <EyeOff className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1 max-h-60 overflow-auto">
            {revealKeys.map((k) => (
              <div key={k} className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm bg-background px-3 py-1.5 rounded border">{k}</code>
                <Button size="sm" variant="ghost" onClick={() => copyText(k)}><Copy className="w-3 h-3" /></Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">{keys.length} key(s) total • {keys.filter(k => k.is_used).length} used</div>
        {keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-3">
              <Key className="w-4 h-4 text-primary" />
              <code className="font-mono text-sm">{k.key_prefix}</code>
              <span className={`text-xs px-2 py-0.5 rounded ${k.is_used ? 'bg-destructive/20 text-destructive' : 'bg-accent/20 text-accent'}`}>
                {k.is_used ? 'Used' : 'Available'}
              </span>
              <span className="text-xs text-muted-foreground">{k.feature}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => handleDelete(k.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BetaKeysPanel;
