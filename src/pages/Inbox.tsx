import { useEffect, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Send, ArrowLeft, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  is_system: boolean;
  created_at: string;
}

interface ConversationPreview {
  partnerId: string;
  partnerName: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
}

const SYSTEM_SENDER_NAME = 'SODABLOX';

const Inbox = () => {
  const { user, profile, isLoading } = useAuth();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [selectedPartnerName, setSelectedPartnerName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [newConvoUsername, setNewConvoUsername] = useState('');
  const [showNewConvo, setShowNewConvo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();

      // Realtime subscription
      const channel = supabase
        .channel('inbox-messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_id === user.id || msg.receiver_id === user.id) {
            fetchConversations();
            if (selectedPartner && (msg.sender_id === selectedPartner || msg.receiver_id === selectedPartner)) {
              setMessages(prev => [...prev, msg]);
              // Mark as read if we're the receiver
              if (msg.receiver_id === user.id) {
                supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then();
              }
            }
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user, selectedPartner]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    if (!user) return;

    // Get all messages involving user
    const { data: allMessages } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!allMessages) return;

    // Group by conversation partner
    const convos = new Map<string, { messages: Message[] }>();
    for (const msg of allMessages) {
      const partnerId = msg.is_system
        ? 'system'
        : msg.sender_id === user.id
          ? msg.receiver_id
          : msg.sender_id;
      if (!convos.has(partnerId)) {
        convos.set(partnerId, { messages: [] });
      }
      convos.get(partnerId)!.messages.push(msg);
    }

    // Fetch partner usernames
    const partnerIds = Array.from(convos.keys()).filter(id => id !== 'system');
    const { data: profiles } = partnerIds.length > 0
      ? await supabase.from('profiles').select('user_id, username').in('user_id', partnerIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.username]));

    const previews: ConversationPreview[] = [];
    convos.forEach((data, partnerId) => {
      const sorted = data.messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const unread = sorted.filter(m => m.receiver_id === user.id && !m.is_read).length;
      previews.push({
        partnerId,
        partnerName: partnerId === 'system' ? SYSTEM_SENDER_NAME : (profileMap.get(partnerId) || 'Unknown'),
        lastMessage: sorted[0].message,
        lastTime: sorted[0].created_at,
        unreadCount: unread,
      });
    });

    previews.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
    setConversations(previews);
  };

  const openConversation = async (partnerId: string, partnerName: string) => {
    setSelectedPartner(partnerId);
    setSelectedPartnerName(partnerName);

    if (!user) return;

    let query = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (partnerId === 'system') {
      query = query.eq('is_system', true).eq('receiver_id', user.id);
    } else {
      query = query.or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`
      );
    }

    const { data } = await query;
    setMessages(data || []);

    // Mark unread as read
    if (data) {
      const unreadIds = data.filter(m => m.receiver_id === user.id && !m.is_read).map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
        fetchConversations();
      }
    }
  };

  const handleSend = async () => {
    if (!user || !selectedPartner || !newMessage.trim() || selectedPartner === 'system') return;

    setSending(true);
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: selectedPartner,
      message: newMessage.trim(),
    });

    if (error) {
      toast.error('Failed to send message');
    } else {
      setNewMessage('');
    }
    setSending(false);
  };

  const startNewConversation = async () => {
    if (!newConvoUsername.trim()) return;

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('user_id, username')
      .ilike('username', newConvoUsername.trim())
      .maybeSingle();

    if (!targetProfile) {
      toast.error('User not found');
      return;
    }

    if (targetProfile.user_id === user?.id) {
      toast.error('You cannot message yourself');
      return;
    }

    setShowNewConvo(false);
    setNewConvoUsername('');
    openConversation(targetProfile.user_id, targetProfile.username);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>;
  }

  if (!user || !profile) return <Navigate to="/login" replace />;

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <Mail className="w-8 h-8 text-primary" />
          Inbox
          {totalUnread > 0 && (
            <span className="px-2 py-0.5 text-sm bg-destructive text-destructive-foreground rounded-full">
              {totalUnread}
            </span>
          )}
        </h1>
        <Button variant="outline" onClick={() => setShowNewConvo(!showNewConvo)}>
          New Message
        </Button>
      </div>

      {showNewConvo && (
        <div className="cyber-card p-4 flex gap-2">
          <Input
            placeholder="Enter username..."
            value={newConvoUsername}
            onChange={(e) => setNewConvoUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startNewConversation()}
          />
          <Button onClick={startNewConversation}>Start</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[60vh]">
        {/* Conversation List */}
        <div className="cyber-card p-0 overflow-hidden md:col-span-1">
          <div className="p-3 border-b border-border">
            <h2 className="font-display font-bold text-sm text-muted-foreground uppercase tracking-wider">Conversations</h2>
          </div>
          <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No messages yet</div>
            ) : conversations.map((convo) => (
              <button
                key={convo.partnerId}
                onClick={() => openConversation(convo.partnerId, convo.partnerName)}
                className={cn(
                  "w-full text-left p-3 hover:bg-muted/30 transition-colors",
                  selectedPartner === convo.partnerId && "bg-primary/10 border-l-2 border-primary"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("font-bold text-sm truncate", convo.unreadCount > 0 && "text-primary")}>
                    {convo.partnerName}
                  </span>
                  {convo.unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                      {convo.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{convo.lastMessage}</p>
                <p className="text-xs text-muted-foreground/50 mt-0.5">
                  {new Date(convo.lastTime).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Message Thread */}
        <div className="cyber-card p-0 overflow-hidden md:col-span-2 flex flex-col">
          {selectedPartner ? (
            <>
              <div className="p-3 border-b border-border flex items-center gap-2">
                <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSelectedPartner(null)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h2 className="font-display font-bold">{selectedPartnerName}</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[50vh]">
                {messages.map((msg) => {
                  const isMine = msg.sender_id === user.id;
                  return (
                    <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[75%] px-3 py-2 rounded-lg text-sm",
                        isMine
                          ? "bg-primary/20 text-foreground rounded-br-none"
                          : msg.is_system
                            ? "bg-secondary/20 text-foreground rounded-bl-none border border-secondary/30"
                            : "bg-muted/50 text-foreground rounded-bl-none"
                      )}>
                        {!isMine && (
                          <p className="text-xs font-bold text-muted-foreground mb-1">
                            {msg.is_system ? SYSTEM_SENDER_NAME : selectedPartnerName}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        <p className="text-xs text-muted-foreground/50 mt-1 text-right">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input - only for non-system conversations */}
              {selectedPartner !== 'system' && (
                <div className="p-3 border-t border-border flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    disabled={sending}
                  />
                  <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <Mail className="w-12 h-12 mx-auto text-muted-foreground/30" />
                <p>Select a conversation or start a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inbox;
