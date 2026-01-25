import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { User, Package } from 'lucide-react';

const Avatar = () => {
  const { user, profile, isLoading } = useAuth();

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

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <User className="w-8 h-8 text-primary" />
          Avatar Editor
        </h1>
        <p className="text-muted-foreground">Customize your avatar with items from your inventory</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Avatar Preview */}
        <div className="cyber-card p-8">
          <h2 className="font-display font-bold mb-4">Preview</h2>
          <div className="aspect-[3/4] rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
            <img
              src="https://static.wikia.nocookie.net/roblox/images/7/7e/R15_Noob.png"
              alt="Your Avatar"
              className="w-full h-full object-contain p-4"
            />
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Default Noob Avatar
          </p>
        </div>

        {/* Inventory */}
        <div className="lg:col-span-2 cyber-card p-8">
          <h2 className="font-display font-bold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Your Inventory
          </h2>
          
          <div className="min-h-[300px] flex items-center justify-center">
            <div className="text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-bold text-muted-foreground">No Items Yet</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Purchase items from the catalog to customize your avatar
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Avatar;
