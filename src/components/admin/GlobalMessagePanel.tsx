import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Megaphone, Send } from 'lucide-react';
import { toast } from 'sonner';

const GlobalMessagePanel = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || !user) return;

    setSending(true);
    try {
      // Get all user IDs
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id');

      if (!profiles || profiles.length === 0) {
        toast.error('No users found');
        return;
      }

      // Send system message to each user
      const messages = profiles
        .filter(p => p.user_id !== user.id)
        .map(p => ({
          sender_id: user.id,
          receiver_id: p.user_id,
          message: message.trim(),
          is_system: true,
        }));

      if (messages.length === 0) {
        toast.error('No recipients');
        return;
      }

      // Batch insert
      const { error } = await supabase.from('messages').insert(messages);

      if (error) throw error;

      toast.success(`Global message sent to ${messages.length} users`);
      setMessage('');

      // Log action
      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        action: 'global_message',
        details: { message: message.trim(), recipients: messages.length },
      });
    } catch (error) {
      console.error('Error sending global message:', error);
      toast.error('Failed to send global message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-xl flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-secondary" />
        Global Message
      </h2>

      <div className="p-6 bg-muted/30 rounded-lg space-y-4">
        <p className="text-sm text-muted-foreground">
          Send a message to every user's inbox. It will appear from <strong className="text-secondary">SODABLOX</strong>.
        </p>

        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your announcement message..."
            rows={4}
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="gap-2"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send to All Users
        </Button>
      </div>
    </div>
  );
};

export default GlobalMessagePanel;
