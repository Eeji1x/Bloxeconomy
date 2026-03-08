import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { AnnouncementBar } from './AnnouncementBar';
import { Roblox2020Navbar } from './Roblox2020Navbar';
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

  const authPaths = ['/login', '/signup'];
  const isAuthPage = authPaths.some(p => location.pathname.startsWith(p));

  if (isMaintenanceMode && !isLoading && !isAuthPage) {
    return <Maintenance />;
  }

  // Roblox 2020 layout — sidebar + top bar
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

  // Default SODABLOX layout — now with sidebar + top bar
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
