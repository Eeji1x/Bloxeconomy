import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { AnnouncementBar } from './AnnouncementBar';
import { Roblox2020Navbar } from './Roblox2020Navbar';
import { Roblox2008Navbar } from './Roblox2008Navbar';
import { SodabloxSidebar } from './SodabloxSidebar';
import { BanRedirectWrapper } from '@/components/auth/BanRedirectWrapper';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import Maintenance from '@/pages/Maintenance';

interface LayoutProps {
  children: ReactNode;
}

/** Sidebar links for the 2008 theme left nav */
const sidebar2008Links = [
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

export const Layout = ({ children }: LayoutProps) => {
  const { isMaintenanceMode, isLoading } = useMaintenanceMode();
  const { theme } = useTheme();
  const { user, isAdmin, isEconomyManager } = useAuth();
  const location = useLocation();

  const authPaths = ['/login', '/signup'];
  const isAuthPage = authPaths.some(p => location.pathname.startsWith(p));

  if (isMaintenanceMode && !isLoading && !isAuthPage) {
    return <Maintenance />;
  }

  // ── Roblox 2008 layout: 900px container, sidebar + content side-by-side ──
  if (theme === 'roblox2008') {
    return (
      <div style={{ background: '#F8FCFF', minHeight: '100vh' }}>
        <AnnouncementBar />
        <Roblox2008Navbar />

        {/* Body: 900px container with sidebar + content */}
        <div className="rbx08-container" style={{ display: 'flex', minHeight: 'calc(100vh - 105px)' }}>
          {/* Left sidebar — desktop only */}
          <aside
            className="hidden lg:block shrink-0"
            style={{
              width: 160,
              background: '#E6E6E6',
              borderRight: 'solid 1px #000',
              padding: 10,
            }}
          >
            {sidebar2008Links.map((link) => {
              if (link.authOnly && !user) return null;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.label}
                  to={link.to}
                  style={{
                    display: 'block',
                    padding: '6px',
                    color: isActive ? '#002266' : 'blue',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: 11,
                    background: isActive ? '#D0D0D0' : 'transparent',
                    borderRadius: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = '#D8D8D8';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Admin link */}
            {(isAdmin || isEconomyManager) && (
              <>
                <div style={{ margin: '8px 0', borderTop: 'solid 1px #000' }} />
                <Link
                  to="/admin"
                  style={{
                    display: 'block',
                    padding: '6px',
                    color: 'red',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: 11,
                  }}
                >
                  ⚡ {isAdmin ? 'Admin Panel' : 'Economy Panel'}
                </Link>
              </>
            )}
          </aside>

          {/* Main content */}
          <main style={{ flex: 1, padding: 15, background: 'white' }}>
            <BanRedirectWrapper>
              {children}
            </BanRedirectWrapper>
          </main>
        </div>

        {/* Footer */}
        <div className="rbx08-container">
          <div className="rbx08-footer" style={{ padding: '10px 0' }}>
            © {new Date().getFullYear()} SODABLOX Corporation. All rights reserved.
          </div>
        </div>
      </div>
    );
  }

  // Roblox 2020 layout
  if (theme === 'roblox2020') {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Roblox2020Navbar />
        <main className="lg:ml-[200px] min-h-[calc(100vh-60px)]">
          <div className="max-w-[1200px] mx-auto px-5 py-5">
            <BanRedirectWrapper>
              {children}
            </BanRedirectWrapper>
          </div>
        </main>
      </div>
    );
  }

  // Default SODABLOX layout
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <SodabloxSidebar />
      <main className="lg:ml-[200px] min-h-[calc(100vh-60px)]">
        <div className="max-w-[1200px] mx-auto px-5 py-5">
          <BanRedirectWrapper>
            {children}
          </BanRedirectWrapper>
        </div>
      </main>
    </div>
  );
};
