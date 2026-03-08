import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserPlus, Lock, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { validateUsername } from '@/lib/profanity';

const Register = () => {
  const { token } = useParams<{ token: string }>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      if (!token) { setIsValidating(false); return; }
      try {
        const res = await supabase.functions.invoke('register-with-token', {
          body: { action: 'validate', token },
        });
        setTokenValid(res.data?.valid === true);
      } catch {
        setTokenValid(false);
      }
      setIsValidating(false);
    };
    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      const res = await supabase.functions.invoke('register-with-token', {
        body: { action: 'register', token, username: username.trim(), password },
      });
      if (res.data?.success) {
        setSuccess(true);
        toast.success('Account created!');
      } else {
        setError(res.data?.message || 'Registration failed');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Validating registration link...</p>
        </div>
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <XCircle className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-3xl font-display font-bold">Invalid Link</h1>
          <p className="text-muted-foreground">This registration link is invalid or has already been used.</p>
          <Link to="/auth"><Button variant="outline">Back to Home</Button></Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <CheckCircle className="w-16 h-16 text-accent mx-auto" />
          <h1 className="text-3xl font-display font-bold">Account Created!</h1>
          <p className="text-muted-foreground">Your SODABLOX account has been created. You can now log in.</p>
          <Link to="/login"><Button variant="neon" className="gap-2"><UserPlus className="w-4 h-4" /> Go to Login</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent mb-4">
            <UserPlus className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold">Create Your Account</h1>
          <p className="text-muted-foreground">Your application was approved! Set up your account below.</p>
        </div>

        <form onSubmit={handleSubmit} className="cyber-card p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="username" type="text" placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10 h-12 bg-input border-border focus:border-primary" maxLength={20} required />
              </div>
              <p className="text-xs text-muted-foreground">3-20 characters, letters, numbers, and underscores</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="password" type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-12 bg-input border-border focus:border-primary" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
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
              <><UserPlus className="w-5 h-5" /> Create Account</>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Register;
