import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/**
 * Authentic early-2012 Roblox navbar
 * 1. Dark navy blue header bar with logo left, Sign Up / Login right
 * 2. Gray tab navigation bar (My ROBLOX, Games, Catalog, People, etc.)
 * 3. ~960px fixed-width container
 */

const navTabs = [
  { to: '/', label: 'My BloxEconomy', authOnly: true },
  { to: '/catalog', label: 'Catalog' },
  { to: '/users', label: 'People' },
  { to: '/trading', label: 'Trade' },
  { to: '/leaderboards', label: 'Leaderboards' },
  { to: '/friends', label: 'Friends', authOnly: true },
  { to: '/inbox', label: 'Messages', authOnly: true },
  { to: '/avatar', label: 'Character', authOnly: true },
  { to: '/promocodes', label: 'Promo Codes' },
  { to: '/sodamons', label: 'Sodamons' },
  { to: '/settings', label: 'Settings', authOnly: true },
];

export const Roblox2012Navbar = () => {
  const { user, profile, isAdmin, isOwner, isEconomyManager, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const visibleTabs = navTabs.filter(t => !t.authOnly || user);

  return (
    <>
      {/* ── Header Bar: dark navy blue ── */}
      <div className="rbx12-header">
        <div className="rbx12-container">
          <div className="rbx12-header-inner">
            {/* Logo */}
            <Link to="/" className="rbx12-logo">
              BloxEconomy
            </Link>

            {/* Right side */}
            <div className="rbx12-header-right">
              {user && profile ? (
                <>
                  <span className="rbx12-header-user">
                    {profile.username}
                  </span>
                  <span className="rbx12-header-currency">
                    💎 {profile.emeralds.toLocaleString()}
                  </span>
                  <button onClick={handleSignOut} className="rbx12-header-link">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/signup" className="rbx12-signup-btn">
                    Sign Up
                  </Link>
                  <span className="rbx12-header-or">or</span>
                  <Link to="/login" className="rbx12-login-btn">
                    Login ▾
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation Bar: gray gradient ── */}
      <div className="rbx12-tabbar">
        <div className="rbx12-container">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rbx12-hamburger"
          >
            ☰
          </button>

          {/* Desktop tabs */}
          <div className="hidden md:flex rbx12-tabs">
            {visibleTabs.map(tab => {
              const isActive = location.pathname === tab.to ||
                (tab.to === '/' && location.pathname === '/');
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn('rbx12-tab', isActive && 'rbx12-tab-active')}
                >
                  {tab.label}
                </Link>
              );
            })}
            {(isAdmin || isOwner || isEconomyManager) && (
              <Link
                to="/admin"
                className={cn(
                  'rbx12-tab rbx12-tab-admin',
                  location.pathname.startsWith('/admin') && 'rbx12-tab-active'
                )}
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile dropdown ── */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="md:hidden rbx12-mobile-menu">
            <div className="rbx12-container">
              {visibleTabs.map(tab => (
                <Link
                  key={tab.to}
                  to={tab.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rbx12-mobile-link"
                >
                  {tab.label}
                </Link>
              ))}
              {(isAdmin || isOwner || isEconomyManager) && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rbx12-mobile-link rbx12-mobile-link-admin"
                >
                  ⚡ Admin Panel
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};
