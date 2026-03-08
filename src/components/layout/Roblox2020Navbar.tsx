import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// ─── Roblox-style SVG icons (filled, matching 2020 Roblox) ──────────────

const RbxHome = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z" />
  </svg>
);

const RbxProfile = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="8" r="4" />
    <path d="M12 14c-6 0-8 3-8 5v1h16v-1c0-2-2-5-8-5z" />
  </svg>
);

const RbxAvatar = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C9.24 2 7 4.24 7 7v2c0 2.76 2.24 5 5 5s5-2.24 5-5V7c0-2.76-2.24-5-5-5zM8 16c-3.31 0-6 1.34-6 3v2h20v-2c0-1.66-2.69-3-6-3h-8z" />
  </svg>
);

const RbxInventory = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4z" />
  </svg>
);

const RbxTrade = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 12l-4 4h3v4h2v-4h3l-4-4zm12 0l4-4h-3V4h-2v4h-3l4 4z" />
  </svg>
);

const RbxFriends = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </svg>
);

const RbxInbox = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
  </svg>
);

const RbxShop = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45C5.09 14.32 5 14.66 5 15c0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0020 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
  </svg>
);

const RbxLeaderboard = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z" />
  </svg>
);

const RbxCodes = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C11.04 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 12 7.4l3.38 4.6L17 10.83 14.92 8H20v6z" />
  </svg>
);

const RbxSettings = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94 0 .31.02.63.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </svg>
);

const RbxAdmin = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
  </svg>
);

const RbxGem = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5L2 9l10 12L22 9l-3-6zm-1.18 5h-3.09l1.57-3.14L18.82 8zm-8.36-3h4.08L12 8.49 9.46 5zM6.27 5l1.64 3.27H4.18L6.27 5zM4.64 10h3.69l3.14 6.89L4.64 10zm7.86 6.89L15.64 10h3.69l-6.83 6.89z" />
  </svg>
);

const RbxSearch = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

const RbxBell = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
  </svg>
);

const RbxLogout = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
  </svg>
);

// ─── Top tabs (Roblox 2020 style) ──────────────────

const topTabs = [
  { to: '/', label: 'Home' },
  { to: '/catalog', label: 'Avatar Shop' },
  { to: '/trading', label: 'Trade' },
  { to: '/leaderboards', label: 'Discover' },
];

// ─── Sidebar links ──────────────────

const sidebarLinks = [
  { to: '/', label: 'Home', Icon: RbxHome },
  { to: '/profile', label: 'Profile', Icon: RbxProfile, needsAuth: true },
  { to: '/avatar', label: 'Avatar', Icon: RbxAvatar },
  { to: '/catalog', label: 'Inventory', Icon: RbxInventory },
  { to: '/trading', label: 'Trade', Icon: RbxTrade },
  { to: '/friends', label: 'Friends', Icon: RbxFriends },
  { to: '/inbox', label: 'Messages', Icon: RbxInbox },
];

const sidebarLinksBottom = [
  { to: '/users', label: 'Players', Icon: RbxProfile },
  { to: '/leaderboards', label: 'Leaderboards', Icon: RbxLeaderboard },
  { to: '/promocodes', label: 'Promo Codes', Icon: RbxCodes },
  { to: '/settings', label: 'Settings', Icon: RbxSettings },
];

// ─── Component ──────────────────

