import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Home,
  ShoppingBag,
  User,
  ArrowLeftRight,
  Gift,
  Users,
  Shield,
  Gem,
  LogOut,
  LogIn,
  Trophy,
  Settings,
  Mail,
  Menu,
  X,
  Search,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const sidebarLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: `/profile`, label: 'Profile', icon: User, needsAuth: true },
  { to: '/catalog', label: 'Avatar Shop', icon: ShoppingBag },
  { to: '/avatar', label: 'Avatar', icon: User },
  { to: '/trading', label: 'Trade', icon: ArrowLeftRight },
  { to: '/inbox', label: 'Inbox', icon: Mail },
  { to: '/users', label: 'Players', icon: Users },
  { to: '/leaderboards', label: 'Leaderboards', icon: Trophy },
  { to: '/promocodes', label: 'Promo Codes', icon: Gift },
  { to: '/friends', label: 'Friends', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
];

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

  return (
    <>
      {/* Top Bar */}
      <nav className="roblox-topbar sticky top-0 z-50 h-12 flex items-center px-4 gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-1.5 rounded hover:bg-white/10 transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded bg-white/20 flex items-center justify-center font-bold text-white text-sm">
            S
          </div>
          <span className="font-bold text-white text-base hidden sm:block tracking-wide">
            SODABLOX
          </span>
        </Link>

        {/* Search bar placeholder */}
        <div className="hidden md:flex flex-1 max-w-md mx-auto">
          <div className="flex w-full h-8 rounded-md overflow-hidden">
            <input
              type="text"
              placeholder="Search"
              className="flex-1 px-3 text-sm bg-[#393b3d] text-white placeholder-gray-400 border-none outline-none"
              readOnly
            />
            <button className="px-3 bg-[#00a2ff] hover:bg-[#0091e6] transition-colors">
              <Search className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 ml-auto">
          {user && profile && (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#393b3d] text-sm">
                <Gem className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-white font-medium">{profile.emeralds.toLocaleString()}</span>
              </div>
              <button className="p-1.5 rounded hover:bg-white/10 transition-colors relative">
                <Bell className="w-5 h-5 text-gray-300" />
              </button>
            </>
          )}

          {user ? (
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-gray-300" />
            </button>
          ) : (
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-md bg-[#00a2ff] hover:bg-[#0091e6] text-white text-sm font-medium transition-colors"
            >
              Log In
            </Link>
          )}
        </div>
      </nav>

      {/* Sidebar - Desktop */}
      <aside className="roblox-sidebar hidden lg:flex fixed left-0 top-12 bottom-0 w-[220px] z-40 flex-col overflow-y-auto">
        <div className="flex flex-col py-2 flex-1">
          {sidebarLinks.map((link) => {
            if (link.needsAuth && !user) return null;
            const Icon = link.icon;
            const to = link.label === 'Profile' ? profileLink : link.to;
            const isActive = location.pathname === to || (link.to === '/' && location.pathname === '/');

            return (
              <Link
                key={link.label}
                to={to}
                className={cn(
                  "flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/10 text-white border-l-[3px] border-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200 border-l-[3px] border-transparent"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors",
                location.pathname === '/admin'
                  ? "bg-red-500/20 text-red-400 border-l-[3px] border-red-400"
                  : "text-red-400/70 hover:bg-red-500/10 hover:text-red-400 border-l-[3px] border-transparent"
              )}
            >
              <Shield className="w-5 h-5 shrink-0" />
              <span>Admin</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Sidebar - Mobile overlay */}
      {sidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="lg:hidden roblox-sidebar fixed left-0 top-12 bottom-0 w-[220px] z-50 flex flex-col overflow-y-auto">
            <div className="flex flex-col py-2 flex-1">
              {sidebarLinks.map((link) => {
                if (link.needsAuth && !user) return null;
                const Icon = link.icon;
                const to = link.label === 'Profile' ? profileLink : link.to;
                const isActive = location.pathname === to;

                return (
                  <Link
                    key={link.label}
                    to={to}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-white/10 text-white border-l-[3px] border-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200 border-l-[3px] border-transparent"
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-red-400/70 hover:bg-red-500/10 hover:text-red-400 border-l-[3px] border-transparent"
                >
                  <Shield className="w-5 h-5 shrink-0" />
                  <span>Admin</span>
                </Link>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
};
