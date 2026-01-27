import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface BanRedirectWrapperProps {
  children: React.ReactNode;
}

export const BanRedirectWrapper = ({ children }: BanRedirectWrapperProps) => {
  const { profile, isLoading } = useAuth();
  const location = useLocation();

  // Don't redirect while loading or if on the banned page already
  if (isLoading) {
    return <>{children}</>;
  }

  // Allow access to banned page, login, and logout
  const allowedPaths = ['/banned', '/login', '/signup'];
  const isAllowedPath = allowedPaths.some(path => location.pathname.startsWith(path));

  // If user is banned and not on allowed path, redirect to banned page
  if (profile?.is_banned && !isAllowedPath) {
    return <Navigate to="/banned" replace />;
  }

  return <>{children}</>;
};
