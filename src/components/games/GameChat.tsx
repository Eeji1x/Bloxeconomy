import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Send } from 'lucide-react';

type ChatRow = { id: string; user_id: string; username: string; message: string; created_at: string };

export const GameChat = ({ userId, username }: { userId: string; username: string }) => {
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    supabase
      .from('game_chat')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(40)
      .then(({ data }) => {
        if (mounted && data) setMessages(data.reverse() as ChatRow[]);
      });

    const channel = supabase
      .channel('game_chat_room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_chat' }, (payload) => {
        setMessages((prev) => [...prev.slice(-99), payload.new as ChatRow]);
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

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
    const { error } = await supabase.from('game_chat').insert({ user_id: userId, username, message: text });
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
          className="w-full flex items-center justify-between px-3 py-1.5 text-white text-xs font-bold"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <span>Chat</span>
          <span className="opacity-70">{open ? '▾' : '▸'}</span>
        </button>
        {open && (
          <>
            <div ref={listRef} className="h-48 overflow-y-auto px-3 py-2 space-y-1 text-sm text-white">
              {messages.length === 0 && (
                <div className="text-white/50 text-xs italic">No messages yet — say hi!</div>
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
                placeholder="Press / to chat…"
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
