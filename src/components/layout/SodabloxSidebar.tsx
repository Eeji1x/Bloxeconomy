import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Home, ShoppingBag, User, ArrowLeftRight, Gift, Users,
  Shield, Menu, X, Gem, LogOut, LogIn, Trophy, Settings,
  Mail, Package, Bell
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const topTabs = [
  { to: '/catalog', label: 'Catalog' },
  { to: '/trading', label: 'Trade' },
  { to: '/leaderboards', label: 'Leaderboard' },
  { to: '/sodamons', label: 'Sodamons' },
];

const sidebarLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/avatar', label: 'Avatar Editor', icon: User },
  { to: '/trading', label: 'Trade', icon: ArrowLeftRight },
  { to: '/leaderboards', label: 'Leaderboard', icon: Trophy },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const secondaryLinks = [
  { to: '/users', label: 'Players', icon: Users },
  { to: '/friends', label: 'Friends', icon: Users, authOnly: true },
  { to: '/inbox', label: 'Inbox', icon: Mail, authOnly: true },
  { to: '/promocodes', label: 'Codes', icon: Gift },
];

export const SodabloxSidebar = () => {
  const { user, profile, isAdmin, isOwner, isEconomyManager, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const SidebarLink = ({ link, closeMobile = false }: { link: { to: string; label: string; icon: any; authOnly?: boolean }; closeMobile?: boolean }) => {
    if (link.authOnly && !user) return null;
    const Icon = link.icon;
    const isActive = location.pathname === link.to;

    return (
      <Link
        to={link.to}
        onClick={closeMobile ? () => setSidebarOpen(false) : undefined}
        className={cn(
          'flex items-center gap-3 px-5 py-[10px] text-[13px] font-medium transition-colors border-l-[3px]',
          isActive
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
        )}
      >
        <Icon className="w-[18px] h-[18px] shrink-0" />
        <span>{link.label}</span>
      </Link>
    );
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      <div className="flex flex-col pt-3">
        {sidebarLinks.map((l) => (
          <SidebarLink key={l.label} link={l} closeMobile={mobile} />
        ))}
      </div>

      <div className="mx-5 my-2 border-t border-border" />

      <div className="flex flex-col">
        {secondaryLinks.map((l) => (
          <SidebarLink key={l.label} link={l} closeMobile={mobile} />
        ))}
      </div>

      {(isAdmin || isOwner || isEconomyManager) && (
        <>
          <div className="mx-5 my-2 border-t border-border" />
          <Link
            to="/admin"
            onClick={mobile ? () => setSidebarOpen(false) : undefined}
            className={cn(
              'flex items-center gap-3 px-5 py-[10px] text-[13px] font-medium transition-colors border-l-[3px]',
              location.pathname.startsWith('/admin')
                ? 'border-destructive bg-destructive/10 text-destructive'
                : 'border-transparent text-destructive/70 hover:bg-destructive/5 hover:text-destructive'
            )}
          >
            <Shield className="w-[18px] h-[18px] shrink-0" />
            <span>{isAdmin ? 'Admin Panel' : 'Economy Panel'}</span>
          </Link>
        </>
      )}

      <div className="flex-1" />

      <div className="px-5 py-3 border-t border-border">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          SODABLOX Platform
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* ─── Top Bar ─── */}
      <nav className="sodablox-topbar sticky top-0 z-50 h-[60px] flex items-center px-4 gap-0 bg-card border-b border-primary/20">
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-2 rounded hover:bg-muted transition-colors mr-2"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 mr-6 group">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center font-bold text-primary-foreground text-sm">
              S
            </div>
          </div>
          <span className="font-bold text-lg gradient-text hidden sm:block" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            SODABLOX
          </span>
        </Link>

        {/* Top tabs */}
        <div className="hidden md:flex items-center gap-0 h-full">
          {topTabs.map((tab) => {
            const isActive = location.pathname === tab.to;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  'flex items-center h-full px-4 text-[14px] font-semibold transition-colors border-b-[3px]',
                  isActive
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 border-transparent'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search bar */}
        <div className="hidden lg:flex max-w-[320px] mr-3">
          <div className="flex w-full h-[32px] rounded overflow-hidden">
            <input
              type="text"
              placeholder="Search"
              className="w-[200px] px-3 text-[13px] bg-muted text-foreground placeholder-muted-foreground border-none outline-none"
            />
            <button className="px-3 flex items-center justify-center bg-primary transition-colors">
              <svg className="w-[14px] h-[14px] text-primary-foreground" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5">
          {user && profile && (
            <>
              {/* Emerald counter */}
              <div className="emerald-display">
                <Gem className="w-4 h-4 text-accent" />
                <span className="font-bold text-accent-foreground">{profile.emeralds.toLocaleString()}</span>
              </div>

              {/* Notifications */}
              <Link to="/inbox" className="p-2 rounded hover:bg-muted transition-colors">
                <Bell className="w-[18px] h-[18px] text-muted-foreground" />
              </Link>

              {/* Profile avatar */}
              <Link to={`/profile/${profile.user_id}`} className="p-2 rounded hover:bg-muted transition-colors">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {profile.username[0]?.toUpperCase()}
                </div>
              </Link>
            </>
          )}

          {user ? (
            <button
              onClick={handleSignOut}
              className="p-2 rounded hover:bg-muted transition-colors"
              title="Logout"
            >
              <LogOut className="w-[18px] h-[18px] text-muted-foreground" />
            </button>
          ) : (
            <Link
              to="/login"
              className="ml-1 px-5 py-1.5 rounded bg-primary text-primary-foreground text-[13px] font-semibold transition-colors hover:bg-primary/90"
            >
              Log In
            </Link>
          )}
        </div>
      </nav>

      {/* ─── Sidebar - Desktop ─── */}
      <aside className="sodablox-sidebar hidden lg:flex fixed left-0 top-[60px] bottom-0 w-[200px] z-40 flex-col overflow-y-auto bg-card border-r border-border">
        <SidebarContent />
      </aside>

      {/* ─── Sidebar - Mobile overlay ─── */}
      {sidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-[60px] bottom-0 w-[200px] z-50 flex flex-col overflow-y-auto bg-card border-r border-border">
            <SidebarContent mobile />
          </aside>
        </>
      )}
    </>
  );
};
