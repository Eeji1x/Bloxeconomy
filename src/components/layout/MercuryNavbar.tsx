import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Home, ShoppingBag, User, ArrowLeftRight, Gift, Users,
  Shield, Menu, X, Gem, LogOut, LogIn, Trophy, Settings,
  Mail, Bell, Search
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

export const MercuryNavbar = () => {
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
          'merc-sidebar-link',
          isActive && 'merc-sidebar-link-active'
        )}
      >
        <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />
        <span>{link.label}</span>
      </Link>
    );
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 12 }}>
        {sidebarLinks.map((l) => (
          <SidebarLink key={l.label} link={l} closeMobile={mobile} />
        ))}
      </div>

      <div className="merc-sidebar-divider" />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {secondaryLinks.map((l) => (
          <SidebarLink key={l.label} link={l} closeMobile={mobile} />
        ))}
      </div>

      {(isAdmin || isOwner || isEconomyManager) && (
        <>
          <div className="merc-sidebar-divider" />
          <Link
            to="/admin"
            onClick={mobile ? () => setSidebarOpen(false) : undefined}
            className={cn(
              'merc-sidebar-link merc-sidebar-link-admin',
              location.pathname.startsWith('/admin') && 'merc-sidebar-link-active'
            )}
          >
            <Shield style={{ width: 18, height: 18, flexShrink: 0 }} />
            <span>{isAdmin ? 'Admin Panel' : isOwner ? 'Owner Panel' : 'Economy Panel'}</span>
          </Link>
        </>
      )}

      <div style={{ flex: 1 }} />

      <div className="merc-sidebar-footer">
        SODABLOX Platform
      </div>
    </div>
  );

  return (
    <>
      {/* ─── Top Bar ─── */}
      <nav className="merc-topbar">
        <div className="merc-topbar-container">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="merc-hamburger"
          >
            {sidebarOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
          </button>

          {/* Logo */}
          <Link to="/" className="merc-logo">
            <div className="merc-logo-icon">S</div>
            <span className="merc-logo-text" style={{ display: 'none' }}>SODABLOX</span>
          </Link>

          {/* Top tabs */}
          <div className="merc-nav-links">
            {topTabs.map((tab) => {
              const isActive = location.pathname === tab.to;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn('merc-nav-link', isActive && 'merc-nav-link-active')}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Search */}
          <div className="merc-search-wrapper">
            <input
              type="text"
              placeholder="Search..."
              className="merc-search-input"
            />
            <div className="merc-search-icon">
              <Search style={{ width: 14, height: 14 }} />
            </div>
          </div>

          {/* Right controls */}
          <div className="merc-right-area">
            {user && profile && (
              <>
                <div className="merc-currency">
                  <Gem style={{ width: 14, height: 14, color: 'hsl(270 100% 66%)' }} />
                  <span>{profile.emeralds.toLocaleString()}</span>
                </div>

                <Link to="/inbox" className="merc-icon-btn" style={{ textDecoration: 'none' }}>
                  <Bell style={{ width: 18, height: 18 }} />
                </Link>

                <Link to={`/profile/${profile.user_id}`} style={{ textDecoration: 'none' }}>
                  <div className="merc-avatar-btn">
                    {profile.username[0]?.toUpperCase()}
                  </div>
                </Link>
              </>
            )}

            {user ? (
              <button onClick={handleSignOut} className="merc-icon-btn" title="Logout">
                <LogOut style={{ width: 18, height: 18 }} />
              </button>
            ) : (
              <Link to="/login" className="merc-login-btn">
                Log In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Show SODABLOX text on larger screens */}
      <style>{`
        @media(min-width: 640px) {
          [data-theme="mercury"] .merc-logo-text { display: inline !important; }
        }
      `}</style>

      {/* ─── Sidebar - Desktop ─── */}
      <aside
        className="merc-sidebar"
        style={{ top: 56, display: 'none' }}
      >
        <SidebarContent />
      </aside>
      <style>{`
        @media(min-width: 1024px) {
          [data-theme="mercury"] .merc-sidebar { display: flex !important; }
        }
      `}</style>

      {/* ─── Sidebar - Mobile overlay ─── */}
      {sidebarOpen && (
        <>
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              zIndex: 40, display: 'block'
            }}
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="merc-sidebar lg:hidden"
            style={{ top: 56, display: 'flex', zIndex: 50 }}
          >
            <SidebarContent mobile />
          </aside>
        </>
      )}
    </>
  );
};
