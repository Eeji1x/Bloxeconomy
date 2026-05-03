import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Trash2, MessageSquare, RefreshCw, AlertOctagon } from 'lucide-react';
import { toast } from 'sonner';

interface ChatRow {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

const ChatModeratorPanel = () => {
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [purging, setPurging] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('game_chat')
      .select('id, user_id, username, message, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) setMessages(data as ChatRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel('chat_mod')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_chat' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('game_chat').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setMessages((m) => m.filter((x) => x.id !== id));
    toast.success('Message deleted');
  };

  const handlePurgeAll = async () => {
    if (!confirm('Clear ALL game chat messages?')) return;
    setPurging(true);
    const { error } = await supabase.rpc('clear_game_chat');
    setPurging(false);
    if (error) { toast.error('Failed to clear chat'); return; }
    toast.success('All chat messages cleared');
    setMessages([]);
  };

  const filtered = filter
    ? messages.filter(
        (m) =>
          m.username.toLowerCase().includes(filter.toLowerCase()) ||
          m.message.toLowerCase().includes(filter.toLowerCase()),
      )
    : messages;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">In-Game Chat Moderator</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={load} variant="outline" size="sm" className="gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
          <Button onClick={handlePurgeAll} variant="destructive" size="sm" disabled={purging} className="gap-1">
            <AlertOctagon className="w-3 h-3" /> Purge All
          </Button>
        </div>
      </div>

      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by username or message text..."
        className="w-full mb-3 px-3 py-2 rounded-md border border-input bg-background text-sm"
      />

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">No chat messages</div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="text-left px-3 py-2">Time</th>
                <th className="text-left px-3 py-2 w-32">User</th>
                <th className="text-left px-3 py-2">Message</th>
                <th className="text-right px-3 py-2 w-12">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-primary/5">
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-bold text-primary truncate max-w-[8rem]">{m.username}</td>
                  <td className="px-3 py-2 break-words">{m.message}</td>
                  <td className="px-3 py-2 text-right">
                    <Button onClick={() => handleDelete(m.id)} variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ChatModeratorPanel;
