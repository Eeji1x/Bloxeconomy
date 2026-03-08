import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, User, Lock, AlertCircle, Sparkles, Key } from 'lucide-react';
import { validateUsername } from '@/lib/profanity';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteKey, setInviteKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!inviteKey.trim()) {
      setError('Invite key is required');
      return;
    }

    // Validate username with profanity filter
    const validation = validateUsername(username);
    if (!validation.valid) {
      setError(validation.message || 'Invalid username');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(username, password, inviteKey.trim().toUpperCase());
      if (error) {
        if (error.message.includes('duplicate')) {
          setError('Username already taken');
        } else {
          setError(error.message);
        }
      } else {
        navigate('/');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Roblox 2008 themed signup ──
  if (theme === 'roblox2008') {
    return (
      <div className="max-w-[400px] mx-auto py-6">
        <div className="rbx08-panel">
          <div className="rbx08-panel-header">Create a SODABLOX Account</div>
          <div className="rbx08-panel-body">
            <p className="text-[11px] text-[#666] mb-3">
              SODABLOX is free! Fill out the form below to get started. You need an invite key.
            </p>

            {error && (
              <div className="bg-[#fee] border border-[#c00] rounded p-2 mb-3">
                <span className="text-[11px] text-[#c00] font-bold">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#333] mb-1">Invite Key:</label>
                <input
                  type="text"
                  placeholder="INV-XXXXX-XXXXX"
                  value={inviteKey}
                  onChange={(e) => setInviteKey(e.target.value.toUpperCase())}
                  className="w-full border border-[#C3C3C3] rounded-[3px] px-2 py-1.5 text-[12px] font-mono bg-white focus:border-[#4A6EA9] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#333] mb-1">Character Name:</label>
                <input
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border border-[#C3C3C3] rounded-[3px] px-2 py-1.5 text-[12px] bg-white focus:border-[#4A6EA9] outline-none"
                  required
                  maxLength={20}
                />
                <span className="text-[9px] text-[#999]">3-20 characters, letters and numbers only</span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#333] mb-1">Password:</label>
                <input
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-[#C3C3C3] rounded-[3px] px-2 py-1.5 text-[12px] bg-white focus:border-[#4A6EA9] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#333] mb-1">Confirm Password:</label>
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-[#C3C3C3] rounded-[3px] px-2 py-1.5 text-[12px] bg-white focus:border-[#4A6EA9] outline-none"
                  required
                />
              </div>
              <div style={{ background: '#E6E6E6', border: '1px solid #C3C3C3', borderRadius: 3, padding: 8 }}>
                <span style={{ fontSize: 11, color: '#003399' }}>✨ New players receive 100 free Emeralds!</span>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="rbx08-btn-primary w-full py-2"
              >
                {isLoading ? 'Creating account...' : 'Sign Up!'}
              </button>
            </form>

            <p className="text-[10px] text-[#666] mt-3 text-center">
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#003399' }}>Log in here</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Default / other themes ──
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent mb-4">
            <UserPlus className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold">Join SODABLOX</h1>
          <p className="text-muted-foreground">Create your account with an invite key</p>
        </div>

        {/* Bonus Banner */}
        <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-accent/10 border border-accent/30">
          <Sparkles className="w-5 h-5 text-accent" />
          <span className="text-sm text-accent font-medium">
            New players receive 100 free Emeralds!
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="cyber-card p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteKey" className="text-sm font-medium">Invite Key</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="inviteKey" type="text" placeholder="INV-XXXXX-XXXXX" value={inviteKey} onChange={(e) => setInviteKey(e.target.value.toUpperCase())} className="pl-10 h-12 bg-input border-border focus:border-primary font-mono" required />
              </div>
              <p className="text-xs text-muted-foreground">You need a valid invite key to create an account</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="username" type="text" placeholder="Choose a unique username" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10 h-12 bg-input border-border focus:border-primary" required maxLength={20} />
              </div>
              <p className="text-xs text-muted-foreground">3-20 characters, letters and numbers only</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="password" type="password" placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-12 bg-input border-border focus:border-primary" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="confirmPassword" type="password" placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 h-12 bg-input border-border focus:border-primary" required />
              </div>
            </div>
          </div>

          <Button type="submit" variant="neon" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              <><UserPlus className="w-5 h-5" />Create Account</>
            )}
          </Button>
        </form>

        <p className="text-center text-muted-foreground">
          Already have an account?{' '}
          <Link to="/signup" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
