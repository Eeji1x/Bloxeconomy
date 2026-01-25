import { useAuth } from '@/contexts/AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, Gem, Calendar, Shield, Package, ArrowLeftRight, Settings } from 'lucide-react';

const Profile = () => {
  const { user, profile, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="cyber-card p-8">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Avatar */}
          <div className="relative">
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
              <img
                src="https://static.wikia.nocookie.net/roblox/images/7/7e/R15_Noob.png"
                alt={profile.username}
                className="w-full h-full object-cover"
              />
            </div>
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background ${profile.is_online ? 'bg-accent' : 'bg-muted-foreground'}`} />
          </div>

          {/* User Info */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-3">
                <h1 className="text-3xl font-display font-bold">{profile.username}</h1>
                {isAdmin && (
                  <span className="admin-badge">
                    <Shield className="w-3 h-3" />
                    Admin
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">User #{profile.numeric_id}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
              {/* Emeralds */}
              <div className="flex items-center gap-2">
                <div className="emerald-display">
                  <Gem className="w-5 h-5 text-accent" />
                  <span className="font-bold text-lg text-accent-foreground">
                    {profile.emeralds.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Joined {memberSince}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <Link to="/avatar">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                  Edit Avatar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="cyber-card p-4 text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-primary/20 flex items-center justify-center">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div className="text-2xl font-display font-bold text-foreground">0</div>
          <div className="text-sm text-muted-foreground">Items Owned</div>
        </div>
        <div className="cyber-card p-4 text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-secondary/20 flex items-center justify-center">
            <ArrowLeftRight className="w-6 h-6 text-secondary" />
          </div>
          <div className="text-2xl font-display font-bold text-foreground">0</div>
          <div className="text-sm text-muted-foreground">Trades Made</div>
        </div>
        <div className="cyber-card p-4 text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-accent/20 flex items-center justify-center">
            <User className="w-6 h-6 text-accent" />
          </div>
          <div className="text-2xl font-display font-bold text-foreground">0</div>
          <div className="text-sm text-muted-foreground">Friends</div>
        </div>
        <div className="cyber-card p-4 text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-neon-purple/20 flex items-center justify-center">
            <Gem className="w-6 h-6 text-neon-purple" />
          </div>
          <div className="text-2xl font-display font-bold text-foreground">0</div>
          <div className="text-sm text-muted-foreground">Limiteds</div>
        </div>
      </div>

      {/* Inventory Preview */}
      <div className="cyber-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Inventory
          </h2>
          <Link to="/avatar">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Your inventory is empty</p>
          <p className="text-sm">Visit the catalog to get some items!</p>
          <Link to="/catalog" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              Browse Catalog
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Profile;
