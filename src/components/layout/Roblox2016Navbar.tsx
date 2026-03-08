import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════
   SODABLOX 2016 Theme — 1:1 ECS economy-simulator replica
   Topbar: #0074BD, Sidebar: #f2f2f2 175px
   Icons: navigation_02012016.svg sprite
   ═══════════════════════════════════════════════════ */

// Sidebar links with ECS icon classes
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const profileLink = profile ? `/profile/${profile.user_id}` : '/profile';

  /* ── Sidebar link (matching ECS linkEntry.js exactly) ── */
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

  /* ── Sidebar (matching ECS navSidebar/index.js) ── */
  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="rbx16-sidebar-inner">
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
      {/* Upgrade Now button (matching ECS) */}
      <Link to="/catalog" className="rbx16-upgrade-btn">
        Avatar Shop
      </Link>
    </div>
  );

  return (
    <>
      {/* ─── Top Navbar ─── #0074BD (matching ECS navbar/index.js: backgroundColor: '#0074BD') */}
      <nav className="rbx16-topbar">
        <div className="rbx16-topbar-container">
          {/* Mobile hamburger (matching ECS logo.js openSideNavMobile) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rbx16-hamburger"
          >
            <span className="icon-nav-menu" />
          </button>

          {/* Logo (matching ECS logo.js — text version since we can't use roblox_logo.svg) */}
          <Link to="/" className="rbx16-logo">
            <span className="rbx16-logo-text">SODABLOX</span>
          </Link>

          {/* Nav links (matching ECS navigationLinks.js: Games/Catalog/Develop/ROBUX) */}
          <div className="rbx16-nav-links">
            <Link to="/catalog" className="rbx16-nav-link">Catalog</Link>
            <Link to="/trading" className="rbx16-nav-link">Trade</Link>
            <Link to="/leaderboards" className="rbx16-nav-link">Leaderboards</Link>
            <Link to="/sodamons" className="rbx16-nav-link">Sodamons</Link>
          </div>

          <div className="flex-1" />

          {/* Search (matching ECS search.js) */}
          <div className="rbx16-search-wrapper">
            <input
              type="text"
              placeholder="Search"
              className="rbx16-search-input"
            />
            <span className="rbx16-search-icon">
              <span className="icon-nav-search" style={{ width: 16, height: 16, backgroundSize: '16px auto' }} />
            </span>
          </div>

          {/* Right area (matching ECS loggedinArea.js / loginArea.js) */}
          <div className="rbx16-right-area">
            {user && profile ? (
              <>
                {/* Currency display (matching ECS: icon-nav-robux + amount) */}
                <Link to="/settings" className="rbx16-currency">
                  <span className="icon-nav-robux" style={{ width: 20, height: 20, backgroundSize: '20px auto' }} />
                  <span>{profile.emeralds.toLocaleString()}</span>
                </Link>

                {/* Settings gear (matching ECS: icon-nav-settings with dropdown) */}
                <div className="relative">
                  <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className="rbx16-nav-link"
                    style={{ padding: '4px' }}
                  >
                    <span className="icon-nav-settings" style={{ width: 20, height: 20, backgroundSize: '20px auto' }} />
                  </button>
                  {/* Settings dropdown (matching ECS SettingsDropdown) */}
                  {settingsOpen && (
                    <div className="rbx16-settings-dropdown">
                      <p>
                        <Link to="/settings" onClick={() => setSettingsOpen(false)} className="text-dark" style={{ color: '#1e1e1f' }}>
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
                          className="text-dark"
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
                {/* Login/Signup (matching ECS loginArea.js) */}
                <Link to="/signup" className="rbx16-nav-link">Sign Up</Link>
                <Link to="/login" className="rbx16-nav-link">Login</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Sidebar Desktop (matching ECS navSidebar: 175px, #f2f2f2) ─── */}
      <aside className="rbx16-sidebar hidden lg:flex">
        <Sidebar />
      </aside>

      {/* ─── Sidebar Mobile (matching ECS: overlay) ─── */}
      {sidebarOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setSidebarOpen(false)} />
          <aside className="lg:hidden rbx16-sidebar rbx16-sidebar-mobile">
            <Sidebar mobile />
          </aside>
        </>
      )}

      {/* Close settings dropdown when clicking outside */}
      {settingsOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
      )}
    </>
  );
};
