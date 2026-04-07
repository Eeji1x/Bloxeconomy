import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Gem, Sparkles, Crown, Zap, Star, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

const packages = [
  { id: '400', amount: 400, price: '$4.99', icon: Gem, color: 'from-blue-400 to-blue-600', popular: false },
  { id: '800', amount: 800, price: '$9.99', icon: Zap, color: 'from-green-400 to-emerald-600', popular: false },
  { id: '1700', amount: 1700, price: '$19.99', icon: Star, color: 'from-purple-400 to-purple-600', popular: true },
  { id: '4500', amount: 4500, price: '$49.99', icon: Sparkles, color: 'from-amber-400 to-orange-600', popular: false },
  { id: '10000', amount: 10000, price: '$99.99', icon: Crown, color: 'from-pink-400 to-rose-600', popular: false },
  { id: '22500', amount: 22500, price: '$199.99', icon: Crown, color: 'from-yellow-300 to-yellow-600', popular: false },
];

const EmeraldShop = () => {
  const { user, profile, isLoading } = useAuth();
  const { theme } = useTheme();
  const is2016 = theme === 'roblox2016' || theme === 'roblox2015';
  const navigate = useNavigate();
  const [showNope, setShowNope] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (showNope) {
    if (is2016) {
      return (
        <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
          <div className="rbx16-panel">
            <div className="rbx16-panel-header" style={{ background: '#ffe0e0' }}>Nice try!</div>
            <div className="rbx16-panel-body" style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 48 }}>🚫</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#393b3d' }}>You can't buy Emeralds lol</h2>
              <p style={{ fontSize: 13, color: '#666' }}>This is a virtual economy — Emeralds can't be purchased with real money.</p>
              <p style={{ fontSize: 13, color: '#666' }}>Earn them by logging in daily, trading, or using promo codes!</p>
              <button className="rbx16-btn-cancel" onClick={() => setShowNope(false)}>Go Back</button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="text-3xl font-display font-bold">You can't buy Emeralds lol</h1>
        <p className="text-muted-foreground text-lg">
          Nice try. This is a virtual economy — Emeralds can't be purchased with real money.
        </p>
        <p className="text-muted-foreground">
          Earn them by logging in daily, trading, or using promo codes!
        </p>
        <Button variant="outline" onClick={() => setShowNope(false)}>
          Go Back
        </Button>
      </div>
    );
  }

  if (is2016) {
    return (
      <div style={{ maxWidth: 800 }}>
        <h1 className="rbx16-page-title">Emerald Shop</h1>
        <div className="rbx16-panel" style={{ marginBottom: 12 }}>
          <div className="rbx16-panel-body" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Get Emeralds to buy items, trade, and more!</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', background: '#f0fff0', border: '1px solid #c3e8c3' }}>
              <span style={{ fontSize: 14 }}>💎</span>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Your Balance: {profile?.emeralds.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {packages.map((pkg) => (
            <div key={pkg.id} className="rbx16-panel" style={{ textAlign: 'center', position: 'relative' }}>
              {pkg.popular && <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', background: '#0074BD', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', textTransform: 'uppercase' }}>Most Popular</div>}
              <div className="rbx16-panel-body" style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 32 }}>💎</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#393b3d' }}>{pkg.amount.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: '#666' }}>Emeralds</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0074BD' }}>{pkg.price}</div>
                <button className="rbx16-btn-buy" style={{ width: '100%' }} onClick={() => setShowNope(true)}>Buy Now</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
                  <span className="text-2xl font-display font-bold">{pkg.amount.toLocaleString()}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Emeralds</p>
              </div>

              <div className="text-2xl font-bold text-foreground">{pkg.price}</div>

              <Button
                className="w-full gap-2"
                variant="emerald"
                onClick={() => setShowNope(true)}
              >
                <Gem className="w-4 h-4" />
                Buy Now
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmeraldShop;
