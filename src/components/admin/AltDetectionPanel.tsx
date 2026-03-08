import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, RefreshCw, AlertTriangle, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface AltGroup {
  ip_hash: string;
  users: { user_id: string; username: string; numeric_id: number; is_banned: boolean; last_seen: string }[];
}

const AltDetectionPanel = () => {
  const [altGroups, setAltGroups] = useState<AltGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAlts = async () => {
    setLoading(true);
    try {
      // Get all ip_hashes
      const { data: ipData, error } = await supabase
        .from('ip_hashes')
        .select('ip_hash, user_id, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!ipData || ipData.length === 0) {
        setAltGroups([]);
        setLoading(false);
        return;
      }

      // Group by ip_hash
      const hashMap = new Map<string, Set<string>>();
      for (const row of ipData) {
        if (!hashMap.has(row.ip_hash)) hashMap.set(row.ip_hash, new Set());
        hashMap.get(row.ip_hash)!.add(row.user_id);
      }

      // Filter to only hashes with multiple users (potential alts)
      const multiUserHashes = Array.from(hashMap.entries())
        .filter(([_, users]) => users.size > 1);

      if (multiUserHashes.length === 0) {
        setAltGroups([]);
        setLoading(false);
        return;
      }

      // Get all unique user IDs
      const allUserIds = new Set<string>();
      multiUserHashes.forEach(([_, users]) => users.forEach(u => allUserIds.add(u)));

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, numeric_id, is_banned, last_seen')
        .in('user_id', Array.from(allUserIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const groups: AltGroup[] = multiUserHashes
        .map(([ip_hash, userIds]) => ({
          ip_hash: ip_hash.substring(0, 12) + '...',
          users: Array.from(userIds)
            .map(uid => {
              const p = profileMap.get(uid);
              return p ? {
                user_id: uid,
                username: p.username,
                numeric_id: p.numeric_id,
                is_banned: p.is_banned ?? false,
                last_seen: p.last_seen || '',
              } : null;
            })
            .filter(Boolean) as AltGroup['users'],
        }))
        .filter(g => g.users.length > 1)
        .sort((a, b) => b.users.length - a.users.length);

      setAltGroups(groups);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch alt data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlts(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-destructive" />
            Alt Account Detection
          </h2>
          <p className="text-sm text-muted-foreground">
            Accounts sharing the same hashed IP are grouped below. IPs are hashed for privacy.
          </p>
        </div>
        <Button onClick={fetchAlts} disabled={loading} variant="outline" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {altGroups.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No potential alt accounts detected.</p>
        </div>
      )}

      {altGroups.map((group, idx) => (
        <div key={idx} className="bg-muted/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="font-mono text-sm text-muted-foreground">Hash: {group.ip_hash}</span>
            <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full font-medium">
              {group.users.length} accounts
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.users.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-mono">#{u.numeric_id}</TableCell>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>
                    {u.is_banned ? (
                      <span className="text-destructive text-xs font-medium">Banned</span>
                    ) : (
                      <span className="text-accent text-xs font-medium">Active</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.last_seen ? new Date(u.last_seen).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/profile/${u.user_id}`, '_blank')}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
};

export default AltDetectionPanel;
