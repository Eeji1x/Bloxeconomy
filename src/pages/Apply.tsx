import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, ArrowLeft, CheckCircle, RefreshCw, ShieldCheck, Search, Clock, XCircle } from 'lucide-react';

// Word list for spelling challenge
const CHALLENGE_WORDS = [
  'adventure', 'emerald', 'fortress', 'guardian', 'kingdom',
  'mystery', 'phoenix', 'treasure', 'warrior', 'catalyst',
  'diamond', 'eclipse', 'nebula', 'quantum', 'zenith',
  'crystal', 'horizon', 'paradox', 'vortex', 'summit',
];

// Generate a random captcha code
const generateCaptcha = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const getRandomWord = () => CHALLENGE_WORDS[Math.floor(Math.random() * CHALLENGE_WORDS.length)];

const Apply = () => {
  const [username, setUsername] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  // Custom captcha state
  const [captchaCode, setCaptchaCode] = useState(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState('');

  // Spelling challenge state
  const [challengeWord, setChallengeWord] = useState(getRandomWord);
  const [wordInput, setWordInput] = useState('');

  const refreshCaptcha = useCallback(() => {
    setCaptchaCode(generateCaptcha());
    setCaptchaInput('');
  }, []);

  const refreshWord = useCallback(() => {
    setChallengeWord(getRandomWord());
    setWordInput('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !reason.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (username.length < 3 || username.length > 20) {
      toast.error('Username must be 3-20 characters');
      return;
    }
    if (reason.length < 20) {
      toast.error('Please write at least 20 characters about yourself');
      return;
    }

    // Verify captcha
    if (captchaInput.trim().toUpperCase() !== captchaCode) {
      toast.error('Captcha code is incorrect. Try again.');
      refreshCaptcha();
      return;
    }

    // Verify spelling challenge
    if (wordInput.trim().toLowerCase() !== challengeWord.toLowerCase()) {
      toast.error('Spelling challenge incorrect. Try again.');
      refreshWord();
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if already applied
      const { data: existing } = await supabase
        .from('applications')
        .select('id, status, short_id')
        .eq('username', username.trim())
        .maybeSingle();

      if (existing) {
        if (existing.status === 'pending') {
          toast.error('You already have a pending application');
        } else if (existing.status === 'accepted') {
          toast.error('Your application was already accepted!');
        } else {
          // Rejected — allow reapply
          const { error } = await supabase
            .from('applications')
            .update({ reason: reason.trim(), status: 'pending', reject_reason: null, reviewed_at: null, reviewed_by: null })
            .eq('id', existing.id);
          if (error) throw error;
          setApplicationId(existing.short_id);
          setSubmitted(true);
          toast.success('Application resubmitted!');
        }
        setIsSubmitting(false);
        return;
      }

      // Generate short_id
      const shortId = 'APP-' + Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      const { data, error } = await supabase
        .from('applications')
        .insert({ username: username.trim(), reason: reason.trim(), short_id: shortId })
        .select('short_id')
        .single();

      if (error) throw error;
      setApplicationId(data?.short_id || shortId);
      setSubmitted(true);
      toast.success('Application submitted!');
    } catch (err: any) {
      toast.error('Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <CheckCircle className="w-16 h-16 text-accent mx-auto" />
          <h1 className="text-3xl font-display font-bold">Application Submitted!</h1>
          {applicationId && (
            <div className="cyber-card p-4">
              <p className="text-sm text-muted-foreground mb-1">Your Application ID:</p>
              <p className="text-lg font-mono font-bold text-primary">{applicationId}</p>
            </div>
          )}
          <p className="text-muted-foreground">
            Your application is under review. If accepted, you'll receive a one-time registration link to create your account.
          </p>
          <Link to="/auth">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-2">
          <FileText className="w-12 h-12 text-primary mx-auto" />
          <h1 className="text-3xl font-display font-bold">
            Apply to <span className="gradient-text">SODABLOX</span>
          </h1>
          <p className="text-muted-foreground">
            Fill out this application to request access. An admin will review it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="cyber-card p-6 space-y-5">
          {/* Username */}
          <div className="space-y-2">
            <Label>Desired Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username (3-20 characters)"
              maxLength={20}
            />
          </div>

          {/* About yourself */}
          <div className="space-y-2">
            <Label>Tell us about yourself</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Who are you? Why do you want to join SODABLOX? Tell us about yourself... (min 20 characters)"
              rows={5}
            />
            <p className="text-xs text-muted-foreground">{reason.length}/500 characters</p>
          </div>

          {/* Custom Captcha */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Verification
            </Label>
            <div className="flex items-center gap-3">
              <div
                className="select-none px-4 py-3 rounded-md border border-border bg-muted/50 font-mono text-lg font-bold tracking-[0.3em] text-primary"
                style={{
                  letterSpacing: '0.35em',
                  textShadow: '1px 1px 2px hsl(var(--primary) / 0.3)',
                  userSelect: 'none',
                  background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, hsl(var(--muted) / 0.3) 3px, hsl(var(--muted) / 0.3) 4px)',
                }}
              >
                {captchaCode.split('').map((char, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      transform: `rotate(${Math.random() * 20 - 10}deg) translateY(${Math.random() * 4 - 2}px)`,
                    }}
                  >
                    {char}
                  </span>
                ))}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={refreshCaptcha}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <Input
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              placeholder="Type the code above"
              maxLength={6}
            />
          </div>

          {/* Spelling Challenge */}
          <div className="space-y-2">
            <Label>Spell this word correctly</Label>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-md border border-border bg-muted/50">
                <span className="text-lg font-bold text-accent tracking-wide">
                  {challengeWord.split('').map((char, i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-block',
                        opacity: Math.random() > 0.3 ? 1 : 0.6,
                        fontStyle: Math.random() > 0.7 ? 'italic' : 'normal',
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </span>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={refreshWord}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <Input
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              placeholder="Type the word shown above"
            />
          </div>

          <Button type="submit" variant="neon" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </form>

        <div className="text-center">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Apply;
