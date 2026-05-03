import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Check, X, RefreshCw, Image as ImageIcon, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface Submission {
  id: string;
  submitted_by: string;
  name: string;
  description: string;
  image_url: string;
  item_type: string;
  suggested_price: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reject_reason?: string | null;
  username?: string;
}

const AssetModeratorPanel = () => {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    let q = (supabase as any)
      .from('asset_moderation_queue')
      .select('id, submitted_by, name, description, image_url, item_type, suggested_price, status, created_at, reject_reason')
      .order('created_at', { ascending: false })
      .limit(100);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    if (data) {
      const userIds = Array.from(new Set((data as Submission[]).map((d) => d.submitted_by)));
      const { data: profiles } = await (supabase as any)
        .from('public_profiles')
        .select('user_id, username')
        .in('user_id', userIds);
      const profMap = new Map((profiles || []).map((p: any) => [p.user_id, p.username]));
      setItems((data as Submission[]).map((d) => ({ ...d, username: profMap.get(d.submitted_by) as string | undefined })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter]);

  const handleApprove = async (id: string) => {
    setActingId(id);
    const { data, error } = await supabase.rpc('approve_asset', { p_id: id });
    setActingId(null);
    if (error) { toast.error('Approve failed'); return; }
    const r = data as { success: boolean; message?: string };
    if (!r.success) { toast.error(r.message || 'Approve failed'); return; }
    toast.success('Approved & added to catalog');
    await load();
  };

  const handleReject = async (id: string) => {
    setActingId(id);
    const { error } = await supabase.rpc('reject_asset', {
      p_id: id,
      p_reason: rejectReason[id]?.trim() || null,
    });
    setActingId(null);
    if (error) { toast.error('Reject failed'); return; }
    toast.success('Rejected');
    await load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Asset Moderator</h2>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="text-sm border border-input rounded-md bg-background px-2 py-1"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
          <Button onClick={load} variant="outline" size="sm" className="gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          No {statusFilter === 'all' ? '' : statusFilter} submissions.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-border p-4"
              style={{ background: 'hsl(260 40% 12%)' }}
            >
              <div className="flex gap-3">
                <div
                  className="w-24 h-24 rounded-md overflow-hidden flex-shrink-0"
                  style={{ background: 'hsl(260 40% 16%)' }}
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-6 h-6 text-primary/40" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{item.name}</h3>
                  <div className="text-xs text-muted-foreground mb-1">
                    by {item.username || item.submitted_by.slice(0, 8)}
                    <span className="ml-2 capitalize">[{item.item_type}]</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{item.description || '—'}</p>
                  <div className="text-xs">Suggested price: <span className="text-primary font-bold">{item.suggested_price}</span></div>
                  <div className="text-[10px] text-muted-foreground">
                    Submitted {new Date(item.created_at).toLocaleString()}
                  </div>
                  <div className="text-[11px] mt-1">
                    Status:{' '}
                    <span
                      className="font-bold"
                      style={{
                        color:
                          item.status === 'approved'
                            ? 'hsl(150 100% 60%)'
                            : item.status === 'rejected'
                            ? 'hsl(0 100% 70%)'
                            : 'hsl(50 100% 60%)',
                      }}
                    >
                      {item.status}
                    </span>
                    {item.status === 'rejected' && item.reject_reason && (
                      <div className="text-[10px] text-muted-foreground italic">{item.reject_reason}</div>
                    )}
                  </div>
                </div>
              </div>
              {item.status === 'pending' && (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Rejection reason (optional)"
                    value={rejectReason[item.id] || ''}
                    onChange={(e) => setRejectReason({ ...rejectReason, [item.id]: e.target.value })}
                    className="w-full text-xs px-2 py-1 rounded border border-input bg-background"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(item.id)}
                      disabled={actingId === item.id}
                      size="sm"
                      className="flex-1 gap-1 bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(item.id)}
                      disabled={actingId === item.id}
                      size="sm"
                      variant="destructive"
                      className="flex-1 gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssetModeratorPanel;
