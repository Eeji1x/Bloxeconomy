import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Zap, Sparkles, ShoppingBag, ArrowRightLeft, Users, Gem, Star, Gift, Trophy, FileText, Shield } from 'lucide-react';

const AuthHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (user) {
    navigate('/');
    return null;
  }

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
      if (error) {
        toast.error('Invalid username or password');
      } else {
        navigate('/');
      }
    } catch {
      toast.error('Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navbar */}
      <nav className="relative z-50 h-[60px] bg-card/80 backdrop-blur-xl border-b border-primary/20 shadow-[0_0_30px_hsl(var(--primary)/0.1)]">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6">
          <Link to="/auth" className="text-2xl font-display font-black tracking-tight">
            <span className="gradient-text">SODA</span>
            <span className="text-foreground">BLOX</span>
          </Link>
          <form onSubmit={handleLogin} className="hidden sm:flex items-center gap-2">
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-9 w-36 bg-input border-border text-sm"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 w-36 bg-input border-border text-sm"
            />
            <Button type="submit" variant="neon" size="sm" disabled={isLoggingIn}>
              {isLoggingIn ? '...' : 'Login'}
            </Button>
          </form>
          <div className="flex sm:hidden gap-2">
            <Link to="/login"><Button variant="outline" size="sm">Login</Button></Link>
            <Link to="/signup"><Button variant="neon" size="sm">Sign Up</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-24 md:py-32 text-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px]">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-full blur-3xl animate-pulse" />
          </div>
          <div className="absolute top-0 left-0 w-full h-full cyber-grid opacity-10" />
        </div>

        <div className="relative z-10 space-y-8 max-w-3xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>Welcome to the future of virtual worlds</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-display font-black tracking-tight">
            <span className="gradient-text">SODA</span>
            <span className="text-foreground">BLOX</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-body max-w-2xl mx-auto">
            A futuristic virtual world revival. Collect items, trade limiteds, and build your legacy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button variant="neon" size="xl" className="group">
                <Zap className="w-5 h-5 group-hover:animate-pulse" />
                Start Playing
              </Button>
            </Link>
            <Link to="/apply">
              <Button variant="outline" size="xl" className="gap-2">
                <FileText className="w-5 h-5" />
                Apply to Join
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="xl">
                Already have an account?
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12">
            Everything you need to <span className="gradient-text">dominate</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: ShoppingBag, title: 'Catalog', desc: 'Browse and purchase items. Find rare limiteds and exclusive gear.', color: 'text-primary' },
              { icon: ArrowRightLeft, title: 'Trading', desc: 'Trade limited items with other players. Grow your collection.', color: 'text-secondary' },
              { icon: Users, title: 'Community', desc: 'Connect with players, send messages, and add friends.', color: 'text-accent' },
            ].map((f) => (
              <div key={f.title} className="cyber-card p-6 group hover:border-primary/40 transition-all duration-300">
                <f.icon className={`w-10 h-10 ${f.color} mb-4 group-hover:scale-110 transition-transform`} />
                <h3 className="font-display font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Join */}
      <section className="relative py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5" />
        <div className="absolute inset-0 cyber-grid opacity-10" />
        <div className="relative max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12">
            Why join <span className="gradient-text">SODABLOX</span>?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: Gem, title: 'Free Emeralds', desc: 'Every new player receives 100 free emeralds to start their journey.' },
              { icon: Star, title: 'Limited Items', desc: 'Collect rare limited items with serial numbers. Trade them for profit!' },
              { icon: Gift, title: 'Promocodes', desc: 'Redeem special codes for free emeralds and exclusive items.' },
              { icon: Trophy, title: 'Leaderboards', desc: 'Compete with other players and climb the rankings.' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4 p-5 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-16 px-4">
        <div className="max-w-3xl mx-auto relative overflow-hidden rounded-2xl">
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
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SODABLOX. All rights reserved.
      </footer>
    </div>
  );
};

export default AuthHome;
