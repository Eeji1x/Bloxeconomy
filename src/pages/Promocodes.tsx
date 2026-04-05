import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, Gem, Package, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Promocode {
  id: string;
  code: string;
  emerald_reward: number;
  item_reward_id: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
}

const Promocodes = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const is2016 = theme === 'roblox2016' || theme === 'roblox2015';
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [redeemedCodes, setRedeemedCodes] = useState<string[]>([]);

  useEffect(() => {
    const fetchPromocodes = async () => {
      const { data } = await supabase
        .from('promocodes')
        .select('*')
        .eq('is_active', true);
      
      if (data) {
        setPromocodes(data);
      }

      // Fetch user's redeemed codes
      if (user) {
        const { data: redemptions } = await supabase
          .from('promocode_redemptions')
          .select('promocode_id')
          .eq('user_id', user.id);
        
        if (redemptions) {
          setRedeemedCodes(redemptions.map(r => r.promocode_id));
        }
      }
    };

    fetchPromocodes();
  }, [user]);

  const handleRedeem = async () => {
    if (!user || !profile) {
      toast.error('Please log in to redeem codes');
      return;
    }

    if (!code.trim()) {
      toast.error('Please enter a code');
      return;
    }

    setIsRedeeming(true);

    try {
      const { data, error } = await supabase.functions.invoke('redeem-promocode', {
        body: { code: code.trim() },
      });

      if (error) {
        // For FunctionsHttpError, parse the response body for the actual message
        let message = 'Failed to redeem code';
        try {
          const context = error.context;
          if (context && typeof context.json === 'function') {
            const body = await context.json();
            message = body?.error || message;
          } else {
            message = error.message || message;
          }
        } catch {
          message = error.message || message;
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);

      await refreshProfile();
      setCode('');
      
      // Refresh redeemed codes list
      const { data: redemptions } = await supabase
        .from('promocode_redemptions')
        .select('promocode_id')
        .eq('user_id', user.id);
      if (redemptions) {
        setRedeemedCodes(redemptions.map(r => r.promocode_id));
      }
      
      toast.success(
        data?.emerald_reward > 0
          ? `Successfully redeemed ${data.emerald_reward} Emeralds!`
          : 'Successfully redeemed your reward!'
      );
    } catch (error: any) {
      console.error('Redeem error:', error);
      toast.error(error.message || 'Failed to redeem code');
    } finally {
      setIsRedeeming(false);
    }
  };

  if (is2016) {
    return (
      <div style={{ maxWidth: 700 }}>
        <div className="rbx16-panel" style={{ marginBottom: 12 }}>
          <div className="rbx16-panel-header">Promo Codes</div>
          <div className="rbx16-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#666' }}>Enter a promo code below to receive free rewards!</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="ENTER-CODE-HERE"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                style={{ flex: 1, padding: '6px 10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2 }}
              />
              <button className="rbx16-btn-buy" onClick={handleRedeem} disabled={isRedeeming || !user} style={{ opacity: (isRedeeming || !user) ? 0.5 : 1 }}>
                {isRedeeming ? '...' : 'Redeem'}
              </button>
            </div>
            {!user && <p style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>Please log in to redeem codes</p>}
          </div>
        </div>

        {promocodes.length > 0 && (
          <div className="rbx16-panel">
            <div className="rbx16-panel-header">Available Codes</div>
            <div className="rbx16-panel-body" style={{ padding: 0 }}>
              {promocodes.map((promo) => {
                const isRedeemed = redeemedCodes.includes(promo.id);
                const isMaxed = promo.max_uses !== null && promo.current_uses >= promo.max_uses;
                return (
                  <div key={promo.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #e8e8e8', opacity: isRedeemed ? 0.5 : 1 }}>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>{promo.code}</div>
                      <div style={{ fontSize: 12, color: '#666', display: 'flex', gap: 8, marginTop: 2 }}>
                        {promo.emerald_reward > 0 && <span>💎 {promo.emerald_reward}</span>}
                        {promo.item_reward_id && <span>📦 Item</span>}
                        {promo.max_uses !== null && <span>{promo.current_uses}/{promo.max_uses} uses</span>}
                      </div>
                    </div>
                    <div>
                      {isRedeemed ? (
                        <span style={{ color: '#02b757', fontSize: 12, fontWeight: 600 }}>✓ Redeemed</span>
                      ) : isMaxed ? (
                        <span style={{ color: '#cc3333', fontSize: 12, fontWeight: 600 }}>Expired</span>
                      ) : (
                        <button className="rbx16-btn-continue" style={{ fontSize: 12, padding: '3px 10px' }} onClick={() => { setCode(promo.code); handleRedeem(); }} disabled={!user}>Use</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-primary mb-4">
          <Gift className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-display font-bold">Promocodes</h1>
        <p className="text-muted-foreground">Redeem codes for free rewards!</p>
      </div>

      {/* Redeem Form */}
      <div className="cyber-card p-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Enter Code</label>
            <div className="flex gap-3">
              <Input
                placeholder="ENTER-CODE-HERE"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="h-12 bg-input border-border font-mono uppercase tracking-wider"
              />
              <Button
                variant="neon"
                size="lg"
                onClick={handleRedeem}
                disabled={isRedeeming || !user}
                className="px-8"
              >
                {isRedeeming ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  'Redeem'
                )}
              </Button>
            </div>
          </div>
          
          {!user && (
            <p className="text-sm text-muted-foreground text-center">
              Please log in to redeem codes
            </p>
          )}
        </div>
      </div>

      {/* Active Codes */}
      {promocodes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-display font-semibold">Available Codes</h2>
          <div className="grid gap-3">
            {promocodes.map((promo) => {
              const isRedeemed = redeemedCodes.includes(promo.id);
              const isMaxed = promo.max_uses !== null && promo.current_uses >= promo.max_uses;
              
              return (
                <div
                  key={promo.id}
                  className={`cyber-card flex items-center justify-between ${isRedeemed ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <div className="font-mono font-bold tracking-wider">{promo.code}</div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {promo.emerald_reward > 0 && (
                          <span className="flex items-center gap-1">
                            <Gem className="w-4 h-4 text-accent" />
                            {promo.emerald_reward}
                          </span>
                        )}
                        {promo.item_reward_id && (
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4 text-primary" />
                            Item
                          </span>
                        )}
                        {promo.max_uses !== null && (
                          <span>
                            {promo.current_uses}/{promo.max_uses} uses
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    {isRedeemed ? (
                      <span className="flex items-center gap-1 text-accent text-sm font-medium">
                        <Check className="w-4 h-4" />
                        Redeemed
                      </span>
                    ) : isMaxed ? (
                      <span className="flex items-center gap-1 text-destructive text-sm font-medium">
                        <X className="w-4 h-4" />
                        Expired
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCode(promo.code);
                          handleRedeem();
                        }}
                        disabled={!user}
                      >
                        Use
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Promocodes;
