import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════
   Roblox 2020-2021 — EXACT replica icons (outline style matching real roblox.com)
   ═══════════════════════════════════════════════════ */

// Roblox tilted square logo
const RbxLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M5.25 1.5L22.5 5.25L18.75 22.5L1.5 18.75L5.25 1.5Z" fill="currentColor" />
    <path d="M10.5 9L15 10.125L13.875 14.625L9.375 13.5L10.5 9Z" fill="#232527" />
  </svg>
);

const RbxHome = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L4 18h4v12h8v-8h4v8h8V18h4L18 6z" fill="currentColor" stroke="none" />
  </svg>
);
const RbxProfile = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor">
    <circle cx="18" cy="12" r="6" />
    <path d="M6 30c0-4 4-8 12-8s12 4 12 8v2H6v-2z" />
  </svg>
);
const RbxAvatar = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor">
    <path d="M18 4c-4 0-7 3-7 7v3c0 4 3 7 7 7s7-3 7-7v-3c0-4-3-7-7-7z" />
    <path d="M10 26c-4 0-6 2-6 4v2h24v-2c0-2-2-4-6-4H10z" />
  </svg>
);
const RbxInventory = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor">
    <path d="M30 10h-4V8c0-1.5-1.5-3-3-3H13c-1.5 0-3 1.5-3 3v2H6c-1.5 0-3 1.5-3 3v16c0 1.5 1.5 3 3 3h24c1.5 0 3-1.5 3-3V13c0-1.5-1.5-3-3-3zM13 8h10v2H13V8z" />
  </svg>
);
const RbxTrade = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor">
    <path d="M10 18l-6 6h4v6h4v-6h4l-6-6zm16 0l6-6h-4V6h-4v6h-4l6 6z" />
  </svg>
);
const RbxFriends = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor">
    <path d="M24 17c2.5 0 4.5-2 4.5-4.5S26.5 8 24 8s-4.5 2-4.5 4.5S21.5 17 24 17zm-12 0c2.5 0 4.5-2 4.5-4.5S14.5 8 12 8s-4.5 2-4.5 4.5S9.5 17 12 17zm0 3c-3.5 0-10.5 1.75-10.5 5.25V29h21v-3.75C22.5 21.75 15.5 20 12 20zm12 0c-.44 0-.93.03-1.46.08 1.74 1.26 2.96 2.96 2.96 5.17V29h9v-3.75C34.5 21.75 27.5 20 24 20z" />
  </svg>
);
const RbxInbox = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor">
    <path d="M30 6H6c-1.65 0-3 1.35-3 3v18c0 1.65 1.35 3 3 3h24c1.65 0 3-1.35 3-3V9c0-1.65-1.35-3-3-3zm0 6l-12 7.5L6 12V9l12 7.5L30 9v3z" />
  </svg>
);
const RbxLeaderboard = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor">
    <path d="M11 32H3V14h8v18zm11-27H14v27h8V5zM33 17h-8v15h8V17z" />
  </svg>
);
const RbxCodes = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor">
    <path d="M30 10h-3.27c.17-.47.27-.97.27-1.5 0-2.49-2.01-4.5-4.5-4.5-1.58 0-2.94.81-3.75 2.03L18 7.1l-.75-1.02C16.44 4.81 15.08 4 13.5 4 11.01 4 9 6.01 9 8.5c0 .53.1 1.03.27 1.5H6c-1.67 0-2.99 1.34-2.99 3L3 28.5c0 1.67 1.34 3 3 3h24c1.67 0 3-1.34 3-3V13c0-1.67-1.34-3-3-3zm-7.5-3c.83 0 1.5.67 1.5 1.5S23.33 10 22.5 10 21 9.33 21 8.5 21.67 7 22.5 7zm-9 0c.83 0 1.5.67 1.5 1.5S14.33 10 13.5 10 12 9.33 12 8.5 12.67 7 13.5 7zM30 28.5H6v-3h24v3zm0-7.5H6V13h7.62l-3.12 4.25 2.43 1.78L18 11.1l5.07 7.93 2.43-1.78L22.38 13H30v8z" />
  </svg>
);
const RbxSettings = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor">
    <path d="M29.71 19.41c.05-.46.09-.94.09-1.41s-.03-.95-.09-1.41l3.05-2.37c.27-.21.34-.6.17-.92l-2.88-4.98c-.18-.33-.54-.43-.88-.33l-3.59 1.44c-.75-.57-1.55-1.05-2.43-1.41l-.54-3.81A.72.72 0 0021.89 4h-5.76c-.36 0-.66.26-.71.61l-.54 3.81c-.88.35-1.68.84-2.43 1.41L8.86 8.39c-.33-.11-.7 0-.88.33L5.1 13.7c-.18.33-.11.7.17.92l3.05 2.37c-.05.46-.09.94-.09 1.41s.03.95.09 1.41L5.27 22.18c-.27.21-.34.6-.17.92l2.88 4.98c.18.33.54.43.88.33l3.59-1.44c.75.57 1.55 1.05 2.43 1.41l.54 3.81c.05.35.35.61.71.61h5.76c.36 0 .66-.26.71-.61l.54-3.81c.88-.35 1.68-.84 2.43-1.41l3.59 1.44c.33.11.7 0 .88-.33l2.88-4.98c.18-.33.11-.7-.17-.92l-3.01-2.37zM19.01 23.4c-2.97 0-5.4-2.43-5.4-5.4s2.43-5.4 5.4-5.4 5.4 2.43 5.4 5.4-2.43 5.4-5.4 5.4z" />
  </svg>
);
const RbxAdmin = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor">
    <path d="M18 1.5L4.5 7.5v9c0 8.33 5.76 16.11 13.5 18 7.74-1.89 13.5-9.67 13.5-18v-9L18 1.5z" />
  </svg>
);
const RbxSearch = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor">
    <path d="M23.25 21h-1.19l-.42-.41A9.71 9.71 0 0024 14.25a9.75 9.75 0 10-9.75 9.75c2.42 0 4.64-.88 6.34-2.36l.41.42v1.19l7.5 7.49L30.49 28.75l-7.24-7.75zm-9 0c-3.73 0-6.75-3.02-6.75-6.75S10.52 7.5 14.25 7.5 21 10.52 21 14.25 17.98 21 14.25 21z" />
  </svg>
);
const RbxBell = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor">
    <path d="M18 33c1.65 0 3-1.35 3-3h-6a3 3 0 003 3zm9-9v-7.5c0-4.61-2.44-8.46-6.75-9.48V6c0-1.24-1.01-2.25-2.25-2.25S15.75 4.76 15.75 6v1.02C11.45 8.04 9 11.88 9 16.5V24l-3 3v1.5h24V27l-3-3z" />
  </svg>
);
const RbxRobux = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor">
    <path d="M18 3C9.72 3 3 9.72 3 18s6.72 15 15 15 15-6.72 15-15S26.28 3 18 3zm0 27c-6.63 0-12-5.37-12-12S11.37 6 18 6s12 5.37 12 12-5.37 12-12 12z" />
    <path d="M21 12h-6v3h-3v6h3v3h6v-3h3v-6h-3v-3zm0 6h-3v3h-3v-3h3v-3h3v3z" />
  </svg>
);
const RbxLogout = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor">
    <path d="M25.5 10.5l-2.12 2.12L27.26 16.5H12v3h15.26l-3.88 3.88L25.5 25.5 33 18l-7.5-7.5zM6 7.5h12V4.5H6c-1.65 0-3 1.35-3 3v21c0 1.65 1.35 3 3 3h12v-3H6v-21z" />
  </svg>
);
const RbxSodamons = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor">
    <path d="M18 3C9.72 3 3 9.72 3 18s6.72 15 15 15 15-6.72 15-15S26.28 3 18 3zm-3.75 22.5l-6-6 2.12-2.12 3.88 3.87 8.38-8.37 2.12 2.12-10.5 10.5z" />
  </svg>
);

