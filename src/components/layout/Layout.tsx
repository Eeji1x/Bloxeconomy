import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { AnnouncementBar } from './AnnouncementBar';
import { Navbar } from './Navbar';
import { Roblox2020Navbar } from './Roblox2020Navbar';
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

  // Default SODABLOX layout
  return (
    <div className="min-h-screen bg-background cyber-grid relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/3 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10">
        <AnnouncementBar />
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <BanRedirectWrapper>
            {children}
          </BanRedirectWrapper>
        </main>
      </div>
    </div>
  );
};
