import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { BadgeCheck, RefreshCw, RotateCcw, Save, UsersRound } from 'lucide-react';
import { toast } from 'sonner';

interface ManagedGroup {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  owner_id: string;
  member_count: number;
  is_verified: boolean;
  is_locked: boolean;
  created_at: string;
}

const AdminGroupsPanel = () => {
  const [groups, setGroups] = useState<ManagedGroup[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    icon_url: '',
    is_verified: false,
    is_locked: false,
  });

  const selected = useMemo(() => groups.find((g) => g.id === selectedId) || null, [groups, selectedId]);

  const loadGroups = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('groups')
      .select('id, name, description, icon_url, owner_id, member_count, is_verified, is_locked, created_at')
      .order('member_count', { ascending: false })
      .limit(200);
    setLoading(false);
    if (error) {
      toast.error('Failed to load groups');
      return;
    }
    const rows = (data || []) as ManagedGroup[];
    setGroups(rows);
    if (!selectedId && rows[0]) setSelectedId(rows[0].id);
  };

  useEffect(() => { loadGroups(); }, []);

  useEffect(() => {
    if (!selected) return;
    setForm({
      name: selected.name,
      description: selected.description || '',
      icon_url: selected.icon_url || '',
      is_verified: !!selected.is_verified,
      is_locked: !!selected.is_locked,
    });
  }, [selected]);

  const saveGroup = async () => {
    if (!selected) return;
    setSaving(true);
    const { data, error } = await (supabase as any).rpc('admin_update_group', {
      p_group_id: selected.id,
      p_name: form.name.trim(),
      p_description: form.description.trim(),
      p_icon_url: form.icon_url.trim() || null,
      p_is_verified: form.is_verified,
      p_is_locked: form.is_locked,
    });
    setSaving(false);
    const result = data as { success?: boolean; message?: string } | null;
    if (error || !result?.success) {
      toast.error(result?.message || 'Failed to save group');
      return;
    }
    toast.success('Group updated');
    await loadGroups();
  };

  const resetGroup = async () => {
    if (!selected || !confirm(`Reset and lock "${selected.name}"?`)) return;
    const { data, error } = await (supabase as any).rpc('admin_reset_group', { p_group_id: selected.id });
    const result = data as { success?: boolean; message?: string } | null;
    if (error || !result?.success) {
      toast.error(result?.message || 'Failed to reset group');
      return;
    }
    toast.success('Group reset');
    await loadGroups();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <UsersRound className="w-5 h-5 text-primary" /> Groups Manager
        </h2>
        <Button onClick={loadGroups} variant="outline" size="sm" className="gap-1" disabled={loading}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : groups.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">No groups found</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <div className="rounded-md border border-border overflow-hidden">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full px-3 py-2 border-b border-border bg-background text-sm lg:hidden"
            >
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <div className="hidden lg:block max-h-[520px] overflow-y-auto">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedId(g.id)}
                  className={`w-full text-left px-3 py-2 border-b border-border text-sm hover:bg-primary/5 ${selectedId === g.id ? 'bg-primary/10' : ''}`}
                >
                  <div className="font-bold truncate flex items-center gap-1">
                    {g.name}{g.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{g.member_count} members {g.is_locked ? '· Locked' : ''}</div>
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <div className="rounded-md border border-border p-4 space-y-4">
              <div className="flex gap-3 items-center">
                <div className="w-16 h-16 rounded-md border border-border overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                  {form.icon_url ? <img src={form.icon_url} alt={form.name} className="w-full h-full object-cover" /> : <UsersRound className="w-7 h-7 text-muted-foreground" />}
                </div>
                <div className="min-w-0">
                  <div className="font-bold truncate">{selected.name}</div>
                  <div className="text-xs text-muted-foreground break-all">Owner: {selected.owner_id}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={form.name} maxLength={32} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Icon URL</Label>
                  <Input value={form.icon_url} onChange={(e) => setForm((f) => ({ ...f, icon_url: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={form.description} maxLength={500} rows={4} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Switch checked={form.is_verified} onCheckedChange={(v) => setForm((f) => ({ ...f, is_verified: v }))} /> Verified
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Switch checked={form.is_locked} onCheckedChange={(v) => setForm((f) => ({ ...f, is_locked: v }))} /> Locked
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={saveGroup} disabled={saving || form.name.trim().length < 3} className="gap-1">
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Group'}
                </Button>
                <Button onClick={resetGroup} variant="destructive" className="gap-1">
                  <RotateCcw className="w-4 h-4" /> Reset Group
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminGroupsPanel;