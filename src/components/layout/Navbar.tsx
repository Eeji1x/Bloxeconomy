import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { 
  Home, 
  ShoppingBag, 
  User, 
  ArrowLeftRight, 
  Gift, 
  Users, 
  UserPlus,
  Shield,
  Menu,
  X,
  Gem,
  LogOut,
  LogIn,
  Trophy,
  Settings,
  Mail
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/catalog', label: 'Catalog', icon: ShoppingBag },
  { to: '/avatar', label: 'Avatar', icon: User },
  { to: '/trading', label: 'Trading', icon: ArrowLeftRight },
  { to: '/promocodes', label: 'Codes', icon: Gift },
  { to: '/inbox', label: 'Inbox', icon: Mail },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/leaderboards', label: 'Top', icon: Trophy },
];

export const Navbar = () => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-primary/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center font-display font-bold text-primary-foreground text-lg shadow-lg group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)] transition-shadow">
                S
              </div>
              <div className="absolute -inset-1 rounded-lg bg-gradient-to-br from-primary via-secondary to-accent opacity-30 blur-sm group-hover:opacity-50 transition-opacity -z-10" />
            </div>
            <span className="font-display font-bold text-xl gradient-text hidden sm:block">
              SODABLOX
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-primary/20 text-primary shadow-[0_0_10px_hsl(var(--primary)/0.3)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            
            {isAdmin && (
              <Link
                to="/admin"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                  location.pathname === '/admin'
                    ? "bg-destructive/20 text-destructive shadow-[0_0_10px_hsl(var(--destructive)/0.3)]"
                    : "text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                )}
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </Link>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {user && profile && (
              <>
                {/* Emerald Balance */}
                <div className="emerald-display">
                  <Gem className="w-4 h-4 text-accent" />
                  <span className="font-bold text-accent-foreground">{profile.emeralds.toLocaleString()}</span>
                </div>
                
                {/* Online Status */}
                <div className="flex items-center gap-2">
                  <div className="online-dot" />
                  <span className="text-sm text-muted-foreground hidden md:block">Online</span>
                </div>
              </>
            )}

            {/* Auth Buttons */}
            {user ? (
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden md:flex">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm" className="hidden md:flex">
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-foreground" />
              ) : (
                <Menu className="w-6 h-6 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-primary/20 animate-fade-up">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300",
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
              
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <Shield className="w-5 h-5" />
                  <span>Admin Panel</span>
                </Link>
              )}

              <div className="border-t border-primary/20 mt-2 pt-2">
                {user ? (
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-primary hover:bg-primary/10"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>Login</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
