import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const topTabs = [
  { to: '/', label: 'My SODABLOX' },
  { to: '/catalog', label: 'Catalog' },
  { to: '/users', label: 'People' },
  { to: '/leaderboards', label: 'Leaderboards' },
  { to: '/trading', label: 'Trade' },
];

const sidebarLinks = [
  { to: '/', label: 'Home' },
  { to: '/catalog', label: 'Catalog' },
  { to: '/avatar', label: 'Avatar' },
  { to: '/trading', label: 'Trade' },
  { to: '/friends', label: 'Friends', authOnly: true },
  { to: '/inbox', label: 'Messages', authOnly: true },
  { to: '/users', label: 'People' },
  { to: '/leaderboards', label: 'Leaderboards' },
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
      {/* ── Blue gradient header bar ── */}
      <div className="rbx08-header">
        <div className="max-w-[1100px] mx-auto px-4 flex items-center justify-between h-full">
          {/* Hamburger mobile */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 mr-2"
          >
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="rbx08-logo-text">SODABLOX</span>
          </Link>

          <div className="flex-1" />

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user && profile && (
              <span className="text-white text-[12px] font-bold hidden sm:inline">
                💎 {profile.emeralds.toLocaleString()}
              </span>
            )}
            {user ? (
              <button onClick={handleSignOut} className="rbx08-btn-small">
                Logout
              </button>
            ) : (
              <Link to="/login" className="rbx08-btn-small">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Navigation tabs bar ── */}
      <div className="rbx08-tabbar">
        <div className="max-w-[1100px] mx-auto px-4 flex items-center h-full gap-0 overflow-x-auto">
          {topTabs.map((tab) => {
            const isActive = location.pathname === tab.to;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  'rbx08-tab',
                  isActive && 'rbx08-tab-active'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Sidebar Desktop ── */}
      <aside className="rbx08-sidebar hidden lg:block fixed left-0 top-[95px] bottom-0 w-[180px] z-40 overflow-y-auto">
        {/* User card */}
        {user && profile && (
          <div className="rbx08-sidebar-card mb-2">
            <div className="text-[11px] font-bold text-[#003366] mb-1">
              Welcome, {profile.username}!
            </div>
            <div className="text-[10px] text-[#666]">
              💎 {profile.emeralds.toLocaleString()} Emeralds
            </div>
          </div>
        )}

        {/* Nav links */}
        <div className="rbx08-sidebar-card">
          <div className="text-[11px] font-bold text-[#003366] border-b border-[#c0c0c0] pb-1 mb-1">
            Navigation
          </div>
          {sidebarLinks.map((link) => {
            if (link.authOnly && !user) return null;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.label}
                to={link.to}
                className={cn(
                  'block text-[11px] py-[3px] px-1 rounded transition-colors',
                  isActive
                    ? 'bg-[#0055BF] text-white font-bold'
                    : 'text-[#0055BF] hover:bg-[#e8f0fe] hover:text-[#003366]'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Admin link */}
        {(isAdmin || isEconomyManager) && (
          <div className="rbx08-sidebar-card mt-2">
            <Link
              to="/admin"
              className="block text-[11px] py-[3px] px-1 text-[#cc0000] font-bold hover:bg-[#fee] rounded"
            >
              {isAdmin ? '⚡ Admin Panel' : '⚡ Economy Panel'}
            </Link>
          </div>
        )}
      </aside>

      {/* ── Sidebar Mobile overlay ── */}
      {sidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="lg:hidden rbx08-sidebar fixed left-0 top-[95px] bottom-0 w-[180px] z-50 overflow-y-auto">
            {sidebarLinks.map((link) => {
              if (link.authOnly && !user) return null;
              return (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setSidebarOpen(false)}
                  className="block text-[11px] py-[4px] px-3 text-[#0055BF] hover:bg-[#e8f0fe] border-b border-[#d0d0d0]"
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
