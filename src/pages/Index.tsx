import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Zap, Crown, Sparkles } from 'lucide-react';
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

  // Logged out view
  if (!user) {
    return (
      <div className="space-y-16">
        <section className="relative py-20 text-center">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-full blur-3xl animate-pulse" />
            </div>
          </div>
          <div className="relative z-10 space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                <span>Welcome to the future of virtual worlds</span>
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black tracking-tight">
                <span className="gradient-text">SODA</span>
                <span className="text-foreground">BLOX</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-body">
                A futuristic virtual world revival. Collect items, trade limiteds, and build your legacy.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button variant="neon" size="xl" className="group">
                  <Zap className="w-5 h-5 group-hover:animate-pulse" />
                  Start Playing
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="xl">
                  Already have an account?
                </Button>
              </Link>
            </div>
          </div>
        </section>
        <section className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20" />
          <div className="absolute inset-0 cyber-grid opacity-30" />
          <div className="relative p-12 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-display font-bold">
              Ready to join the <span className="gradient-text">revolution</span>?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Create your account now and receive 100 free emeralds to start your journey.
            </p>
            <Link to="/signup">
              <Button variant="neon" size="xl">Create Account</Button>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // Roblox 2008 themed home
  if (theme === 'roblox2008') {
    return <Roblox2008Home />;
  }

  // SODABLOX 2016 themed home
  if (theme === 'roblox2016') {
    return <Roblox2016Home />;
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