/* ═══════════════════════════════════════════════════
   Layout data — 1:1 matching real Roblox 2020-2021
   ═══════════════════════════════════════════════════ */

const topTabs = [
  { to: '/catalog', label: 'Avatar Shop' },
  { to: '/trading', label: 'Trade' },
  { to: '/leaderboards', label: 'Charts' },
  { to: '/sodamons', label: 'Sodamons' },
];

const sidebarLinks = [
  { to: '/', label: 'Home', Icon: RbxHome },
  { to: '/profile', label: 'Profile', Icon: RbxProfile, needsAuth: true },
  { to: '/inbox', label: 'Messages', Icon: RbxInbox },
  { to: '/friends', label: 'Friends', Icon: RbxFriends },
  { to: '/avatar', label: 'Avatar', Icon: RbxAvatar },
  { to: '/catalog', label: 'Inventory', Icon: RbxInventory },
  { to: '/trading', label: 'Trade', Icon: RbxTrade },
];

const sidebarLinks2 = [
  { to: '/users', label: 'Players', Icon: RbxProfile },
  { to: '/leaderboards', label: 'Leaderboards', Icon: RbxLeaderboard },
  { to: '/promocodes', label: 'Promo Codes', Icon: RbxCodes },
  { to: '/download', label: 'Download', Icon: RbxCodes },
  { to: '/settings', label: 'Settings', Icon: RbxSettings },
];

