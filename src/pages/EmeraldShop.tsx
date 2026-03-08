import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Gem, Sparkles, Crown, Zap, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const packages = [
  { id: '100', amount: 100, label: '100', price: '$0.99', icon: Gem, color: 'from-blue-400 to-blue-600', popular: false },
  { id: '500', amount: 500, label: '500', price: '$4.99', icon: Zap, color: 'from-green-400 to-emerald-600', popular: false },
  { id: '1000', amount: 1000, label: '1,000', price: '$9.99', icon: Star, color: 'from-purple-400 to-purple-600', popular: true },
  { id: '2500', amount: 2500, label: '2,500', price: '$19.99', icon: Sparkles, color: 'from-amber-400 to-orange-600', popular: false },
  { id: '5000', amount: 5000, label: '5,000', price: '$39.99', icon: Crown, color: 'from-pink-400 to-rose-600', popular: false },
  { id: '10000', amount: 10000, label: '10,000', price: '$74.99', icon: Crown, color: 'from-yellow-300 to-yellow-600', popular: false },
];

const EmeraldShop = () => {
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const [buying, setBuying] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const handleBuy = async (pkg: typeof packages[0]) => {
    if (!user || !profile) return;
    setBuying(pkg.id);
    
    try {
      // Fake purchase — just give the emeralds
      const { error } = await supabase
        .from('profiles')
        .update({ emeralds: profile.emeralds + pkg.amount })
        .eq('user_id', user.id);

      if (error) throw error;
      await refreshProfile();
      toast.success(`Purchased ${pkg.label} Emeralds! 💎`);
    } catch {
      toast.error('Purchase failed');
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <Gem className="w-10 h-10 text-primary" />
          <h1 className="text-4xl font-display font-bold">Emerald Shop</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Get Emeralds to buy items, trade, and more!
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
          <Gem className="w-5 h-5 text-primary" />
          <span className="font-bold text-lg">Your Balance: {profile?.emeralds.toLocaleString() || 0}</span>
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => {
          const Icon = pkg.icon;
          return (
            <div
              key={pkg.id}
              className={`relative cyber-card p-6 flex flex-col items-center text-center space-y-4 transition-transform hover:scale-105 ${
                pkg.popular ? 'ring-2 ring-primary' : ''
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full uppercase">
                  Most Popular
                </div>
              )}
              
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${pkg.color} flex items-center justify-center shadow-lg`}>
                <Icon className="w-10 h-10 text-white" />
              </div>

              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <Gem className="w-5 h-5 text-primary" />
                  <span className="text-2xl font-display font-bold">{pkg.label}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Emeralds</p>
              </div>

              <div className="text-lg font-bold text-muted-foreground line-through">{pkg.price}</div>
              <div className="text-sm text-accent font-bold">FREE — It's fake!</div>

              <Button
                className="w-full gap-2"
                variant="emerald"
                onClick={() => handleBuy(pkg)}
                disabled={buying === pkg.id}
              >
                {buying === pkg.id ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Gem className="w-4 h-4" />
                    Get Emeralds
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        This is a virtual currency with no real-world value. All purchases are free and instant.
      </p>
    </div>
  );
};

export default EmeraldShop;
