import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Users, Plus, Image as ImageIcon, Crown } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  owner_id: string;
  member_count: number;
  created_at: string;
}

const ALLOWED_ICON_SIZES = [256, 512];
const ICON_BUCKET = 'group-icons';
const GROUP_CREATE_COST = 250;

const Groups = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconError, setIconError] = useState('');
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('groups')
      .select('id, name, description, icon_url, owner_id, member_count, created_at')
      .order('member_count', { ascending: false })
      .limit(100);
    if (data) setGroups(data);
    setLoading(false);
  };

  const validateIcon = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (img.width !== img.height) return resolve('Icon must be square');
        if (!ALLOWED_ICON_SIZES.includes(img.width)) {
          return resolve('Icon must be exactly 256×256 or 512×512');
        }
        resolve(null);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve('Invalid image'); };
      img.src = url;
    });
  };

  const onIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setIconError('');
    setIconPreview(null);
    setIconFile(null);
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setIconError('Icon must be under 2 MB'); return; }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setIconError('Use PNG, JPEG, or WebP'); return;
    }
    const err = await validateIcon(file);
    if (err) { setIconError(err); return; }
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!user || !profile) return;
    if (name.trim().length < 3 || name.length > 32) {
      toast.error('Group name must be 3-32 characters');
      return;
    }
    if (!iconFile) {
      toast.error('Upload a group icon (256×256 or 512×512)');
      return;
    }
    if (profile.emeralds < GROUP_CREATE_COST) {
      toast.error(`Need ${GROUP_CREATE_COST} emeralds to create a group`);
      return;
    }

    setCreating(true);
    try {
      // Upload icon
      const ext = iconFile.name.split('.').pop() || 'png';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const upload = await supabase.storage.from(ICON_BUCKET).upload(path, iconFile, {
        cacheControl: '3600',
        upsert: false,
      });
      if (upload.error) throw upload.error;
      const { data: pub } = supabase.storage.from(ICON_BUCKET).getPublicUrl(path);

      // Single atomic RPC: validates name, charges emeralds, creates group + membership.
      const { data, error: rpcErr } = await supabase.rpc('create_group', {
        p_name: name.trim(),
        p_description: description.trim(),
        p_icon_url: pub.publicUrl,
      });
      if (rpcErr) throw rpcErr;
      const result = data as { success: boolean; message?: string; group_id?: string };
      if (!result?.success) {
        toast.error(result?.message || 'Failed to create group');
        return;
      }

      toast.success('Group created!');
      setShowCreate(false);
      setName(''); setDescription(''); setIconFile(null); setIconPreview(null);
      await fetchGroups();
      if (result.group_id) navigate(`/groups/${result.group_id}`);
    } catch (err) {
      console.error(err);
      const msg = (err as { message?: string })?.message || '';
      if (msg.toLowerCase().includes('duplicate') || msg.includes('groups_name_key')) {
        toast.error('A group with that name already exists');
      } else if (msg.toLowerCase().includes('bucket')) {
        toast.error(`Storage bucket "${ICON_BUCKET}" not configured. Ask an admin to create it.`);
      } else {
        toast.error('Failed to create group');
      }
    } finally {
      setCreating(false);
    }
  };

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="max-w-[940px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <h1
          className="text-3xl font-bold flex items-center gap-3"
          style={{
            fontFamily: 'Orbitron, sans-serif',
            color: 'hsl(180 100% 95%)',
            textShadow: '0 0 16px hsl(180 100% 50% / 0.5)',
          }}
        >
          <Users className="w-7 h-7 text-primary" />
          Groups
        </h1>
        <Button onClick={() => setShowCreate(s => !s)} className="gap-2">
          <Plus className="w-4 h-4" />
          {showCreate ? 'Cancel' : `Create Group (${GROUP_CREATE_COST} 💎)`}
        </Button>
      </div>

      {showCreate && (
        <div
          className="rounded-xl border border-primary/30 p-5 mb-6"
          style={{
            background: 'linear-gradient(135deg, hsl(260 40% 10%) 0%, hsl(260 35% 6%) 100%)',
            boxShadow: '0 0 30px hsl(180 100% 50% / 0.1)',
          }}
        >
          <h2 className="font-bold text-lg mb-4">New Group</h2>
          <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-5">
            <div className="text-center">
              <div
                className="rounded-md border-2 border-dashed border-primary/30 mx-auto flex items-center justify-center overflow-hidden"
                style={{ width: 140, height: 140, background: 'hsl(260 40% 14%)' }}
              >
                {iconPreview ? (
                  <img src={iconPreview} alt="Icon preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-primary/50" />
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onIconChange}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="mt-2 w-full text-xs"
              >
                Upload Icon
              </Button>
              <p className="text-[11px] text-muted-foreground mt-1">256×256 or 512×512</p>
              {iconError && <p className="text-xs text-destructive mt-1">{iconError}</p>}
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="g-name">Name</Label>
                <Input id="g-name" value={name} onChange={e => setName(e.target.value)} maxLength={32} placeholder="My Awesome Group" />
              </div>
              <div>
                <Label htmlFor="g-desc">Description</Label>
                <textarea
                  id="g-desc"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={500}
                  className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="What is your group about?"
                />
              </div>
              <Button onClick={handleCreate} disabled={creating || !iconFile || !name.trim()} className="w-full">
                {creating ? 'Creating...' : `Create (${GROUP_CREATE_COST} 💎)`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto opacity-30 mb-3" />
          <p>No groups yet — be the first to create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {groups.map(g => (
            <Link
              key={g.id}
              to={`/groups/${g.id}`}
              className="rounded-xl border border-primary/20 p-4 hover:border-primary/50 transition-colors"
              style={{ background: 'hsl(260 40% 10%)' }}
            >
              <div className="flex gap-3">
                <div
                  className="rounded-md overflow-hidden flex-shrink-0"
                  style={{ width: 64, height: 64, background: 'hsl(260 40% 14%)' }}
                >
                  {g.icon_url ? (
                    <img src={g.icon_url} alt={g.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary/40">
                      <Crown className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-base truncate text-primary">{g.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{g.description || 'No description'}</p>
                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Groups;
