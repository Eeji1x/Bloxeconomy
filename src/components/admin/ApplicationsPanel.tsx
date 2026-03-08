import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

const ApplicationsPanel = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [filter, setFilter] = useState<'pending' | 'accepted' | 'rejected' | 'all'>('pending');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchApplications(); }, [filter]);

  const fetchApplications = async () => {
    setLoading(true);
    let query = supabase.from('applications').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    setApplications(data || []);
    setLoading(false);
  };

  const handleAccept = async (id: string) => {
    const { error } = await supabase
      .from('applications')
      .update({ status: 'accepted', reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error('Failed to accept'); return; }
    toast.success('Application accepted!');
    fetchApplications();
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) { toast.error('Please provide a rejection reason'); return; }
    const { error } = await supabase
      .from('applications')
      .update({ status: 'rejected', reject_reason: rejectReason.trim(), reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error('Failed to reject'); return; }
    toast.success('Application rejected');
    setRejectingId(null);
    setRejectReason('');
    fetchApplications();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this application?')) return;
    await supabase.from('applications').delete().eq('id', id);
    toast.success('Application deleted');
    fetchApplications();
  };

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold">Applications {filter === 'pending' && pendingCount > 0 && `(${pendingCount})`}</h2>
        <Button variant="ghost" size="sm" onClick={fetchApplications}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      <div className="flex gap-2">
        {(['pending', 'accepted', 'rejected', 'all'] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'ghost'} onClick={() => setFilter(f)} className="capitalize">
            {f}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : applications.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No {filter} applications</div>
      ) : (
        <div className="space-y-3">
          {applications.map(app => (
            <div key={app.id} className="p-4 bg-muted/30 rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{app.username}</span>
                    {app.status === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
                    {app.status === 'accepted' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {app.status === 'rejected' && <XCircle className="w-4 h-4 text-red-500" />}
                    <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 rounded bg-muted">{app.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(app.created_at).toLocaleString()}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground bg-background/50 p-3 rounded">{app.reason}</p>

              {app.reject_reason && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                  <strong>Rejection reason:</strong> {app.reject_reason}
                </p>
              )}

              {app.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAccept(app.id)} className="gap-1">
                    <CheckCircle className="w-4 h-4" /> Accept
                  </Button>
                  {rejectingId === app.id ? (
                    <div className="flex-1 flex gap-2">
                      <Textarea
                        placeholder="Reason for rejection..."
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        className="h-10 min-h-0"
                      />
                      <Button size="sm" variant="destructive" onClick={() => handleReject(app.id)}>Send</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(''); }}>✕</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={() => setRejectingId(app.id)} className="gap-1">
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
                  )}
                </div>
              )}

              {app.status !== 'pending' && (
                <Button size="sm" variant="ghost" onClick={() => handleDelete(app.id)} className="text-xs text-muted-foreground">
                  Delete
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApplicationsPanel;
