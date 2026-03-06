import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Copy, Key, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface InviteKey {
  id: string;
  key: string;
  created_by: string;
  created_at: string;
  used_by: string | null;
  used_at: string | null;
  is_used: boolean;
}

const generateInviteKey = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `INV-${segment(5)}-${segment(5)}`;
};

const InviteKeysPanel = () => {
  const [keys, setKeys] = useState<InviteKey[]>([]);
  const [usedByUsernames, setUsedByUsernames] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    const { data, error } = await supabase
      .from('invite_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setKeys(data as InviteKey[]);

      // Fetch usernames for used keys
      const usedUserIds = data
        .filter((k: any) => k.used_by)
        .map((k: any) => k.used_by as string);

      if (usedUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', usedUserIds);

        if (profiles) {
          const map: Record<string, string> = {};
          profiles.forEach((p: any) => {
            map[p.user_id] = p.username;
          });
          setUsedByUsernames(map);
        }
      }
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const newKey = generateInviteKey();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Not authenticated');
      setIsGenerating(false);
      return;
    }

    const { error } = await supabase
      .from('invite_keys')
      .insert({ key: newKey, created_by: user.id });

    if (error) {
      if (error.message.includes('duplicate')) {
        // Extremely rare collision — retry once
        const retryKey = generateInviteKey();
        const { error: retryError } = await supabase
          .from('invite_keys')
          .insert({ key: retryKey, created_by: user.id });
        if (retryError) {
          toast.error('Failed to generate key');
        } else {
          toast.success('Invite key generated!');
        }
      } else {
        toast.error('Failed to generate key');
      }
    } else {
      toast.success('Invite key generated!');
    }

    setIsGenerating(false);
    fetchKeys();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invite key?')) return;
    const { error } = await supabase.from('invite_keys').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete key');
    } else {
      toast.success('Key deleted');
      fetchKeys();
    }
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Key copied to clipboard');
  };

  const unusedCount = keys.filter((k) => !k.is_used).length;
  const usedCount = keys.filter((k) => k.is_used).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display font-bold">
            Invite Keys ({keys.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            {unusedCount} unused • {usedCount} used
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          <Plus className="w-4 h-4 mr-2" />
          {isGenerating ? 'Generating...' : 'Generate Key'}
        </Button>
      </div>

      <div className="space-y-3">
        {keys.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No invite keys yet. Generate one to get started.
          </div>
        )}

        {keys.map((key) => (
          <div
            key={key.id}
            className={`flex items-center justify-between p-4 rounded-lg ${
              key.is_used ? 'bg-muted/20' : 'bg-muted/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  key.is_used
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-accent/20 text-accent'
                }`}
              >
                {key.is_used ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Key className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="font-mono font-bold text-sm">{key.key}</div>
                <div className="text-xs text-muted-foreground">
                  Created {new Date(key.created_at).toLocaleDateString()}
                  {key.is_used && key.used_by && (
                    <span>
                      {' '}
                      • Used by{' '}
                      <span className="text-foreground font-medium">
                        {usedByUsernames[key.used_by] || 'Unknown'}
                      </span>
                      {key.used_at &&
                        ` on ${new Date(key.used_at).toLocaleDateString()}`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {key.is_used ? (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  Used
                </span>
              ) : (
                <span className="text-xs text-accent bg-accent/10 px-2 py-1 rounded">
                  Available
                </span>
              )}
              {!key.is_used && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(key.key)}
                  title="Copy key"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(key.id)}
                title="Delete key"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InviteKeysPanel;
