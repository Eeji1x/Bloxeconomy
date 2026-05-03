import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Send } from 'lucide-react';

type ChatRow = { id: string; user_id: string; username: string; message: string; created_at: string; game_id?: string };

interface GameChatProps {
  userId: string;
  username: string;
  /** Display name of the current game (e.g. "Classic Baseplate", "Sword Fight"). */
  gameName?: string;
  /**
   * Channel suffix used to group chat per-game. Different games get isolated chat
   * histories. Defaults to "lobby" so existing call sites continue to work.
   */
  gameId?: string;
}

export const GameChat = ({ userId, username, gameName, gameId = 'lobby' }: GameChatProps) => {
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(true);
  const [sending, setSending] = useState(false);
  const [presenceCount, setPresenceCount] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const presenceChannelKey = `game_presence_${gameId}`;

  // ─── Fetch initial chat + subscribe to inserts/deletes ────────────────────
  useEffect(() => {
    let mounted = true;
    supabase
      .from('game_chat')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(40)
      .then(({ data }) => {
        if (mounted && data) setMessages((data as ChatRow[]).reverse());
      });

    const channel = supabase
      .channel(`game_chat_room_${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_chat', filter: `game_id=eq.${gameId}` },
        (payload) => {
          setMessages((prev) => [...prev.slice(-99), payload.new as ChatRow]);
        },
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'game_chat' }, (payload) => {
        // DELETE payloads from REPLICA IDENTITY FULL include the old row. Only
        // act on rows from this game so other rooms aren't filtered out locally.
        const removed = payload.old as { id?: string; game_id?: string };
        if (removed?.id && (!removed.game_id || removed.game_id === gameId)) {
          setMessages((prev) => prev.filter((m) => m.id !== removed.id));
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // ─── Presence tracking ────────────────────────────────────────────────────
  // When the last player leaves the game, wipe the chat history so the next
  // session starts fresh. We only run the wipe if WE are the last player out.
  useEffect(() => {
    const presenceChannel = supabase.channel(presenceChannelKey, {
      config: { presence: { key: userId } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const count = Object.keys(state).length;
        setPresenceCount(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: userId, username, joined_at: Date.now() });
        }
      });

    return () => {
      // Untrack first, then check if we were the last player. If we were,
      // delete all chat messages so the next session starts empty.
      (async () => {
        try {
          await presenceChannel.untrack();
          // Brief delay to let presence-sync propagate to the server
          await new Promise((r) => setTimeout(r, 150));
          const state = presenceChannel.presenceState();
          const remaining = Object.keys(state).filter((k) => k !== userId).length;
          if (remaining === 0) {
            // SECURITY DEFINER RPC; only authenticated users can call.
            await supabase.rpc('clear_game_chat', { p_game_id: gameId });
          }
        } finally {
          supabase.removeChannel(presenceChannel);
        }
      })();
    };
  }, [presenceChannelKey, userId, username]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  // Slash key to focus, Enter to toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '/' || e.key === 'Enter') {
        e.preventDefault();
        setOpen(true);
        const el = document.getElementById('game-chat-input') as HTMLInputElement | null;
        el?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim().slice(0, 200);
    if (!text || sending) return;
    setSending(true);
    const { error } = await supabase
      .from('game_chat')
      .insert({ user_id: userId, username, message: text, game_id: gameId });
    setSending(false);
    if (!error) setInput('');
  };

  return (
    <div
      className="fixed top-4 right-4 w-[320px] max-w-[80vw] z-40 select-text"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      <div
        className="rounded-md backdrop-blur-md border"
        style={{
          background: 'rgba(0, 0, 0, 0.55)',
          borderColor: 'rgba(255,255,255,0.15)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-white text-xs font-bold gap-2"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <span className="flex items-center gap-1.5 truncate">
            <span className="text-cyan-300">Chat</span>
            {gameName && (
              <>
                <span className="opacity-50">·</span>
                <span className="font-normal opacity-80 truncate">{gameName}</span>
              </>
            )}
          </span>
          <span className="opacity-70 flex items-center gap-2">
            <span className="text-[10px] font-normal">{presenceCount} online</span>
            <span>{open ? '▾' : '▸'}</span>
          </span>
        </button>
        {open && (
          <>
            <div ref={listRef} className="h-48 overflow-y-auto px-3 py-2 space-y-1 text-sm text-white">
              {messages.length === 0 && (
                <div className="text-white/50 text-xs italic">
                  {gameName ? `In ${gameName} — say hi!` : 'No messages yet — say hi!'}
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className="leading-snug">
                  <span className="font-bold text-cyan-300">{m.username}:</span>{' '}
                  <span className="text-white/95 break-words">{m.message}</span>
                </div>
              ))}
            </div>
            <form onSubmit={send} className="flex items-center gap-1 p-2 border-t border-white/10">
              <input
                id="game-chat-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={gameName ? `Chat in ${gameName}…` : 'Press / to chat…'}
                maxLength={200}
                className="flex-1 bg-white/10 text-white placeholder-white/40 text-sm px-2 py-1 rounded outline-none focus:bg-white/15"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="p-1.5 rounded bg-cyan-500/80 hover:bg-cyan-400 disabled:opacity-40 text-white"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
