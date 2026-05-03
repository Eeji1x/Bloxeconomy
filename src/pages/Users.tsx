import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { Users as UsersIcon, Shield, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DEFAULT_AVATAR_URL } from '@/lib/constants';

const DEFAULT_AVATAR = DEFAULT_AVATAR_URL;

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  numeric_id: number;
  is_online: boolean | null;
  avatar_data: unknown;
  created_at: string;
  is_verified: boolean | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

const Users = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
  const isRoblox = theme === 'roblox2016';

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: profilesData, error: profilesError } = await (supabase as any)
        .from('public_profiles')
        .select('id, user_id, username, numeric_id, is_online, avatar_data, created_at, is_verified')
        .order('is_online', { ascending: false })
        .order('last_seen', { ascending: false });

      if (!profilesError && profilesData) setUsers(profilesData as UserProfile[]);

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (!rolesError && rolesData) setRoles(rolesData);
      setIsLoading(false);
    };

    fetchUsers();

    const channel = supabase
      .channel('profiles_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const isAdmin = (userId: string) => roles.some(r => r.user_id === userId && r.role === 'admin');

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.numeric_id.toString().includes(searchQuery)
  );

  const onlineUsers = filteredUsers.filter(u => u.is_online);
  const offlineUsers = filteredUsers.filter(u => !u.is_online);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     ROBLOX 2016 USERS LAYOUT
     ═══════════════════════════════════════════ */
  if (isRoblox) {
    return (
      <div style={{ maxWidth: 900 }}>
        <div className="rbx16-panel" style={{ marginBottom: 12 }}>
          <div className="rbx16-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>People ({onlineUsers.length} online · {users.length} total)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rbx16-search-catalog"
              />
            </div>
          </div>
        </div>

        {onlineUsers.length > 0 && (
          <div className="rbx16-panel" style={{ marginBottom: 12 }}>
            <div className="rbx16-panel-header" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#02b757' }} />
              Online ({onlineUsers.length})
            </div>
            <div className="rbx16-panel-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10 }}>
                {onlineUsers.map((user) => (
                  <Link key={user.id} to={`/profile/${user.numeric_id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                    <div style={{ width: 60, height: 60, border: '1px solid #c3c3c3', overflow: 'hidden', position: 'relative' }}>
                      <img src={DEFAULT_AVATAR} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }} />
                      <div style={{ position: 'absolute', bottom: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: '#02b757', border: '1.5px solid #fff' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 11, color: '#0055b3', fontWeight: 600, maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</span>
                      {user.is_verified && <img src="/images/verified-badge.png" alt="Verified" style={{ width: 10, height: 10 }} />}
                      {isAdmin(user.user_id) && <Shield className="w-2.5 h-2.5" style={{ color: '#cc3333' }} />}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="rbx16-panel">
          <div className="rbx16-panel-header" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#999' }} />
            Offline ({offlineUsers.length})
          </div>
          <div className="rbx16-panel-body">
            {offlineUsers.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10 }}>
                {offlineUsers.map((user) => (
                  <Link key={user.id} to={`/profile/${user.numeric_id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                    <div style={{ width: 60, height: 60, border: '1px solid #c3c3c3', overflow: 'hidden', opacity: 0.7 }}>
                      <img src={DEFAULT_AVATAR} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 11, color: '#666', fontWeight: 600, maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</span>
                      {user.is_verified && <img src="/images/verified-badge.png" alt="Verified" style={{ width: 10, height: 10 }} />}
                      {isAdmin(user.user_id) && <Shield className="w-2.5 h-2.5" style={{ color: '#cc3333' }} />}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 20, color: '#999', fontSize: 13 }}>No offline users</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     DEFAULT BloxEconomy LAYOUT
     ═══════════════════════════════════════════ */
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <UsersIcon className="w-8 h-8 text-primary" />
            Users
          </h1>
          <p className="text-muted-foreground">
            {onlineUsers.length} online • {users.length} total users
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input placeholder="Search by username or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-12 bg-input border-border" />
        </div>
      </div>

      {onlineUsers.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-display font-semibold flex items-center gap-2">
            <div className="online-dot" />
            Online Now
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {onlineUsers.map((user) => (
              <UserCard key={user.id} user={user} isAdmin={isAdmin(user.user_id)} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-display font-semibold flex items-center gap-2">
          <div className="offline-dot" />
          Offline
        </h2>
        {offlineUsers.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {offlineUsers.map((user) => (
              <UserCard key={user.id} user={user} isAdmin={isAdmin(user.user_id)} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No offline users to display</p>
        )}
      </section>
    </div>
  );
};

/* Roblox 2020 circular avatar card */
const RbxUserCard = ({ user, isAdminUser }: { user: UserProfile; isAdminUser: boolean }) => (
  <Link to={`/profile/${user.numeric_id}`} className="flex flex-col items-center gap-1.5 group">
    <div className="relative">
      <div className="w-[68px] h-[68px] rounded-full overflow-hidden border-2 border-border bg-muted group-hover:border-primary/40 transition-colors">
        <img
          src={DEFAULT_AVATAR}
          alt={user.username}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
        />
      </div>
      {user.is_online && (
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#02b757] border-2 border-white" />
      )}
    </div>
    <div className="flex items-center gap-1">
      <span className="text-xs font-medium text-foreground text-center truncate max-w-[72px] group-hover:text-primary transition-colors">
        {user.username}
      </span>
      {user.is_verified && (
        <img src="/images/verified-badge.png" alt="Verified" className="w-3 h-3" />
      )}
      {isAdminUser && (
        <Shield className="w-3 h-3 text-destructive" />
      )}
    </div>
  </Link>
);

/* Default cyberpunk user card */
const UserCard = ({ user, isAdmin }: { user: UserProfile; isAdmin: boolean }) => (
  <Link to={`/profile/${user.numeric_id}`}>
    <div className="cyber-card text-center group cursor-pointer">
      <div className="w-20 h-20 mx-auto mb-3 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
        <img src={DEFAULT_AVATAR} alt={user.username} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }} />
      </div>
      <div className="flex items-center justify-center gap-1">
        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">{user.username}</h3>
        {user.is_verified && <img src="/images/verified-badge.png" alt="Verified" className="w-4 h-4" />}
      </div>
      <div className="flex items-center justify-center gap-2 mt-1">
        <span className="text-xs text-muted-foreground">ID: {user.numeric_id}</span>
        {isAdmin && <span className="admin-badge"><Shield className="w-3 h-3" /></span>}
      </div>
      <div className="flex items-center justify-center gap-1 mt-2">
        <div className={user.is_online ? 'online-dot' : 'offline-dot'} />
        <span className="text-xs text-muted-foreground">{user.is_online ? 'Online' : 'Offline'}</span>
      </div>
    </div>
  </Link>
);

export default Users;
