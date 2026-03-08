import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/**
 * Authentic 2008 Roblox header layout based on madblox-src:
 * 1. Banner bar (72px) — logo left, "Logged in as X | Logout" top-left, currency top-right
 * 2. Navigation bar — solid #6e99c9 with pipe-separated links
 * 3. No sidebar on this component (sidebar is part of Layout)
 */

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/catalog', label: 'Catalog' },
  { to: '/users', label: 'People' },
  { to: '/trading', label: 'Trade' },
  { to: '/leaderboards', label: 'Leaderboard' },
  { to: '/friends', label: 'Friends', authOnly: true },
  { to: '/inbox', label: 'Messages', authOnly: true },
];

const sidebarLinks = [
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

export const Roblox2008Navbar = () => {
  const { user, profile, isAdmin, isEconomyManager, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      {/* ── 900px Container wrapper ── */}
      <div className="rbx08-container">
        {/* ── Banner: 72px gradient header ── */}
        <div className="rbx08-banner">
          {/* Top-left: Auth info */}
          <div style={{ position: 'absolute', top: 4, left: 4, textAlign: 'left', fontSize: 10 }}>
            {user && profile ? (
              <span style={{ fontSize: 10 }}>
                Logged in as <strong>{profile.username}</strong>
                &nbsp;|&nbsp;
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); handleSignOut(); }}
                  style={{ color: 'white', textDecoration: 'none', fontSize: 10 }}
                >
                  Logout
                </a>
              </span>
            ) : (
              <span style={{ fontSize: 10 }}>
                <Link to="/login" style={{ color: 'white', textDecoration: 'none', fontSize: 10 }}>Login</Link>
              </span>
            )}
          </div>

          {/* Bottom-left: settings line */}
          {user && (
            <div style={{ position: 'absolute', bottom: 4, left: 4, textAlign: 'left', fontSize: 9, opacity: 0.8 }}>
              <Link to="/settings" style={{ color: 'white', textDecoration: 'none', fontSize: 9 }}>Settings</Link>
            </div>
          )}

          {/* Center: Logo */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <span className="rbx08-logo-text">SODABLOX</span>
            </Link>
          </div>

          {/* Right side: Currency alerts (like madblox AlertSpace) */}
          {user && profile && (
            <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
              <div className="rbx08-alert-space" style={{ display: 'inline-block', minWidth: 140 }}>
                {profile.emeralds !== undefined && (
                  <div style={{ color: 'green', fontWeight: 'bold', fontSize: 10 }}>
                    💎 {profile.emeralds.toLocaleString()} Emeralds
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right side for logged out: Sign Up button */}
          {!user && (
            <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
              <Link to="/signup" className="rbx08-btn-big">
                Sign Up & Play!
              </Link>
            </div>
          )}
        </div>

        {/* ── Navigation bar: solid #6e99c9, pipe-separated links ── */}
        <div className="rbx08-navigation">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
            style={{ verticalAlign: 'middle', marginRight: 8, background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16 }}
          >
            ☰
          </button>

          {navLinks.map((link, i) => {
            if (link.authOnly && !user) return null;
            const isActive = location.pathname === link.to;
            return (
              <span key={link.to}>
                {i > 0 && <span className="rbx08-separator">&nbsp;|&nbsp;</span>}
                <Link
                  to={link.to}
                  className={cn(
                    'rbx08-menu-item',
                    isActive && 'rbx08-menu-item-active'
                  )}
                >
                  {link.label}
                </Link>
              </span>
            );
          })}

          {/* Admin link in nav */}
          {(isAdmin || isEconomyManager) && (
            <>
              <span className="rbx08-separator">&nbsp;|&nbsp;</span>
              <Link
                to="/admin"
                className={cn(
                  'rbx08-menu-item',
                  location.pathname.startsWith('/admin') && 'rbx08-menu-item-active'
                )}
              >
                Admin
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Desktop Sidebar (inside body area) ── */}
      {/* This is rendered in Layout.tsx, not here */}

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="lg:hidden fixed left-0 top-0 bottom-0 z-50 overflow-y-auto"
            style={{
              width: 160,
              background: '#E6E6E6',
              borderRight: 'solid 1px #000',
              padding: 10,
              paddingTop: 80,
            }}
          >
            {sidebarLinks.map((link) => {
              if (link.authOnly && !user) return null;
              return (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    display: 'block',
                    padding: '6px',
                    color: 'blue',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: 11,
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
            {(isAdmin || isEconomyManager) && (
              <Link
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'block',
                  padding: '6px',
                  color: 'red',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  fontSize: 11,
                  marginTop: 10,
                  borderTop: 'solid 1px #000',
                  paddingTop: 10,
                }}
              >
                ⚡ {isAdmin ? 'Admin Panel' : 'Economy Panel'}
              </Link>
            )}
          </aside>
        </>
      )}
    </>
  );
};
