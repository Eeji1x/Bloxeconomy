import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';
import { HomeLeftPanel } from '@/components/home/HomeLeftPanel';
import { HomeFriendsList } from '@/components/home/HomeFriendsList';
import { HomeQuickActions } from '@/components/home/HomeQuickActions';
import { HomeAnnouncements } from '@/components/home/HomeAnnouncements';
import { Roblox2016Home } from '@/components/home/Roblox2016Home';
import { Roblox2015Home } from '@/components/home/Roblox2015Home';
import { Roblox2008Home } from '@/components/home/Roblox2008Home';


const Index = () => {
  const { user, profile } = useAuth();
  const { theme } = useTheme();

  // Logged out: redirect to auth home
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Roblox 2008 themed home
  if (theme === 'roblox2008') {
    return <Roblox2008Home />;
  }

  // SODABLOX 2015 themed home
  if (theme === 'roblox2015') {
    return <Roblox2015Home />;
  }

  // SODABLOX 2016 themed home
  if (theme === 'roblox2016') {
    return <Roblox2016Home />;
  }

  // Vapor / Test Theme home
  if (theme === 'vapor') {
    return <VaporHome />;
  }

  // Default SODABLOX home
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">
            Welcome back, <span className="gradient-text">{profile?.username}</span>!
          </h1>
          <p className="text-muted-foreground">What would you like to do today?</p>
        </div>
        <Link to="/profile">
          <Button variant="outline" className="gap-2">
            <Crown className="w-4 h-4" />
            View Profile
          </Button>
        </Link>
      </div>
      <HomeQuickActions />
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <HomeLeftPanel />
        </div>
        <div className="lg:col-span-6 space-y-6">
          <HomeAnnouncements />
          <div className="cyber-card p-6">
            <h3 className="font-display font-bold mb-4">Your Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">{profile?.emeralds.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Emeralds</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-secondary">#{profile?.numeric_id}</p>
                <p className="text-sm text-muted-foreground">User ID</p>
              </div>
            </div>
          </div>
          <div className="cyber-card p-6 space-y-4">
            <h3 className="font-display font-bold">Getting Started</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <Link to="/catalog" className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <h4 className="font-medium mb-1">🛒 Browse the Catalog</h4>
                <p className="text-sm text-muted-foreground">Find unique items and limiteds</p>
              </Link>
              <Link to="/users" className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <h4 className="font-medium mb-1">👥 Meet People</h4>
                <p className="text-sm text-muted-foreground">Connect with other players</p>
              </Link>
              <Link to="/promocodes" className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <h4 className="font-medium mb-1">🎁 Redeem Codes</h4>
                <p className="text-sm text-muted-foreground">Get free emeralds and items</p>
              </Link>
              <Link to="/avatar" className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <h4 className="font-medium mb-1">🎨 Customize Avatar</h4>
                <p className="text-sm text-muted-foreground">Express your style</p>
              </Link>
            </div>
          </div>
        </div>
        <div className="lg:col-span-3 space-y-6">
          <HomeFriendsList />
        </div>
      </div>
    </div>
  );
};

export default Index;
