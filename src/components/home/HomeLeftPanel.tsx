import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Gem, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/avatar/UserAvatar';

export const HomeLeftPanel = () => {
  const { user, profile, isAdmin } = useAuth();

  if (!profile || !user) return null;

  return (
    <div className="cyber-card p-6 space-y-4">
      {/* Avatar */}
      <div className="relative">
        <Link to="/profile">
          <UserAvatar 
            userId={user.id} 
            size="xl" 
            className="w-full aspect-square" 
          />
        </Link>
        {profile.is_online && (
          <div className="absolute bottom-2 right-2 w-4 h-4 bg-accent rounded-full border-2 border-background" />
        )}
      </div>

      {/* User Info */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Link to="/profile" className="font-display font-bold text-lg hover:text-primary transition-colors">
            {profile.username}
          </Link>
          {profile.is_verified && (
            <img 
              src="/images/verified-badge.png" 
              alt="Verified" 
              className="w-5 h-5"
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground">#{profile.numeric_id}</p>
      </div>

      {/* Emerald Balance */}
      <div className="flex items-center justify-center gap-2 p-3 bg-accent/10 rounded-lg border border-accent/30">
        <Gem className="w-5 h-5 text-accent" />
        <span className="font-bold text-accent text-lg">{profile.emeralds.toLocaleString()}</span>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <Link to="/avatar">
          <Button variant="outline" size="sm" className="w-full">
            Edit Avatar
          </Button>
        </Link>
        <Link to="/settings">
          <Button variant="ghost" size="sm" className="w-full gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </Link>
      </div>

      {/* Admin Badge */}
      {isAdmin && (
        <Link to="/admin">
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-center">
            <span className="text-sm font-medium text-destructive">Admin Panel</span>
          </div>
        </Link>
      )}
    </div>
  );
};
