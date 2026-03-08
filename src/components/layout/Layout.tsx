import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { AnnouncementBar } from './AnnouncementBar';
import { Navbar } from './Navbar';
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

  // Allow login/signup pages even during maintenance so admins can log back in
  const authPaths = ['/login', '/signup'];
  const isAuthPage = authPaths.some(p => location.pathname.startsWith(p));

  if (isMaintenanceMode && !isLoading && !isAuthPage) {
    return <Maintenance />;
  }

  return (
    <div className={`min-h-screen bg-background ${theme === 'sodablox' ? 'cyber-grid' : ''} relative`}>
      {/* Ambient glow effects - only for SODABLOX theme */}
      {theme === 'sodablox' && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/3 rounded-full blur-3xl" />
        </div>
      )}
      
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
