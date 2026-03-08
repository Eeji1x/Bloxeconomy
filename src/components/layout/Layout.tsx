import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { AnnouncementBar } from './AnnouncementBar';
import { Roblox2016Navbar } from './Roblox2016Navbar';
import { Roblox2015Navbar } from './Roblox2015Navbar';
import { Roblox2008Navbar } from './Roblox2008Navbar';

import { SodabloxSidebar } from './SodabloxSidebar';
import { BanRedirectWrapper } from '@/components/auth/BanRedirectWrapper';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import Maintenance from '@/pages/Maintenance';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { isMaintenanceMode, isLoading } = useMaintenanceMode();
  const { theme } = useTheme();
  const location = useLocation();

  const authPaths = ['/login', '/signup', '/auth', '/apply', '/privacy'];
  const isAuthPage = authPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));

  // These pages have their own full layout
  if (location.pathname === '/auth' || location.pathname === '/apply' || location.pathname === '/privacy') {
    return <>{children}</>;
  }

  // Fail-closed: show maintenance while loading or when enabled, except auth pages
  if (isMaintenanceMode && !isAuthPage) {
    return <Maintenance />;
  }

  // ── Roblox 2008 layout: no sidebar, full-width content in 900px container ──
  if (theme === 'roblox2008') {
    return (
      <div style={{ background: '#F8FCFF', minHeight: '100vh' }}>
        <AnnouncementBar />
        <Roblox2008Navbar />

        {/* Body: 900px container, content only */}
        <div className="rbx08-container">
          <main style={{ padding: 15, background: 'white', minHeight: 'calc(100vh - 105px)' }}>
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

  // SODABLOX 2016 layout (based on ECS economy-simulator)
  if (theme === 'roblox2016') {
    return (
      <div className="min-h-screen" style={{ background: '#e8e8e8' }}>
        <AnnouncementBar />
        <Roblox2016Navbar />
        <main className="lg:ml-[175px] min-h-[calc(100vh-46px)]">
          <div className="max-w-[1100px] mx-auto px-4 py-4">
            <BanRedirectWrapper>
              {children}
            </BanRedirectWrapper>
          </div>
        </main>
      </div>
    );
  }

  // SODABLOX 2015 layout — dark charcoal topbar, red accents
  if (theme === 'roblox2015') {
    return (
      <div className="min-h-screen" style={{ background: '#e6e6e6' }}>
        <AnnouncementBar />
        <Roblox2015Navbar />
        <main className="lg:ml-[175px] min-h-[calc(100vh-46px)]">
          <div className="max-w-[1100px] mx-auto px-4 py-4">
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
