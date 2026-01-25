import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { ArrowLeftRight, Construction } from 'lucide-react';

const Trading = () => {
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
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-primary mb-4">
          <ArrowLeftRight className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-display font-bold">Trading</h1>
        <p className="text-muted-foreground">Trade limited items and emeralds with other players</p>
      </div>

      {/* Coming Soon */}
      <div className="cyber-card p-12 text-center">
        <Construction className="w-16 h-16 mx-auto mb-6 text-primary animate-pulse" />
        <h2 className="text-2xl font-display font-bold mb-2">Coming Soon</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          The trading system is currently under development. You'll be able to trade limited items and emeralds with other players soon!
        </p>
      </div>

      {/* Features Preview */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="cyber-card p-6 text-center opacity-60">
          <h3 className="font-display font-bold mb-2">Send Trades</h3>
          <p className="text-sm text-muted-foreground">Create trade offers to other players</p>
        </div>
        <div className="cyber-card p-6 text-center opacity-60">
          <h3 className="font-display font-bold mb-2">Trade Limiteds</h3>
          <p className="text-sm text-muted-foreground">Exchange limited items with collectors</p>
        </div>
        <div className="cyber-card p-6 text-center opacity-60">
          <h3 className="font-display font-bold mb-2">Add Emeralds</h3>
          <p className="text-sm text-muted-foreground">Include emeralds in your trades</p>
        </div>
      </div>
    </div>
  );
};

export default Trading;
