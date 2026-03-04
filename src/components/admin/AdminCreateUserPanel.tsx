import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { validateUsername } from '@/lib/profanity';

const AdminCreateUserPanel = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [emeralds, setEmeralds] = useState('100');
  const [customId, setCustomId] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    const validation = validateUsername(username);
    if (!validation.valid) {
      setError(validation.message || 'Invalid username');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (customId) {
      const numId = parseInt(customId);
      if (isNaN(numId) || numId < 1) {
        setError('ID must be a positive number');
        return;
      }
      if (numId === 1 || numId === 5) {
        setError('ID 1 and 5 are reserved and cannot be used');
        return;
      }
    }

    setCreating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('admin-create-user', {
        body: {
          username,
          password,
          emeralds: parseInt(emeralds) || 100,
          customId: customId || null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Creation failed');
      }

      const result = response.data;
      if (result?.error) {
        setError(result.error);
        return;
      }

      toast.success(`User "${username}" created successfully!`);
      setUsername('');
      setPassword('');
      setEmeralds('100');
      setCustomId('');
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleCreate} className="space-y-4 max-w-md">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <UserPlus className="w-5 h-5" />
        Create New User
      </h3>

      {error && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="admin-username">Username</Label>
        <Input
          id="admin-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Letters and numbers only"
          maxLength={20}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-password">Password</Label>
        <Input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 6 characters"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-emeralds">Starting Emeralds</Label>
        <Input
          id="admin-emeralds"
          type="number"
          value={emeralds}
          onChange={(e) => setEmeralds(e.target.value)}
          min="0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-customid">Custom ID (optional)</Label>
        <Input
          id="admin-customid"
          type="number"
          value={customId}
          onChange={(e) => setCustomId(e.target.value)}
          placeholder="Leave empty for auto-assign"
          min="1"
        />
        <p className="text-xs text-muted-foreground">
          IDs 1 and 5 are reserved. Must be unused.
        </p>
      </div>

      <Button type="submit" disabled={creating} className="w-full">
        {creating ? 'Creating...' : 'Create User'}
      </Button>
    </form>
  );
};

export default AdminCreateUserPanel;
