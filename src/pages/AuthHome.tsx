import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, ShoppingBag, ArrowLeftRight, Users, Gem, Crown, Trophy, Gamepad2 } from 'lucide-react';

const AuthHome = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }
    setIsLoggingIn(true);
    try {
      const email = `${username.toLowerCase()}@sodablox.local`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error('Invalid username or password');
      else navigate('/');
    } catch {
      toast.error('Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // If the user is already authenticated, skip the marketing page entirely.
  // Previously this page kept showing while AuthContext finished hydrating,
  // which caused a flicker loop with Index for users like ID 1.
  if (!isLoading && user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Top bar */}
      <header className="border-b border-border/40 backdrop-blur-md bg-background/60 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/auth" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary grid place-items-center shadow-lg shadow-primary/30">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl tracking-wide gradient-text">BloxEconomy</span>
          </Link>
          {!user ? (
            <form onSubmit={handleLogin} className="hidden md:flex items-center gap-2">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="h-9 w-36 bg-muted/40" />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="h-9 w-36 bg-muted/40" />
              <Button type="submit" disabled={isLoggingIn} size="sm" className="h-9">
                {isLoggingIn ? '...' : 'Login'}
              </Button>
            </form>
          ) : (
            <Button asChild size="sm"><Link to="/">Go to Home</Link></Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Now in beta — invite-only access
        </div>
        <h1 className="text-5xl sm:text-7xl font-display font-extrabold tracking-tight mb-6 leading-[1.05]">
          The next-gen <span className="gradient-text">virtual economy</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Trade limiteds, build collections, climb the leaderboards.
          A futuristic revival built for collectors and traders.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!user ? (
            <>
              <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/30">
                <Link to="/signup">Create Account</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
                <Link to="/apply">Apply to Join</Link>
              </Button>
            </>
          ) : (
            <Button asChild size="lg" className="h-12 px-8"><Link to="/">Open Dashboard</Link></Button>
          )}
        </div>
      </section>

      {/* Mobile login */}
      {!user && (
        <section className="md:hidden max-w-md mx-auto px-5 pb-10">
          <div className="cyber-card p-5">
            <h3 className="font-display font-bold mb-3">Login</h3>
            <form onSubmit={handleLogin} className="space-y-2">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
              <Button type="submit" disabled={isLoggingIn} className="w-full">{isLoggingIn ? '...' : 'Login'}</Button>
            </form>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="max-w-6xl mx-auto px-5 pb-24">
        <h2 className="text-3xl font-display font-bold text-center mb-12">What's inside</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { Icon: ShoppingBag, title: 'Catalog', desc: 'Browse, buy, and discover limiteds with permanent global serials.' },
            { Icon: ArrowLeftRight, title: 'Trading', desc: 'Atomic server-side trades. Send items + emeralds in a single deal.' },
            { Icon: Users, title: 'Community', desc: 'Friends, private inbox, public profiles — all built-in.' },
            { Icon: Gem, title: 'Daily Emeralds', desc: 'Claim 100 emeralds every 24 hours. Every account starts with 100.' },
            { Icon: Trophy, title: 'Leaderboards', desc: 'Most emeralds, most limiteds — compete for the top spot.' },
            { Icon: Gamepad2, title: '3D Web Client', desc: 'Beta: jump into a 3D scene with your equipped avatar.' },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="cyber-card p-6 hover:border-primary/40 transition-all group">
              <div className="w-11 h-11 rounded-lg bg-primary/10 grid place-items-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-bold text-lg mb-1.5">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="max-w-3xl mx-auto px-5 pb-20 text-center">
          <div className="cyber-card p-10 bg-gradient-to-br from-primary/10 via-card to-secondary/10 border-primary/30">
            <Crown className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold mb-3">Ready to join the economy?</h2>
            <p className="text-muted-foreground mb-6">
              Sign up with an invite key, or apply for one if you don't have one yet.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild size="lg"><Link to="/signup">Create Account</Link></Button>
              <Button asChild variant="outline" size="lg"><Link to="/apply">Apply for Invite</Link></Button>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} BloxEconomy. All rights reserved.</p>
          <div className="flex gap-5">
            <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link to="/apply" className="hover:text-primary transition-colors">Apply</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AuthHome;
