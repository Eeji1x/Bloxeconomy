import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, ArrowLeft, CheckCircle } from 'lucide-react';

const Apply = () => {
  const [username, setUsername] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
      toast.error('Please write at least 20 characters explaining why you want to join');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if already applied
      const { data: existing } = await supabase
        .from('applications')
        .select('id, status')
        .eq('username', username.trim())
        .maybeSingle();

      if (existing) {
        if (existing.status === 'pending') {
          toast.error('You already have a pending application');
        } else if (existing.status === 'accepted') {
          toast.error('Your application was already accepted! You can sign up.');
        } else {
          // Rejected - allow reapply by updating
          const { error } = await supabase
            .from('applications')
            .update({ reason: reason.trim(), status: 'pending', reject_reason: null, reviewed_at: null, reviewed_by: null })
            .eq('id', existing.id);
          if (error) throw error;
          setSubmitted(true);
          toast.success('Application resubmitted!');
        }
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('applications')
        .insert({ username: username.trim(), reason: reason.trim() });

      if (error) throw error;
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
          <p className="text-muted-foreground">
            Your application has been submitted for review. An admin will review it shortly. 
            Check back later to see if you've been accepted.
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

        <form onSubmit={handleSubmit} className="cyber-card p-6 space-y-4">
          <div className="space-y-2">
            <Label>Desired Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username (3-20 characters)"
              maxLength={20}
            />
          </div>
          <div className="space-y-2">
            <Label>Why do you want to join?</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell us why you'd like to join SODABLOX... (min 20 characters)"
              rows={5}
            />
            <p className="text-xs text-muted-foreground">{reason.length}/500 characters</p>
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
