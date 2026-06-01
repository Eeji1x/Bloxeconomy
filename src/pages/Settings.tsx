import { useState, useEffect } from 'react';
import { validateUsername } from '@/lib/profanity';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Settings as SettingsIcon,
  User,
  Lock,
  Gem,
  Save,
  AlertCircle,
  Check,
  Crown,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme, THEMES } from '@/contexts/ThemeContext';
import { isRccModeEnabled, setRccMode } from '@/pages/Games';

type SettingsSection = 'username' | 'password' | 'builders_club' | 'themes' | 'rcc';

type BcTier = 'classic' | 'turbo' | 'outrageous';
interface BcSubscription {
  tier: BcTier;
  active: boolean;
  expires_at: string | null;
}

const BC_TIERS: { id: BcTier; name: string; daily: number; cost: number; color: string }[] = [
  { id: 'classic', name: 'Builders Club', daily: 130, cost: 1500, color: '#22ff88' },
  { id: 'turbo', name: 'Turbo Builders Club', daily: 200, cost: 2500, color: '#ff9d2e' },
  { id: 'outrageous', name: 'Outrageous Builders Club', daily: 300, cost: 4000, color: '#ff35d6' },
];

const Settings = () => {
  const { user, profile, isLoading, refreshProfile, signOut } = useAuth();
  const { theme } = useTheme();
  const [activeSection, setActiveSection] = useState<SettingsSection>('username');
  const [hasGamesBeta, setHasGamesBeta] = useState(false);
  const [rccOn, setRccOn] = useState<boolean>(isRccModeEnabled());
  const [bc, setBc] = useState<BcSubscription | null>(null);
  const [bcLoading, setBcLoading] = useState<BcTier | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('beta_access')
      .select('id')
      .eq('user_id', user.id)
      .eq('feature', 'games')
      .maybeSingle()
      .then(({ data }) => setHasGamesBeta(!!data));

    // Load Builders Club subscription
    (supabase as any)
      .from('builders_club_subscriptions')
      .select('tier, active, expires_at')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: { data: BcSubscription | null }) => setBc(data));
  }, [user]);

  const refreshBc = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from('builders_club_subscriptions')
      .select('tier, active, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();
    setBc(data);
  };

  const handleActivateBc = async (tier: BcTier) => {
    if (!profile) return;
    const tierInfo = BC_TIERS.find(t => t.id === tier)!;
    if (profile.emeralds < tierInfo.cost) {
      toast.error(`Need ${tierInfo.cost} emeralds to activate ${tierInfo.name}`);
      return;
    }
    setBcLoading(tier);
    try {
      const { data, error } = await supabase.rpc('activate_builders_club', { p_tier: tier });
      if (error) throw error;
      const result = data as { success: boolean; message?: string };
      if (!result?.success) {
        toast.error(result?.message || 'Activation failed');
        return;
      }
      toast.success(`${tierInfo.name} activated! +${tierInfo.daily} emeralds/day for 30 days.`);
      await refreshProfile();
      await refreshBc();
    } catch (err) {
      console.error(err);
      toast.error('Failed to activate Builders Club');
    } finally {
      setBcLoading(null);
    }
  };

  const toggleRcc = () => {
    const next = !rccOn;
    setRccOn(next);
    setRccMode(next);
    toast.success(next ? 'RCC Mode enabled' : 'RCC Mode disabled');
  };
  
  const [newUsername, setNewUsername] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const USERNAME_CHANGE_COST = 1000;
  // Theme is forced to 'sodablox' (futuristic) — classic layouts are dead code.
  const isClassic = false;
  const is2015 = false;
  const handleSelectTheme = (_id: string) => { /* theme switching disabled */ };
  void theme;

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

  const handleUsernameChange = async () => {
    setUsernameError('');
    if (!newUsername.trim()) { setUsernameError('Please enter a new username'); return; }
    if (newUsername.length < 3 || newUsername.length > 20) { setUsernameError('Username must be 3-20 characters'); return; }
    if (!/^[a-zA-Z0-9]+$/.test(newUsername)) { setUsernameError('Username can only contain letters and numbers'); return; }
    const profanityCheck = validateUsername(newUsername);
    if (!profanityCheck.valid) { setUsernameError(profanityCheck.message || 'Username is not allowed'); return; }
    if (profile.emeralds < USERNAME_CHANGE_COST) { setUsernameError(`You need ${USERNAME_CHANGE_COST} emeralds to change your username`); return; }

    setUsernameLoading(true);
    try {
      const validationResponse = await supabase.functions.invoke('validate-username', { body: { username: newUsername } });
      if (validationResponse.error || !validationResponse.data?.valid) { setUsernameError(validationResponse.data?.message || 'Username is not allowed'); setUsernameLoading(false); return; }
      if (validationResponse.data?.replaced) { setUsernameError('Username contains inappropriate content and is not allowed'); setUsernameLoading(false); return; }

      // Use the change_username RPC (bypasses the restrict_profile_self_update trigger).
      const { data: rpcResult, error: rpcError } = await supabase.rpc('change_username', { p_new_username: newUsername });
      if (rpcError) throw rpcError;
      const result = rpcResult as { success: boolean; message?: string };
      if (!result?.success) {
        setUsernameError(result?.message || 'Failed to change username.');
        setUsernameLoading(false);
        return;
      }

      // Update the auth email so subsequent logins use the new username-derived email.
      const newEmail = `${newUsername.toLowerCase()}@sodablox.local`;
      await supabase.auth.updateUser({ email: newEmail });

      toast.success('Username changed! You will be signed out — log back in with your new username.');
      setNewUsername('');
      await refreshProfile();

      // Force re-login with the new username on the web client.
      setTimeout(async () => {
        try { localStorage.removeItem('force_logout_version'); } catch { /* ignore */ }
        await signOut();
        window.location.href = '/login';
      }, 1500);
    } catch (error) {
      console.error('Error changing username:', error);
      setUsernameError('Failed to change username. Please try again.');
    } finally {
      setUsernameLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    if (!currentPassword || !newPassword || !confirmPassword) { setPasswordError('Please fill in all fields'); return; }
    if (newPassword.length < 6) { setPasswordError('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match'); return; }

    setPasswordLoading(true);
    try {
      const email = `${profile.username.toLowerCase()}@sodablox.local`;
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (signInError) { setPasswordError('Current password is incorrect'); setPasswordLoading(false); return; }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password changed successfully!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError('Failed to change password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Theme switching is permanently disabled.
  void THEMES;

  /* ═══════════════════════════════════════════
     ROBLOX 2016 SETTINGS LAYOUT
     ═══════════════════════════════════════════ */
  if (isClassic) {
    const accentColor = is2015 ? '#E2231A' : '#0074BD';
    const panelClass = is2015 ? 'rbx15-panel' : 'rbx16-panel';
    const panelHeaderClass = is2015 ? 'rbx15-panel-header' : 'rbx16-panel-header';
    const panelBodyClass = is2015 ? 'rbx15-panel-body' : 'rbx16-panel-body';
    const textMutedClass = is2015 ? 'rbx15-text-muted' : 'rbx16-text-muted';
    const btnBuyClass = is2015 ? 'rbx15-btn-buy' : 'rbx16-btn-buy';
    const btnContinueClass = is2015 ? 'rbx15-btn-continue' : 'rbx16-btn-continue';
    const btnCancelClass = is2015 ? 'rbx15-btn-cancel' : 'rbx16-btn-cancel';
    const TABS: { key: SettingsSection; label: string }[] = [
      { key: 'username', label: 'Username' },
      { key: 'password', label: 'Password' },
      { key: 'themes', label: 'Themes' },
      ...(hasGamesBeta ? [{ key: 'rcc' as const, label: 'RCC' }] : []),
    ];

    return (
      <div style={{ maxWidth: 700 }}>
        {/* ECS myAccount2016: h1 "My Settings" */}
        <h1 className="rbx16-page-title">My Settings</h1>

        {/* ECS tabs2016: inset box-shadow tabs */}
        <div className="rbx16-tabs2016" style={{ marginBottom: 12 }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`rbx16-tab2016 ${activeSection === tab.key ? 'rbx16-tab2016-active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Username */}
        {activeSection === 'username' && (
          <div className="rbx16-panel">
            <div className="rbx16-panel-header">Change Username</div>
            <div className="rbx16-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p className="rbx16-text-muted">Changing your username costs <strong>{USERNAME_CHANGE_COST} emeralds</strong>.</p>
              <div style={{ padding: '8px 12px', background: '#f8f8f8', border: '1px solid #e0e0e0' }}>
                <span style={{ fontSize: 13, color: '#666' }}>Your balance: </span>
                <strong style={{ color: '#02b757' }}>💎 {profile.emeralds.toLocaleString()}</strong>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }}>Current Username</label>
                <input type="text" value={profile.username} disabled style={{ width: '100%', padding: '6px 8px', background: '#f2f2f2' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }}>New Username</label>
                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Enter new username" maxLength={20} style={{ width: '100%', padding: '6px 8px' }} />
              </div>
              {usernameError && <p style={{ color: '#cc3333', fontSize: 13 }}>⚠ {usernameError}</p>}
              <button
                className="rbx16-btn-buy"
                onClick={handleUsernameChange}
                disabled={usernameLoading || profile.emeralds < USERNAME_CHANGE_COST}
                style={{ opacity: (usernameLoading || profile.emeralds < USERNAME_CHANGE_COST) ? 0.5 : 1 }}
              >
                {usernameLoading ? 'Changing...' : `Change Username (${USERNAME_CHANGE_COST} 💎)`}
              </button>
            </div>
          </div>
        )}

        {/* Password */}
        {activeSection === 'password' && (
          <div className="rbx16-panel">
            <div className="rbx16-panel-header">Change Password</div>
            <div className="rbx16-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }}>Current Password</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" style={{ width: '100%', padding: '6px 8px' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }}>New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password (min 6 characters)" style={{ width: '100%', padding: '6px 8px' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }}>Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" style={{ width: '100%', padding: '6px 8px' }} />
              </div>
              {passwordError && <p style={{ color: '#cc3333', fontSize: 13 }}>⚠ {passwordError}</p>}
              <button
                className="rbx16-btn-continue"
                onClick={handlePasswordChange}
                disabled={passwordLoading}
                style={{ opacity: passwordLoading ? 0.5 : 1 }}
              >
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        )}

        {/* Themes */}
        {activeSection === 'themes' && (
          <div>
            <div className="rbx16-panel" style={{ marginBottom: 12 }}>
              <div className="rbx16-panel-header">Appearance</div>
              <div className="rbx16-panel-body">
                <p className="rbx16-text-muted">Choose how BloxEconomy looks for you.</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {THEMES.map((t) => {
                const isActive = theme === t.id;
                return (
                  <div
                    key={t.id}
                    style={{
                      background: '#fff',
                      border: isActive ? '2px solid #0074BD' : '1px solid #c3c3c3',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ height: 100, position: 'relative', background: t.preview.bg }}>
                      <div style={{ height: 28, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6, background: t.preview.navbar }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>BloxEconomy</span>
                      </div>
                      <div style={{ display: 'flex', height: 'calc(100% - 28px)' }}>
                        <div style={{ width: 36, background: t.preview.navbar, padding: '6px 4px' }}>
                          {[1,2,3].map(i => <div key={i} style={{ height: 4, marginBottom: 3, borderRadius: 1, background: i===1 ? t.preview.accent : 'rgba(255,255,255,0.15)' }} />)}
                        </div>
                        <div style={{ flex: 1, padding: 6 }}>
                          <div style={{ height: 4, width: 30, borderRadius: 1, background: t.preview.text, opacity: 0.3, marginBottom: 4 }} />
                          <div style={{ height: 4, width: 40, borderRadius: 1, background: t.preview.text, opacity: 0.15 }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{t.description}</div>
                      <button
                        className={isActive ? 'rbx16-btn-cancel' : 'rbx16-btn-continue'}
                        style={{ width: '100%', opacity: isActive ? 0.6 : 1 }}
                        onClick={() => handleSelectTheme(t.id)}
                        disabled={isActive}
                      >
                        {isActive ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RCC Mode (only if user has games beta access) */}
        {activeSection === 'rcc' && hasGamesBeta && (
          <div className="rbx16-panel">
            <div className="rbx16-panel-header">RCC Mode (Beta)</div>
            <div className="rbx16-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p className="rbx16-text-muted">
                <strong>RCC Mode</strong> enables high-fidelity rendering in the Games client:
                real-time shadows, ACES tone mapping, atmospheric fog, and a sharper higher-DPI render.
                Costs more performance — recommended for desktops with a discrete GPU.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8f8f8', border: '1px solid #e0e0e0' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Status</div>
                  <div style={{ fontSize: 12, color: rccOn ? '#02b757' : '#999' }}>
                    {rccOn ? '● Enabled — high fidelity' : '○ Disabled — standard rendering'}
                  </div>
                </div>
                <button className={rccOn ? 'rbx16-btn-cancel' : 'rbx16-btn-buy'} onClick={toggleRcc}>
                  {rccOn ? 'Turn Off' : 'Turn On'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: '#999' }}>
                Saved locally to this device. Changes take effect next time you join a game.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     DEFAULT BloxEconomy LAYOUT
     ═══════════════════════════════════════════ */
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-4 flex-wrap">
        <Button variant={activeSection === 'username' ? 'default' : 'ghost'} onClick={() => setActiveSection('username')} className="gap-2">
          <User className="w-4 h-4" /> Username
        </Button>
        <Button variant={activeSection === 'password' ? 'default' : 'ghost'} onClick={() => setActiveSection('password')} className="gap-2">
          <Lock className="w-4 h-4" /> Password
        </Button>
        <Button variant={activeSection === 'builders_club' ? 'default' : 'ghost'} onClick={() => setActiveSection('builders_club')} className="gap-2">
          <Crown className="w-4 h-4" /> Builders Club
        </Button>
        {/* Theme switching temporarily disabled (bugged) */}
        {hasGamesBeta && (
          <Button variant={activeSection === 'rcc' ? 'default' : 'ghost'} onClick={() => setActiveSection('rcc')} className="gap-2">
            <Zap className="w-4 h-4" /> RCC
          </Button>
        )}
      </div>

      {/* Username */}
      {activeSection === 'username' && (
        <div className="cyber-card p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold">Change Username</h2>
            <p className="text-sm text-muted-foreground">
              Changing your username costs <span className="text-primary font-semibold">{USERNAME_CHANGE_COST} emeralds</span>
            </p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Gem className="w-5 h-5 text-primary" />
            <span className="text-sm">Your balance:</span>
            <span className="font-bold text-primary">{profile.emeralds.toLocaleString()}</span>
            {profile.emeralds >= USERNAME_CHANGE_COST && <Check className="w-4 h-4 text-green-500 ml-auto" />}
          </div>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Current Username</Label><Input value={profile.username} disabled className="bg-muted/50" /></div>
            <div className="space-y-2"><Label htmlFor="newUsername">New Username</Label><Input id="newUsername" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Enter new username" maxLength={20} /></div>
            {usernameError && <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="w-4 h-4" />{usernameError}</div>}
            <Button onClick={handleUsernameChange} disabled={usernameLoading || profile.emeralds < USERNAME_CHANGE_COST} className="w-full">
              {usernameLoading ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Change Username ({USERNAME_CHANGE_COST} 💎)</>}
            </Button>
          </div>
        </div>
      )}

      {/* Password */}
      {activeSection === 'password' && (
        <div className="cyber-card p-6 space-y-6">
          <div className="space-y-2"><h2 className="text-xl font-display font-bold">Change Password</h2><p className="text-sm text-muted-foreground">Update your account password</p></div>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="currentPassword">Current Password</Label><Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" /></div>
            <div className="space-y-2"><Label htmlFor="newPassword">New Password</Label><Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password (min 6 characters)" /></div>
            <div className="space-y-2"><Label htmlFor="confirmPassword">Confirm New Password</Label><Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" /></div>
            {passwordError && <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="w-4 h-4" />{passwordError}</div>}
            <Button onClick={handlePasswordChange} disabled={passwordLoading} className="w-full">
              {passwordLoading ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><Lock className="w-4 h-4 mr-2" />Change Password</>}
            </Button>
          </div>
        </div>
      )}

      {/* Themes section disabled */}
      {activeSection === 'themes' && (
        <div className="cyber-card p-6">
          <h2 className="text-xl font-display font-bold mb-2">Themes</h2>
          <p className="text-sm text-muted-foreground">
            Theme switching is temporarily disabled while we fix layout issues across era replicas.
            The futuristic default theme is the only available option for now.
          </p>
        </div>
      )}

      {/* Builders Club */}
      {activeSection === 'builders_club' && (
        <div className="space-y-4">
          <div className="cyber-card p-6 space-y-3">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-400" /> Builders Club
            </h2>
            <p className="text-sm text-muted-foreground">
              Builders Club replaces the old flat 100/day grant. Activate a tier to receive
              your daily emerald payout. Subscriptions last <strong>30 days</strong>.
            </p>
            {bc && bc.active && bc.expires_at && new Date(bc.expires_at) > new Date() ? (
              <div
                className="p-3 rounded-lg flex items-center gap-3 border"
                style={{
                  borderColor: BC_TIERS.find(t => t.id === bc.tier)?.color,
                  background: `${BC_TIERS.find(t => t.id === bc.tier)?.color}15`,
                }}
              >
                <Crown className="w-5 h-5" style={{ color: BC_TIERS.find(t => t.id === bc.tier)?.color }} />
                <div className="flex-1">
                  <div className="font-bold">
                    Active: {BC_TIERS.find(t => t.id === bc.tier)?.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Expires {new Date(bc.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Daily payout</div>
                  <div className="font-bold text-green-400">
                    +{BC_TIERS.find(t => t.id === bc.tier)?.daily}/day
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-muted/20 border border-border text-sm text-muted-foreground">
                You are not currently a Builders Club member. Pick a tier below to activate.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BC_TIERS.map(tier => {
              const isActive = bc?.tier === tier.id && bc?.active;
              const canAfford = profile.emeralds >= tier.cost;
              return (
                <div
                  key={tier.id}
                  className="cyber-card p-5 flex flex-col gap-3 transition-all"
                  style={{
                    borderColor: isActive ? tier.color : undefined,
                    boxShadow: isActive ? `0 0 24px ${tier.color}55` : undefined,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5" style={{ color: tier.color }} />
                    <h3 className="font-bold" style={{ color: tier.color }}>{tier.name}</h3>
                  </div>
                  <div className="text-3xl font-bold">
                    +{tier.daily} <Gem className="w-5 h-5 inline-block text-primary" />
                  </div>
                  <div className="text-xs text-muted-foreground -mt-2">per day</div>
                  <div className="text-sm flex items-center gap-1.5">
                    <Gem className="w-4 h-4 text-primary" />
                    {tier.cost.toLocaleString()} for 30 days
                  </div>
                  <Button
                    onClick={() => handleActivateBc(tier.id)}
                    disabled={bcLoading === tier.id || !canAfford}
                    className="w-full mt-auto"
                    style={{ background: tier.color, color: '#0a0a1a' }}
                  >
                    {bcLoading === tier.id
                      ? 'Activating...'
                      : isActive
                      ? 'Extend +30 Days'
                      : canAfford
                      ? 'Activate'
                      : 'Not enough emeralds'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RCC Mode (default layout) */}
      {activeSection === 'rcc' && hasGamesBeta && (
        <div className="cyber-card p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" /> RCC Mode <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">Beta</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Enables high-fidelity rendering in the Games client: real-time shadows, ACES tone mapping,
              atmospheric fog, and a sharper higher-DPI render. Costs more performance.
            </p>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
            <div>
              <div className="font-bold">Status</div>
              <div className={`text-xs ${rccOn ? 'text-green-400' : 'text-muted-foreground'}`}>
                {rccOn ? '● Enabled — high fidelity' : '○ Disabled — standard rendering'}
              </div>
            </div>
            <Button onClick={toggleRcc} variant={rccOn ? 'destructive' : 'default'}>
              {rccOn ? 'Turn Off' : 'Turn On'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Saved locally to this device. Changes take effect next time you join a game.
          </p>
        </div>
      )}
    </div>
  );
};

export default Settings;
