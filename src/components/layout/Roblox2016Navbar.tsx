import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════
   SODABLOX 2016 Theme — Based on ECS economy-simulator
   Topbar: #0074BD blue, sidebar: #f2f2f2, 175px
   Nav links: white on blue, sidebar icons
   ═══════════════════════════════════════════════════ */

const sidebarLinks = [
  { to: '/', label: 'Home', icon: 'icon-nav-home' },
  { to: '/profile', label: 'Profile', icon: 'icon-nav-profile', needsAuth: true },
  { to: '/inbox', label: 'Messages', icon: 'icon-nav-message', needsAuth: true },
  { to: '/friends', label: 'Friends', icon: 'icon-nav-friends', needsAuth: true },
  { to: '/avatar', label: 'Character', icon: 'icon-nav-character' },
  { to: '/trading', label: 'Trade', icon: 'icon-nav-trade' },
  { to: '/leaderboards', label: 'Leaderboards', icon: 'icon-nav-leaderboard' },
  { to: '/users', label: 'Players', icon: 'icon-nav-players' },
  { to: '/promocodes', label: 'Promo Codes', icon: 'icon-nav-codes' },
  { to: '/settings', label: 'Settings', icon: 'icon-nav-settings' },
];

export const Roblox2016Navbar = () => {
  const { user, profile, isAdmin, isOwner, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const profileLink = profile ? `/profile/${profile.user_id}` : '/profile';

  /* ── Sidebar link entry (matches ECS linkEntry.js) ── */
  const SideLink = ({ link, mobile = false }: { link: typeof sidebarLinks[0]; mobile?: boolean }) => {
    if ('needsAuth' in link && (link as any).needsAuth && !user) return null;
    const to = link.label === 'Profile' ? profileLink : link.to;
    const isActive = location.pathname === to || (link.to === '/' && location.pathname === '/');

    return (
      <Link
        to={to}
        onClick={mobile ? () => setSidebarOpen(false) : undefined}
        className={cn(
          'rbx16-sidebar-link',
          isActive && 'rbx16-sidebar-link-active'
        )}
      >
        <span className={`rbx16-sidebar-icon ${link.icon}`} />
        <span className="rbx16-sidebar-label">{link.label}</span>
      </Link>
    );
  };

  /* ── Sidebar content ── */
  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="rbx16-sidebar-inner">
      {/* Username */}
      {user && profile && (
        <>
          <p className="rbx16-sidebar-username">{profile.username}</p>
          <div className="rbx16-sidebar-divider" />
        </>
      )}

      {/* Links */}
      <nav className="rbx16-sidebar-nav">
        {sidebarLinks.map(l => (
          <SideLink key={l.label} link={l} mobile={mobile} />
        ))}
      </nav>

      {/* Admin */}
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
            <span className="rbx16-sidebar-icon icon-nav-admin" />
            <span className="rbx16-sidebar-label">Admin Panel</span>
          </Link>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* ─── Top Navbar ─── Blue #0074BD (matching ECS navbar) */}
      <nav className="rbx16-topbar">
        <div className="rbx16-topbar-container">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rbx16-hamburger"
          >
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </button>

          {/* Logo */}
          <Link to="/" className="rbx16-logo">
            <span className="rbx16-logo-text">SODABLOX</span>
          </Link>

          {/* Nav links (Games/Catalog/Develop/Emeralds — matching ECS navigationLinks.js) */}
          <div className="rbx16-nav-links">
            <Link to="/catalog" className="rbx16-nav-link">Catalog</Link>
            <Link to="/trading" className="rbx16-nav-link">Trade</Link>
            <Link to="/leaderboards" className="rbx16-nav-link">Leaderboards</Link>
            <Link to="/sodamons" className="rbx16-nav-link">Sodamons</Link>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="rbx16-search-wrapper">
            <input
              type="text"
              placeholder="Search"
              className="rbx16-search-input"
            />
            <span className="rbx16-search-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </span>
          </div>

          {/* Right area — matches ECS loggedinArea.js / loginArea.js */}
          <div className="rbx16-right-area">
            {user && profile ? (
              <>
                {/* Emerald count */}
                <Link to="/settings" className="rbx16-currency">
                  <span className="rbx16-currency-icon">💎</span>
                  <span className="rbx16-currency-amount">{profile.emeralds.toLocaleString()}</span>
                </Link>
                {/* Settings dropdown trigger */}
                <button
                  onClick={handleSignOut}
                  className="rbx16-nav-link"
                  title="Logout"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/signup" className="rbx16-nav-link">Sign Up</Link>
                <Link to="/login" className="rbx16-nav-link">Login</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Sidebar Desktop ─── #f2f2f2, 175px (matching ECS navSidebar) */}
      <aside className="rbx16-sidebar hidden lg:flex">
        <Sidebar />
      </aside>

      {/* ─── Sidebar Mobile ─── */}
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
