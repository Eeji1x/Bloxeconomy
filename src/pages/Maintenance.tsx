import { Link } from 'react-router-dom';
import { AlertTriangle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Maintenance = () => {
  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center cyber-grid">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-destructive/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center space-y-8 max-w-lg mx-auto px-6">
        <div className="w-24 h-24 mx-auto rounded-2xl bg-destructive/20 border border-destructive/30 flex items-center justify-center">
          <AlertTriangle className="w-12 h-12 text-destructive" />
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-display font-bold gradient-text">
            SODABLOX
          </h1>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Under Maintenance
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            SODABLOX is currently under maintenance. The site will be back online soon.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse delay-150" />
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse delay-300" />
        </div>

        <Link to="/login">
          <Button variant="outline" className="gap-2 mt-4">
            <LogIn className="w-4 h-4" />
            Admin Login
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Maintenance;