/* ═══════════════════════════════════════════════════
   Component — 1:1 Roblox 2020-2021 replica
   Topbar: #232527, 48px. Sidebar: #232527, 200px.
   ═══════════════════════════════════════════════════ */

export const Roblox2020Navbar = () => {
  const { user, profile, isAdmin, isOwner, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const profileLink = profile ? `/profile/${profile.user_id}` : '/profile';

  const SideLink = ({ link, mobile = false }: { link: typeof sidebarLinks[0]; mobile?: boolean }) => {
    if ('needsAuth' in link && (link as any).needsAuth && !user) return null;
    const { Icon } = link;
    const to = link.label === 'Profile' ? profileLink : link.to;
    const isActive = location.pathname === to || (link.to === '/' && location.pathname === '/');

    return (
      <Link
        to={to}
        onClick={mobile ? () => setSidebarOpen(false) : undefined}
        className={cn(
          'rbx20-nav-link flex items-center gap-3 px-4 h-[40px] text-[13px] transition-colors',
          isActive
            ? 'rbx20-nav-link-active font-semibold'
            : 'font-medium'
        )}
      >
        <Icon className="w-[24px] h-[24px] shrink-0" />
        <span className="truncate">{link.label}</span>
      </Link>
    );
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Main links */}
      <nav className="flex flex-col py-1">
        {sidebarLinks.map(l => (
          <SideLink key={l.label} link={l} mobile={mobile} />
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-white/[0.12]" />

      {/* Secondary links */}
      <nav className="flex flex-col py-1">
        {sidebarLinks2.map(l => (
          <SideLink key={l.label} link={l} mobile={mobile} />
        ))}
      </nav>

      {/* Admin */}
      {(isAdmin || isOwner) && (
        <>
          <div className="mx-4 border-t border-white/[0.12]" />
          <Link
            to="/admin"
            onClick={mobile ? () => setSidebarOpen(false) : undefined}
            className={cn(
              'flex items-center gap-3 px-4 h-[40px] text-[13px] font-medium transition-colors',
              location.pathname === '/admin'
                ? 'text-[#ff4444] bg-[#ff4444]/[0.08]'
                : 'text-[#ff4444]/70 hover:text-[#ff4444] hover:bg-white/[0.04]'
            )}
          >
            <RbxAdmin className="w-[24px] h-[24px] shrink-0" />
            <span>Admin Panel</span>
          </Link>
        </>
      )}

      <div className="flex-1" />

      {/* Logout at bottom */}
      {user && (
        <div className="border-t border-white/[0.12]">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 h-[40px] text-[13px] font-medium text-[#bdbebe] hover:text-white hover:bg-white/[0.04] w-full transition-colors"
          >
            <RbxLogout className="w-[24px] h-[24px] shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ─── Top Bar ─── #232527, 48px height (real Roblox 2020) */}
      <header className="rbx20-topbar sticky top-0 z-50 h-[48px] flex items-center px-3">
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-2 mr-1 rounded hover:bg-white/[0.08]"
        >
          <svg className="w-5 h-5 text-[#bdbebe]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 shrink-0 mr-5">
          <RbxLogo className="w-[28px] h-[28px] text-white" />
        </Link>

        {/* Topbar tabs */}
        <nav className="hidden md:flex items-center h-full">
          {topTabs.map(tab => {
            const isActive = location.pathname === tab.to;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  'rbx20-topbar-tab flex items-center h-full px-3 text-[12px] font-bold uppercase tracking-[0.5px] transition-colors',
                  isActive
                    ? 'text-white border-b-[3px] border-white'
                    : 'text-[#bdbebe] hover:text-white border-b-[3px] border-transparent'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* Search */}
        <div className="hidden lg:flex items-center mr-2">
          <div className="flex h-[32px] rounded-[4px] overflow-hidden" style={{ background: '#3e4042' }}>
            <input
              type="text"
              placeholder="Search"
              className="w-[200px] px-3 text-[13px] text-white placeholder-[#bdbebe] bg-transparent border-none outline-none"
            />
            <button className="px-3 flex items-center justify-center hover:bg-white/[0.08]">
              <RbxSearch className="w-[16px] h-[16px] text-[#bdbebe]" />
            </button>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-0">
          {user && profile ? (
            <>
              {/* Robux/Emerald pill */}
              <Link
                to="/settings"
                className="rbx20-robux-pill flex items-center gap-1.5 h-[30px] px-3 rounded-[4px] text-[13px] font-bold mr-1"
              >
                <RbxRobux className="w-[16px] h-[16px] text-[#00b06a]" />
                <span className="text-white">{profile.emeralds.toLocaleString()}</span>
              </Link>

              {/* Bell */}
              <button className="rbx20-icon-btn w-[32px] h-[32px] flex items-center justify-center rounded hover:bg-white/[0.08]">
                <RbxBell className="w-[20px] h-[20px] text-[#bdbebe]" />
              </button>

              {/* Settings */}
              <Link to="/settings" className="rbx20-icon-btn w-[32px] h-[32px] flex items-center justify-center rounded hover:bg-white/[0.08]">
                <RbxSettings className="w-[20px] h-[20px] text-[#bdbebe]" />
              </Link>
            </>
          ) : (
            <>
              <Link to="/settings" className="rbx20-icon-btn w-[32px] h-[32px] flex items-center justify-center rounded hover:bg-white/[0.08]">
                <RbxSettings className="w-[20px] h-[20px] text-[#bdbebe]" />
              </Link>
              <Link
                to="/login"
                className="rbx20-login-btn ml-2 px-5 h-[32px] flex items-center rounded-[4px] text-white text-[13px] font-bold"
              >
                Log In
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ─── Sidebar Desktop ─── #232527, 200px width */}
      <aside className="rbx20-sidebar hidden lg:flex fixed left-0 top-[48px] bottom-0 w-[200px] z-40 flex-col overflow-y-auto">
        <Sidebar />
      </aside>

      {/* ─── Sidebar Mobile ─── */}
      {sidebarOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
          <aside className="lg:hidden rbx20-sidebar fixed left-0 top-[48px] bottom-0 w-[200px] z-50 flex flex-col overflow-y-auto">
            <Sidebar mobile />
          </aside>
        </>
      )}
    </>
  );
};
