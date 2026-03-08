import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════
   2016 ROBLOX Navbar — Pixel-perfect replica
   Reference: roblox.com circa 2016 (Source Sans Pro era)
   
   Structure (from real 2016 source):
   ┌─────────────────────────────────────────────────────────┐
   │ [☰] [ROBLOX logo]  Games Catalog Develop Robux  [🔍] [R$] [⚙] │
   └─────────────────────────────────────────────────────────┘
   Sidebar: 175px, #f2f2f2, left-fixed
   ═══════════════════════════════════════════════════════════════ */

// Real 2016 sidebar had these exact links
const sidebarLinks = [
  { to: '/', label: 'Home', icon: 'icon-nav-home', hoverClass: 'hover-icon-nav-home' },
  { to: '/profile', label: 'Profile', icon: 'icon-nav-profile', hoverClass: 'hover-icon-nav-profile', needsAuth: true },
  { to: '/inbox', label: 'Messages', icon: 'icon-nav-message', hoverClass: '', needsAuth: true },
  { to: '/friends', label: 'Friends', icon: 'icon-nav-friends', hoverClass: '', needsAuth: true },
  { to: '/avatar', label: 'Character', icon: 'icon-nav-charactercustomizer', hoverClass: 'hover-icon-nav-charactercustomizer' },
  { to: '/catalog', label: 'Inventory', icon: 'icon-nav-inventory', hoverClass: 'hover-icon-nav-inventory' },
  { to: '/trading', label: 'Trade', icon: 'icon-nav-trade', hoverClass: '' },
  { to: '/users', label: 'Players', icon: 'icon-nav-group', hoverClass: '' },
  { to: '/leaderboards', label: 'Leaderboards', icon: 'icon-nav-forum', hoverClass: '' },
  { to: '/promocodes', label: 'Promo Codes', icon: 'icon-nav-shop', hoverClass: '' },
  { to: '/settings', label: 'Settings', icon: 'icon-nav-settings', hoverClass: '' },
];

export const Roblox2016Navbar = () => {
  const { user, profile, isAdmin, isOwner, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const profileLink = profile ? `/profile/${profile.user_id}` : '/profile';

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    if (settingsOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [settingsOpen]);

  /* ── Sidebar Link ── */
  const SideLink = ({ link, mobile = false }: { link: typeof sidebarLinks[0]; mobile?: boolean }) => {
    if (link.needsAuth && !user) return null;
    const to = link.label === 'Profile' ? profileLink : link.to;
    const isActive = location.pathname === to || (link.to === '/' && location.pathname === '/');

    return (
      <Link
        to={to}
        onClick={mobile ? () => setSidebarOpen(false) : undefined}
        className={cn(
          'rbx16-sidebar-link',
          link.hoverClass,
          isActive && 'rbx16-sidebar-link-active'
        )}
      >
        <span className={link.icon} />
        <span className="rbx16-sidebar-label">{link.label}</span>
      </Link>
    );
  };

  /* ── Sidebar Panel ── */
  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="rbx16-sidebar-inner">
      {/* Real 2016 had username at top of sidebar */}
      {user && profile && (
        <>
          <p className="rbx16-sidebar-username">{profile.username}</p>
          <div className="rbx16-sidebar-divider" />
        </>
      )}
      <nav className="rbx16-sidebar-nav">
        {sidebarLinks.map(l => (
          <SideLink key={l.label} link={l} mobile={mobile} />
        ))}
      </nav>
      {(isAdmin || isOwner) && (
        <>
          <div className="rbx16-sidebar-divider" />
          <Link
            to="/admin"
            onClick={mobile ? () => setSidebarOpen(false) : undefined}
            className={cn(
              'rbx16-sidebar-link rbx16-sidebar-link-admin',
              location.pathname.startsWith('/admin') && 'rbx16-sidebar-link-active'
            )}
          >
            <span className="icon-nav-settings" />
            <span className="rbx16-sidebar-label">Admin Panel</span>
          </Link>
        </>
      )}
      {/* Real 2016: "Upgrade Now" / BC button at bottom */}
      <Link to="/catalog" className="rbx16-upgrade-btn">
        Avatar Shop
      </Link>
    </div>
  );

  return (
    <>
      {/* ─── Top Navbar ─── Real 2016: #0074BD, height ~45px */}
      <nav className="rbx16-topbar">
        <div className="rbx16-topbar-container">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rbx16-hamburger"
            aria-label="Toggle menu"
          >
            <span className="icon-nav-menu" />
          </button>

          {/* Logo — Real 2016 used the ROBLOX wordmark image */}
          <Link to="/" className="rbx16-logo">
            <span className="rbx16-logo-text">SODABLOX</span>
          </Link>

          {/* Nav links — Real 2016: Games, Catalog, Develop, ROBUX */}
          <div className="rbx16-nav-links">
            <Link to="/catalog" className={cn('rbx16-nav-link', location.pathname === '/catalog' && 'rbx16-nav-link-active')}>Catalog</Link>
            <Link to="/trading" className={cn('rbx16-nav-link', location.pathname === '/trading' && 'rbx16-nav-link-active')}>Trade</Link>
            <Link to="/leaderboards" className={cn('rbx16-nav-link', location.pathname === '/leaderboards' && 'rbx16-nav-link-active')}>Leaderboards</Link>
            <Link to="/sodamons" className={cn('rbx16-nav-link', location.pathname === '/sodamons' && 'rbx16-nav-link-active')}>Sodamons</Link>
          </div>

          <div className="flex-1" />

          {/* Search bar — Real 2016: white translucent input */}
          <div className="rbx16-search-wrapper">
            <input
              type="text"
              placeholder="Search"
              className="rbx16-search-input"
            />
            <span className="rbx16-search-icon">
              <span className="icon-nav-search" />
            </span>
          </div>

          {/* Right side — Real 2016: ROBUX amount, settings gear, notifications */}
          <div className="rbx16-right-area">
            {user && profile ? (
              <>
                {/* Emerald/Robux display */}
                <Link to="/emeralds" className="rbx16-currency">
                  <span className="icon-nav-robux" />
                  <span className="rbx16-currency-amount">{profile.emeralds.toLocaleString()}</span>
                </Link>

                {/* Settings gear with dropdown */}
                <div className="relative" ref={settingsRef}>
                  <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className="rbx16-settings-btn"
                    aria-label="Settings"
                  >
                    <span className="icon-nav-settings" />
                  </button>
                  {settingsOpen && (
                    <div className="rbx16-settings-dropdown">
                      <Link 
                        to="/settings" 
                        onClick={() => setSettingsOpen(false)} 
                        className="rbx16-dropdown-item"
                      >
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          setSettingsOpen(false);
                          handleSignOut();
                        }}
                        className="rbx16-dropdown-item"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/signup" className="rbx16-signup-btn">Sign Up</Link>
                <Link to="/login" className="rbx16-login-btn">Login</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Desktop Sidebar ─── */}
      <aside className="rbx16-sidebar hidden lg:flex">
        <Sidebar />
      </aside>

      {/* ─── Mobile Sidebar ─── */}
      {sidebarOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setSidebarOpen(false)} />
          <aside className="lg:hidden rbx16-sidebar rbx16-sidebar-mobile">
            <Sidebar mobile />
          </aside>
        </>
      )}
    </>
  );
};
