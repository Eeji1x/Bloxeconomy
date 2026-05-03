import { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Crown, Users, ArrowLeft, UserPlus, UserMinus } from 'lucide-react';
import { toast } from 'sonner';

interface Group {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  owner_id: string;
  member_count: number;
  created_at: string;
}

interface Member {
  user_id: string;
  role: string;
  joined_at: string;
  username?: string;
  numeric_id?: number;
}

const GroupDetail = () => {
  const { user } = useAuth();
  const { groupId } = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => { if (groupId) fetchAll(); }, [groupId]);

  const fetchAll = async () => {
    if (!groupId) return;
    setLoading(true);
    const { data: g } = await (supabase as any)
      .from('groups')
      .select('id, name, description, icon_url, owner_id, member_count, created_at')
      .eq('id', groupId)
      .maybeSingle();
    setGroup(g);
    if (g) {
      const { data: mems } = await (supabase as any)
        .from('group_members')
        .select('user_id, role, joined_at')
        .eq('group_id', groupId);
      if (mems) {
        const userIds = mems.map((m: any) => m.user_id);
        const { data: profs } = await (supabase as any)
          .from('public_profiles')
          .select('user_id, username, numeric_id')
          .in('user_id', userIds);
        const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
        setMembers(mems.map((m: any) => ({ ...m, ...profMap.get(m.user_id) })));
      }
    }
    setLoading(false);
  };

  const isMember = members.some(m => m.user_id === user?.id);
  const isOwner = user?.id === group?.owner_id;

  const handleJoin = async () => {
    if (!groupId) return;
    setJoining(true);
    const { data, error } = await supabase.rpc('join_group', { p_group_id: groupId });
    setJoining(false);
    if (error) { toast.error('Failed to join'); return; }
    const result = data as { success: boolean; message?: string };
    if (!result.success) { toast.error(result.message || 'Failed to join'); return; }
    toast.success('Joined group');
    await fetchAll();
  };

  const handleLeave = async () => {
    if (!groupId) return;
    setJoining(true);
    const { error } = await supabase.rpc('leave_group', { p_group_id: groupId });
    setJoining(false);
    if (error) { toast.error('Failed to leave'); return; }
    toast.success('Left group');
    await fetchAll();
  };

  if (!user) return <Navigate to="/login" replace />;

  if (loading) return (
    <div className="flex justify-center py-10">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
  if (!group) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Group not found.</p>
      <Link to="/groups" className="text-primary hover:underline">← Back to Groups</Link>
    </div>
  );

  return (
    <div className="max-w-[940px] mx-auto">
      <Link to="/groups" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-3">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div
        className="rounded-xl border border-primary/30 p-5 mb-5"
        style={{ background: 'linear-gradient(135deg, hsl(260 40% 10%) 0%, hsl(260 35% 6%) 100%)' }}
      >
        <div className="flex gap-5 flex-wrap">
          <div
            className="rounded-md overflow-hidden flex-shrink-0"
            style={{ width: 140, height: 140, background: 'hsl(260 40% 14%)', border: '2px solid hsl(180 100% 50% / 0.4)' }}
          >
            {group.icon_url ? (
              <img src={group.icon_url} alt={group.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Crown className="w-10 h-10 text-primary/40" /></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="text-3xl font-bold mb-1"
              style={{ fontFamily: 'Orbitron, sans-serif', color: 'hsl(180 100% 95%)', textShadow: '0 0 12px hsl(180 100% 50% / 0.5)' }}
            >
              {group.name}
            </h1>
            <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{group.description || 'No description'}</p>
            <div className="text-xs text-muted-foreground flex items-center gap-3">
              <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {group.member_count} members</span>
              <span>Created {new Date(group.created_at).toLocaleDateString()}</span>
            </div>
            <div className="mt-3">
              {isOwner ? (
                <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300 inline-flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Owner
                </span>
              ) : isMember ? (
                <Button onClick={handleLeave} disabled={joining} variant="outline" className="gap-2">
                  <UserMinus className="w-4 h-4" /> Leave Group
                </Button>
              ) : (
                <Button onClick={handleJoin} disabled={joining} className="gap-2">
                  <UserPlus className="w-4 h-4" /> Join Group
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
        <Users className="w-5 h-5" /> Members ({members.length})
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {members.map(m => (
          <Link
            key={m.user_id}
            to={`/profile/${m.user_id}`}
            className="rounded-md border border-primary/20 p-2 hover:border-primary/50 transition-colors text-sm"
            style={{ background: 'hsl(260 40% 12%)' }}
          >
            <div className="font-bold text-primary truncate">{m.username || 'Unknown'}</div>
            <div className="text-[11px] text-muted-foreground capitalize">{m.role}</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default GroupDetail;
