import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { UserPlus, Users, UserMinus, Check, X } from 'lucide-react';

const Friends = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <UserPlus className="w-8 h-8 text-primary" />
          Friends
        </h1>
        <p className="text-muted-foreground">Manage your friends and friend requests</p>
      </div>

      {/* Tabs */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="cyber-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="font-bold">Friends</div>
              <div className="text-sm text-muted-foreground">0 friends</div>
            </div>
          </div>
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            No friends yet
          </div>
        </div>

        <div className="cyber-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-bold">Incoming</div>
              <div className="text-sm text-muted-foreground">0 requests</div>
            </div>
          </div>
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            No pending requests
          </div>
        </div>

        <div className="cyber-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <div className="font-bold">Outgoing</div>
              <div className="text-sm text-muted-foreground">0 sent</div>
            </div>
          </div>
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            No sent requests
          </div>
        </div>
      </div>

      {/* How to add friends */}
      <div className="cyber-card p-6">
        <h2 className="font-display font-bold mb-4">How to Add Friends</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold">1</span>
            </div>
            <p>Visit a user's profile from the Users page</p>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold">2</span>
            </div>
            <p>Click the "Add Friend" button on their profile</p>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold">3</span>
            </div>
            <p>Wait for them to accept your request</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Friends;
