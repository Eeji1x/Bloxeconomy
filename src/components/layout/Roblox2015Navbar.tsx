import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════
   SODABLOX 2015 Theme — Dark charcoal topbar (#393B3D)
   Sidebar: #f2f2f2 175px, same icon sprite as 2016
   Mixed from multiple 2015 Roblox source recreations
   ═══════════════════════════════════════════════════ */

const sidebarLinks = [
  { to: '/', label: 'Home', icon: 'icon-nav-home', hoverClass: 'hover-icon-nav-home' },
  { to: '/profile', label: 'Profile', icon: 'icon-nav-profile', hoverClass: 'hover-icon-nav-profile', needsAuth: true },
  { to: '/inbox', label: 'Messages', icon: 'icon-nav-message', hoverClass: '', needsAuth: true },
  { to: '/friends', label: 'Friends', icon: 'icon-nav-friends', hoverClass: '', needsAuth: true },
  { to: '/avatar', label: 'Character', icon: 'icon-nav-charactercustomizer', hoverClass: 'hover-icon-nav-charactercustomizer' },
  { to: '/catalog', label: 'Catalog', icon: 'icon-nav-inventory', hoverClass: 'hover-icon-nav-inventory' },
  { to: '/trading', label: 'Trade', icon: 'icon-nav-trade', hoverClass: '' },
  { to: '/users', label: 'Players', icon: 'icon-nav-group', hoverClass: '' },
  { to: '/leaderboards', label: 'Leaderboards', icon: 'icon-nav-forum', hoverClass: '' },
  { to: '/promocodes', label: 'Promo Codes', icon: 'icon-nav-shop', hoverClass: '' },
  { to: '/settings', label: 'Settings', icon: 'icon-nav-settings', hoverClass: '' },
];

export const Roblox2015Navbar = () => {
  const { user, profile, isAdmin, isOwner, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const profileLink = profile ? `/profile/${profile.user_id}` : '/profile';

  const SideLink = ({ link, mobile = false }: { link: typeof sidebarLinks[0]; mobile?: boolean }) => {
    if (link.needsAuth && !user) return null;
    const to = link.label === 'Profile' ? profileLink : link.to;
    const isActive = location.pathname === to || (link.to === '/' && location.pathname === '/');

    return (
      <Link
        to={to}
        onClick={mobile ? () => setSidebarOpen(false) : undefined}
        className={cn(
          'rbx15-sidebar-link',
          link.hoverClass,
          isActive && 'rbx15-sidebar-link-active'
        )}
      >
        <span className={link.icon} />
        <span className="rbx15-sidebar-label">{link.label}</span>
      </Link>
    );
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="rbx15-sidebar-inner">
      {user && profile && (
        <>
          <p className="rbx15-sidebar-username">{profile.username}</p>
          <div className="rbx15-sidebar-divider" />
        </>
      )}
      <nav className="rbx15-sidebar-nav">
        {sidebarLinks.map(l => (
          <SideLink key={l.label} link={l} mobile={mobile} />
        ))}
      </nav>
      {(isAdmin || isOwner) && (
        <>
          <div className="rbx15-sidebar-divider" />
          <Link
            to="/admin"
            onClick={mobile ? () => setSidebarOpen(false) : undefined}
            className={cn(
              'rbx15-sidebar-link rbx15-sidebar-link-admin',
              location.pathname.startsWith('/admin') && 'rbx15-sidebar-link-active'
            )}
          >
            <span className="icon-nav-settings" />
            <span className="rbx15-sidebar-label">Admin Panel</span>
          </Link>
        </>
      )}
      <Link to="/catalog" className="rbx15-upgrade-btn">
        Avatar Shop
      </Link>
    </div>
  );

  return (
    <>
      {/* ─── Top Navbar ─── #393B3D dark charcoal (2015 signature) */}
      <nav className="rbx15-topbar">
        <div className="rbx15-topbar-container">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rbx15-hamburger"
          >
            <span className="icon-nav-menu" />
          </button>

          {/* Logo — Red ROBLOX-style text (2015 signature) */}
          <Link to="/" className="rbx15-logo">
            <span className="rbx15-logo-text">SODABLOX</span>
          </Link>

          {/* Nav links */}
          <div className="rbx15-nav-links">
            <Link to="/catalog" className="rbx15-nav-link">Catalog</Link>
            <Link to="/trading" className="rbx15-nav-link">Trade</Link>
            <Link to="/leaderboards" className="rbx15-nav-link">Leaderboards</Link>
            <Link to="/sodamons" className="rbx15-nav-link">Sodamons</Link>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="rbx15-search-wrapper">
            <input
              type="text"
              placeholder="Search"
              className="rbx15-search-input"
            />
            <span className="rbx15-search-icon">
              <span className="icon-nav-search" />
            </span>
          </div>

          {/* Right area */}
          <div className="rbx15-right-area">
            {user && profile ? (
              <>
                {/* Currency display */}
                <Link to="/emeralds" className="rbx15-currency">
                  <span className="icon-nav-robux" />
                  <span>{profile.emeralds.toLocaleString()}</span>
                </Link>

                {/* Settings gear with dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className="rbx15-nav-link"
                    style={{ padding: '4px' }}
                  >
                    <span className="icon-nav-settings" />
                  </button>
                  {settingsOpen && (
                    <div className="rbx15-settings-dropdown">
                      <p>
                        <Link to="/settings" onClick={() => setSettingsOpen(false)} style={{ color: '#1e1e1f' }}>
                          Settings
                        </Link>
                      </p>
                      <p>
                        <a
                          onClick={(e) => {
                            e.preventDefault();
                            setSettingsOpen(false);
                            handleSignOut();
                          }}
                          style={{ color: '#1e1e1f', cursor: 'pointer' }}
                        >
                          Logout
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/signup" className="rbx15-nav-link">Sign Up</Link>
                <Link to="/login" className="rbx15-nav-link rbx15-login-btn">Login</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Sidebar Desktop ─── */}
      <aside className="rbx15-sidebar hidden lg:flex">
        <Sidebar />
      </aside>

      {/* ─── Sidebar Mobile ─── */}
      {sidebarOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setSidebarOpen(false)} />
          <aside className="lg:hidden rbx15-sidebar rbx15-sidebar-mobile">
            <Sidebar mobile />
          </aside>
        </>
      )}

      {/* Close settings dropdown */}
      {settingsOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
      )}
    </>
  );
};
