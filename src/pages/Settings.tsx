import { useState } from 'react';
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
  Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme, THEMES, ThemeId } from '@/contexts/ThemeContext';

const Settings = () => {
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<'username' | 'password' | 'themes'>('username');
  
  // Username change state
  const [newUsername, setNewUsername] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const USERNAME_CHANGE_COST = 1000;

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
    
    if (!newUsername.trim()) {
      setUsernameError('Please enter a new username');
      return;
    }

    if (newUsername.length < 3 || newUsername.length > 20) {
      setUsernameError('Username must be 3-20 characters');
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(newUsername)) {
      setUsernameError('Username can only contain letters and numbers');
      return;
    }

    const profanityCheck = validateUsername(newUsername);
    if (!profanityCheck.valid) {
      setUsernameError(profanityCheck.message || 'Username is not allowed');
      return;
    }

    if (profile.emeralds < USERNAME_CHANGE_COST) {
      setUsernameError(`You need ${USERNAME_CHANGE_COST} emeralds to change your username`);
      return;
    }

    setUsernameLoading(true);

    try {
      const validationResponse = await supabase.functions.invoke('validate-username', {
        body: { username: newUsername },
      });

      if (validationResponse.error || !validationResponse.data?.valid) {
        setUsernameError(validationResponse.data?.message || 'Username is not allowed');
        setUsernameLoading(false);
        return;
      }

      if (validationResponse.data?.replaced) {
        setUsernameError('Username contains inappropriate content and is not allowed');
        setUsernameLoading(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          username: newUsername,
          emeralds: profile.emeralds - USERNAME_CHANGE_COST 
        })
        .eq('user_id', user.id);

      if (error) throw error;

      const newEmail = `${newUsername.toLowerCase()}@sodablox.local`;
      await supabase.auth.updateUser({ email: newEmail });

      toast.success('Username changed successfully!');
      setNewUsername('');
      await refreshProfile();
    } catch (error) {
      console.error('Error changing username:', error);
      setUsernameError('Failed to change username. Please try again.');
    } finally {
      setUsernameLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);

    try {
      const email = `${profile.username.toLowerCase()}@sodablox.local`;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInError) {
        setPasswordError('Current password is incorrect');
        setPasswordLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      if (error) throw error;

      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError('Failed to change password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSelectTheme = (id: ThemeId) => {
    setTheme(id);
    toast.success(`Theme changed to ${THEMES.find(t => t.id === id)?.name}`);
  };

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

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-border pb-4">
        <Button
          variant={activeSection === 'username' ? 'default' : 'ghost'}
          onClick={() => setActiveSection('username')}
          className="gap-2"
        >
          <User className="w-4 h-4" />
          Username
        </Button>
        <Button
          variant={activeSection === 'password' ? 'default' : 'ghost'}
          onClick={() => setActiveSection('password')}
          className="gap-2"
        >
          <Lock className="w-4 h-4" />
          Password
        </Button>
        <Button
          variant={activeSection === 'themes' ? 'default' : 'ghost'}
          onClick={() => setActiveSection('themes')}
          className="gap-2"
        >
          <Palette className="w-4 h-4" />
          Themes
        </Button>
      </div>

      {/* Username Section */}
      {activeSection === 'username' && (
        <div className="cyber-card p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold">Change Username</h2>
            <p className="text-sm text-muted-foreground">
              Changing your username costs <span className="text-accent font-semibold">{USERNAME_CHANGE_COST} emeralds</span>
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Gem className="w-5 h-5 text-accent" />
            <span className="text-sm">Your balance:</span>
            <span className="font-bold text-accent">{profile.emeralds.toLocaleString()}</span>
            {profile.emeralds >= USERNAME_CHANGE_COST && (
              <Check className="w-4 h-4 text-green-500 ml-auto" />
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Username</Label>
              <Input value={profile.username} disabled className="bg-muted/50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newUsername">New Username</Label>
              <Input
                id="newUsername"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter new username"
                maxLength={20}
              />
            </div>

            {usernameError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {usernameError}
              </div>
            )}

            <Button
              onClick={handleUsernameChange}
              disabled={usernameLoading || profile.emeralds < USERNAME_CHANGE_COST}
              className="w-full"
            >
              {usernameLoading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Change Username ({USERNAME_CHANGE_COST} 💎)
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Password Section */}
      {activeSection === 'password' && (
        <div className="cyber-card p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold">Change Password</h2>
            <p className="text-sm text-muted-foreground">
              Update your account password
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {passwordError}
              </div>
            )}

            <Button
              onClick={handlePasswordChange}
              disabled={passwordLoading}
              className="w-full"
            >
              {passwordLoading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Themes Section */}
      {activeSection === 'themes' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold">Themes</h2>
            <p className="text-sm text-muted-foreground">
              Choose how SODABLOX looks for you
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {THEMES.map((t) => {
              const isActive = theme === t.id;
              return (
                <div
                  key={t.id}
                  className={`cyber-card p-4 space-y-3 transition-all ${
                    isActive ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  {/* Theme Preview */}
                  <div
                    className="rounded-lg overflow-hidden border border-border h-28 relative"
                    style={{ background: t.preview.bg }}
                  >
                    {/* Mini navbar */}
                    <div
                      className="h-7 flex items-center px-3 gap-2"
                      style={{ background: t.id === 'roblox2020' ? '#2d3436' : '#0a0a1a' }}
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{ background: t.preview.accent }}
                      />
                      <div
                        className="h-2 w-12 rounded"
                        style={{ background: t.preview.text, opacity: 0.3 }}
                      />
                      <div
                        className="h-2 w-8 rounded ml-auto"
                        style={{ background: t.preview.text, opacity: 0.2 }}
                      />
                    </div>
                    {/* Mini content */}
                    <div className="p-2 flex gap-2">
                      <div
                        className="rounded w-1/2 h-14 p-2"
                        style={{ background: t.preview.card, border: `1px solid ${t.preview.accent}22` }}
                      >
                        <div
                          className="h-2 w-10 rounded mb-1.5"
                          style={{ background: t.preview.text, opacity: 0.5 }}
                        />
                        <div
                          className="h-2 w-14 rounded"
                          style={{ background: t.preview.text, opacity: 0.2 }}
                        />
                      </div>
                      <div
                        className="rounded w-1/2 h-14 p-2"
                        style={{ background: t.preview.card, border: `1px solid ${t.preview.accent}22` }}
                      >
                        <div
                          className="h-2 w-8 rounded mb-1.5"
                          style={{ background: t.preview.accent, opacity: 0.7 }}
                        />
                        <div
                          className="h-2 w-12 rounded"
                          style={{ background: t.preview.text, opacity: 0.2 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Theme Info */}
                  <div>
                    <h3 className="font-display font-bold text-sm">{t.name}</h3>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>

                  {/* Select Button */}
                  <Button
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handleSelectTheme(t.id)}
                    disabled={isActive}
                  >
                    {isActive ? (
                      <>
                        <Check className="w-4 h-4" />
                        Selected
                      </>
                    ) : (
                      'Select'
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
