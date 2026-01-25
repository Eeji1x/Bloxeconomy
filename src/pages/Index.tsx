import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Users, ArrowLeftRight, Gift, Sparkles, Zap, Crown } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: ShoppingBag,
      title: 'CATALOG',
      description: 'Explore unique items, limiteds, and exclusive collectibles',
      color: 'primary',
      link: '/catalog',
    },
    {
      icon: Users,
      title: 'COMMUNITY',
      description: 'Connect with players, make friends, and grow together',
      color: 'secondary',
      link: '/users',
    },
    {
      icon: ArrowLeftRight,
      title: 'TRADING',
      description: 'Trade limited items and emeralds with other players',
      color: 'accent',
      link: '/trading',
    },
    {
      icon: Gift,
      title: 'PROMOCODES',
      description: 'Redeem codes for free emeralds and exclusive items',
      color: 'neon-purple',
      link: '/promocodes',
    },
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative py-20 text-center">
        {/* Background effects */}
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
            {user ? (
              <>
                <Link to="/catalog">
                  <Button variant="neon" size="xl" className="group">
                    <Zap className="w-5 h-5 group-hover:animate-pulse" />
                    Explore Catalog
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="outline" size="xl">
                    <Crown className="w-5 h-5" />
                    View Profile
                  </Button>
                </Link>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.title}
              to={feature.link}
              className="cyber-card group cursor-pointer"
            >
              <div className="space-y-4">
                <div className={`w-14 h-14 rounded-xl bg-${feature.color}/20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-7 h-7 text-${feature.color}`} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {/* Stats Section */}
      <section className="cyber-card p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-2">
            <div className="text-4xl font-display font-bold text-primary neon-text">0</div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider">Players Online</div>
          </div>
          <div className="space-y-2">
            <div className="text-4xl font-display font-bold text-secondary neon-text-pink">0</div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider">Total Users</div>
          </div>
          <div className="space-y-2">
            <div className="text-4xl font-display font-bold text-accent neon-text-green">0</div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider">Catalog Items</div>
          </div>
          <div className="space-y-2">
            <div className="text-4xl font-display font-bold text-neon-purple">0</div>
            <div className="text-sm text-muted-foreground uppercase tracking-wider">Trades Made</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
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
              <Button variant="neon" size="xl">
                Create Account
              </Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;
