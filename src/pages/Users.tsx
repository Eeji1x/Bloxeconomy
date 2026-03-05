import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
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

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, username, numeric_id, is_online, avatar_data, created_at, is_verified')
        .eq('is_banned', false)
        .order('is_online', { ascending: false })
        .order('last_seen', { ascending: false });

      if (!profilesError && profilesData) {
        setUsers(profilesData as UserProfile[]);
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (!rolesError && rolesData) {
        setRoles(rolesData);
      }

      setIsLoading(false);
    };

    fetchUsers();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('profiles_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isAdmin = (userId: string) => {
    return roles.some(r => r.user_id === userId && r.role === 'admin');
  };

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

  return (
    <div className="space-y-8">
      {/* Header */}
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
          <Input
            placeholder="Search by username or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 bg-input border-border"
          />
        </div>
      </div>

      {/* Online Users */}
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

      {/* Offline Users */}
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
          <p className="text-muted-foreground text-center py-8">
            No offline users to display
          </p>
        )}
      </section>
    </div>
  );
};

const UserCard = ({ user, isAdmin }: { user: UserProfile; isAdmin: boolean }) => {
  return (
    <Link to={`/profile/${user.user_id}`}>
      <div className="cyber-card text-center group cursor-pointer">
        {/* Avatar placeholder */}
        <div className="w-20 h-20 mx-auto mb-3 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
          <img
            src={DEFAULT_AVATAR}
            alt={user.username}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
        </div>

        {/* Username */}
        <div className="flex items-center justify-center gap-1">
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
            {user.username}
          </h3>
          {user.is_verified && (
            <img 
              src="/images/verified-badge.png" 
              alt="Verified" 
              className="w-4 h-4"
              title="Verified"
            />
          )}
        </div>

        {/* ID and badges */}
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">ID: {user.numeric_id}</span>
          {isAdmin && (
            <span className="admin-badge">
              <Shield className="w-3 h-3" />
            </span>
          )}
        </div>

        {/* Online indicator */}
        <div className="flex items-center justify-center gap-1 mt-2">
          <div className={user.is_online ? 'online-dot' : 'offline-dot'} />
          <span className="text-xs text-muted-foreground">
            {user.is_online ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default Users;
