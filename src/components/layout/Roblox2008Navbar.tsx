import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/catalog', label: 'Catalog' },
  { to: '/users', label: 'People' },
  { to: '/trading', label: 'Trade' },
  { to: '/leaderboards', label: 'Leaderboard' },
];

const sidebarLinks = [
  { to: '/', label: 'Home' },
  { to: '/catalog', label: 'Catalog' },
  { to: '/avatar', label: 'Avatar' },
  { to: '/trading', label: 'Trade' },
  { to: '/friends', label: 'Friends', authOnly: true },
  { to: '/inbox', label: 'Messages', authOnly: true },
  { to: '/users', label: 'People' },
  { to: '/leaderboards', label: 'Leaderboard' },
  { to: '/promocodes', label: 'Promo Codes' },
  { to: '/settings', label: 'Settings' },
];

export const Roblox2008Navbar = () => {
  const { user, profile, isAdmin, isEconomyManager, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      {/* ── Header: 70px blue gradient ── */}
      <header className="rbx08-header sticky top-0 z-50">
        <div className="max-w-[980px] mx-auto px-4 flex items-center h-full">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden mr-3"
          >
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </button>

          {/* Logo */}
          <Link to="/" className="shrink-0 mr-6">
            <span className="rbx08-logo-text">SODABLOX</span>
          </Link>

          {/* Center nav links */}
          <nav className="hidden md:flex items-center h-full gap-0">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'rbx08-nav-link',
                    isActive && 'rbx08-nav-link-active'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user && profile && (
              <>
                <Link to="/inbox" className="text-white text-[12px] hover:text-[#E5E5E5] hidden sm:inline" style={{ fontSize: '12px' }}>
                  Messages
                </Link>
                <span className="text-white text-[12px] hidden sm:inline" style={{ fontSize: '12px' }}>
                  💎 {profile.emeralds.toLocaleString()}
                </span>
                <Link
                  to={`/profile/${profile.user_id}`}
                  className="text-white text-[12px] font-bold hover:text-[#E5E5E5]"
                  style={{ fontSize: '12px' }}
                >
                  {profile.username}
                </Link>
              </>
            )}
            {user ? (
              <button
                onClick={handleSignOut}
                className="rbx08-btn-secondary"
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                Logout
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="rbx08-btn-primary" style={{ fontSize: '11px', padding: '3px 8px' }}>
                  Login
                </Link>
                <Link to="/signup" className="rbx08-btn-secondary" style={{ fontSize: '11px', padding: '3px 8px' }}>
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Sidebar Desktop: 160px ── */}
      <aside className="rbx08-sidebar hidden lg:block fixed left-0 top-[70px] bottom-0 w-[160px] z-40 overflow-y-auto">
        {sidebarLinks.map((link) => {
          if (link.authOnly && !user) return null;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.label}
              to={link.to}
              className={cn(
                'rbx08-sidebar-link',
                isActive && 'rbx08-sidebar-link-active'
              )}
            >
              {link.label}
            </Link>
          );
        })}

        {/* Admin link */}
        {(isAdmin || isEconomyManager) && (
          <>
            <div className="my-2 border-t border-[#C3C3C3]" />
            <Link
              to="/admin"
              className={cn(
                'rbx08-sidebar-link',
                location.pathname.startsWith('/admin') && 'rbx08-sidebar-link-active'
              )}
              style={{ color: '#CC3333' }}
            >
              {isAdmin ? '⚡ Admin Panel' : '⚡ Economy Panel'}
            </Link>
          </>
        )}
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="lg:hidden rbx08-sidebar fixed left-0 top-[70px] bottom-0 w-[160px] z-50 overflow-y-auto">
            {sidebarLinks.map((link) => {
              if (link.authOnly && !user) return null;
              return (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setSidebarOpen(false)}
                  className="rbx08-sidebar-link"
                >
                  {link.label}
                </Link>
              );
            })}
          </aside>
        </>
      )}
    </>
  );
};
