import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldX, LogOut, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const Banned = () => {
  const { profile, signOut, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // If not banned, redirect to home
  if (!profile?.is_banned) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="max-w-lg w-full space-y-6">
        {/* Ban Card */}
        <div className="cyber-card p-8 text-center space-y-6 border-destructive/50">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/20 border-2 border-destructive/50">
            <ShieldX className="w-10 h-10 text-destructive" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-bold text-destructive">
              Account Suspended
            </h1>
            <p className="text-muted-foreground">
              Your account has been banned from BloxEconomy
            </p>
          </div>

          {/* Ban Details */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-3 text-left">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Reason</p>
                <p className="text-sm text-muted-foreground">
                  {profile.ban_reason || 'No reason provided'}
                </p>
              </div>
            </div>

            {profile.banned_at && (
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Banned On</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(profile.banned_at), 'MMMM d, yyyy \'at\' h:mm a')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Appeal Info */}
          <div className="bg-muted/30 rounded-lg p-4 text-left">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Think this was a mistake?</strong>
              <br />
              If you believe your ban was issued in error, please contact the BloxEconomy support team
              through our official Discord server or support email. Include your username and 
              any relevant information in your appeal.
            </p>
          </div>

          {/* Logout Button */}
          <Button 
            variant="destructive" 
            size="lg" 
            onClick={signOut}
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </div>

        {/* Username Display */}
        <p className="text-center text-sm text-muted-foreground">
          Logged in as <span className="font-medium text-foreground">@{profile.username}</span>
        </p>
      </div>
    </div>
  );
};

export default Banned;