export const Roblox2020Navbar = () => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const profileLink = profile ? `/profile/${profile.user_id}` : '/profile';

  const renderSidebarLink = (link: typeof sidebarLinks[0], closeMobile = false) => {
    if ('needsAuth' in link && (link as any).needsAuth && !user) return null;
    const { Icon } = link;
    const to = link.label === 'Profile' ? profileLink : link.to;
    const isActive = location.pathname === to || (link.to === '/' && location.pathname === '/');

    return (
      <Link
        key={link.label}
        to={to}
        onClick={closeMobile ? () => setSidebarOpen(false) : undefined}
        className={cn(
          "flex items-center gap-3 px-4 py-[9px] text-[13px] font-medium transition-colors border-l-[3px]",
          isActive
            ? "border-white bg-white/[0.08] text-white"
            : "border-transparent text-[#bdbebe] hover:bg-white/[0.04] hover:text-white"
        )}
      >
        <Icon className="w-[22px] h-[22px] shrink-0" />
        <span>{link.label}</span>
      </Link>
    );
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Main nav */}
      <div className="flex flex-col pt-2">
        {sidebarLinks.map((link) => renderSidebarLink(link, mobile))}
      </div>

      {/* Divider */}
      <div className="mx-4 my-2 border-t border-white/10" />

      {/* Secondary nav */}
      <div className="flex flex-col">
        {sidebarLinksBottom.map((link) => renderSidebarLink(link, mobile))}
      </div>

      {/* Admin */}
      {isAdmin && (
        <>
          <div className="mx-4 my-2 border-t border-white/10" />
          <Link
            to="/admin"
            onClick={mobile ? () => setSidebarOpen(false) : undefined}
            className={cn(
              "flex items-center gap-3 px-4 py-[9px] text-[13px] font-medium transition-colors border-l-[3px]",
              location.pathname === '/admin'
                ? "border-[#e34d4d] bg-[#e34d4d]/10 text-[#e34d4d]"
                : "border-transparent text-[#e34d4d]/70 hover:bg-[#e34d4d]/5 hover:text-[#e34d4d]"
            )}
          >
            <RbxAdmin className="w-[22px] h-[22px] shrink-0" />
            <span>Admin Panel</span>
          </Link>
        </>
      )}

      {/* Bottom spacer */}
      <div className="flex-1" />

      {/* Official Store label */}
      <div className="px-4 py-3 border-t border-white/10">
        <span className="text-[11px] font-semibold text-[#8a8b8d] uppercase tracking-wider">SODABLOX Platform</span>
      </div>
    </div>
  );

  return (
    <>
      {/* ──── Top Bar ──── */}
      <nav className="roblox-topbar sticky top-0 z-50 h-[46px] flex items-center px-3 gap-0">
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-2 rounded hover:bg-white/10 transition-colors mr-1"
        >
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center shrink-0 mr-4">
          <span className="font-extrabold text-white text-[17px] tracking-tight" style={{ fontFamily: "'Segoe UI', 'Roboto', sans-serif" }}>
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
                  "flex items-center h-full px-3 text-[13px] font-semibold transition-colors border-b-[3px] relative",
                  isActive
                    ? "text-white border-white"
                    : "text-[#bdbebe] hover:text-white border-transparent"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Search bar */}
        <div className="hidden lg:flex flex-1 max-w-[400px] ml-auto mr-3">
          <div className="flex w-full h-[30px] rounded overflow-hidden">
            <input
              type="text"
              placeholder="Search"
              className="flex-1 px-3 text-[13px] bg-[#3e4042] text-white placeholder-[#8a8b8d] border-none outline-none"
              style={{ fontFamily: "'Segoe UI', 'Roboto', sans-serif" }}
            />
            <button className="px-2.5 bg-[#00a2ff] hover:bg-[#0091e6] transition-colors flex items-center justify-center">
              <RbxSearch className="w-[16px] h-[16px] text-white" />
            </button>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1 ml-auto lg:ml-0">
          {user && profile && (
            <>
              {/* Emeralds (Robux-style) */}
              <Link
                to="/settings"
                className="flex items-center gap-1.5 h-[30px] px-2.5 rounded bg-[#3e4042] hover:bg-[#4a4c4f] transition-colors text-[13px] mr-1"
              >
                <RbxGem className="w-[14px] h-[14px] text-[#01b757]" />
                <span className="text-white font-medium">{profile.emeralds.toLocaleString()}</span>
              </Link>

              {/* Notifications */}
              <button className="p-1.5 rounded hover:bg-white/10 transition-colors relative">
                <RbxBell className="w-[20px] h-[20px] text-[#bdbebe]" />
              </button>
            </>
          )}

          {/* Settings gear */}
          <Link to="/settings" className="p-1.5 rounded hover:bg-white/10 transition-colors">
            <RbxSettings className="w-[20px] h-[20px] text-[#bdbebe]" />
          </Link>

          {user ? (
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              title="Logout"
            >
              <RbxLogout className="w-[20px] h-[20px] text-[#bdbebe]" />
            </button>
          ) : (
            <Link
              to="/login"
              className="ml-1 px-4 py-1 rounded bg-[#00a2ff] hover:bg-[#0091e6] text-white text-[13px] font-semibold transition-colors"
            >
              Log In
            </Link>
          )}
        </div>
      </nav>

      {/* ──── Sidebar - Desktop ──── */}
      <aside className="roblox-sidebar hidden lg:flex fixed left-0 top-[46px] bottom-0 w-[200px] z-40 flex-col overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* ──── Sidebar - Mobile overlay ──── */}
      {sidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="lg:hidden roblox-sidebar fixed left-0 top-[46px] bottom-0 w-[200px] z-50 flex flex-col overflow-y-auto">
            <SidebarContent mobile />
          </aside>
        </>
      )}
    </>
  );
};
