import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/**
 * Authentic 2008 Roblox header layout — NO sidebar, all links in the nav bar.
 * 1. Banner bar (72px) — logo center, auth top-left, currency top-right
 * 2. Navigation bar — solid #6e99c9 with ALL links pipe-separated
 */

const allNavLinks = [
  { to: '/', label: 'Home' },
  { to: '/catalog', label: 'Catalog' },
  { to: '/users', label: 'People' },
  { to: '/trading', label: 'Trade' },
  { to: '/leaderboards', label: 'Leaderboard' },
  { to: '/avatar', label: 'Avatar', authOnly: true },
  { to: '/friends', label: 'Friends', authOnly: true },
  { to: '/inbox', label: 'Messages', authOnly: true },
  { to: '/promocodes', label: 'Promo Codes' },
  { to: '/settings', label: 'Settings', authOnly: true },
  { to: '/sodamons', label: 'Sodamons' },
  { to: '/download', label: 'Download' },
];

export const Roblox2008Navbar = () => {
  const { user, profile, isAdmin, isOwner, isEconomyManager, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const visibleLinks = allNavLinks.filter(l => !l.authOnly || user);
  let linkIndex = 0;

  return (
    <>
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

          {/* Center: Logo */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <span className="rbx08-logo-text">BloxEconomy</span>
            </Link>
          </div>

          {/* Right side: Currency alerts */}
          {user && profile && (
            <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
              <div className="rbx08-alert-space" style={{ display: 'inline-block', minWidth: 140 }}>
                <div style={{ color: 'green', fontWeight: 'bold', fontSize: 10 }}>
                  💎 {profile.emeralds.toLocaleString()} Emeralds
                </div>
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

        {/* ── Navigation bar: ALL links, pipe-separated ── */}
        <div className="rbx08-navigation">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
            style={{ verticalAlign: 'middle', marginRight: 8, background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16 }}
          >
            ☰
          </button>

          {/* Desktop nav links */}
          <span className="hidden md:inline">
            {visibleLinks.map((link, i) => {
              const isActive = location.pathname === link.to;
              return (
                <span key={link.to}>
                  {i > 0 && <span className="rbx08-separator">&nbsp;|&nbsp;</span>}
                  <Link
                    to={link.to}
                    className={cn('rbx08-menu-item', isActive && 'rbx08-menu-item-active')}
                  >
                    {link.label}
                  </Link>
                </span>
              );
            })}

            {(isAdmin || isOwner || isEconomyManager) && (
              <>
                <span className="rbx08-separator">&nbsp;|&nbsp;</span>
                <Link
                  to="/admin"
                  className={cn('rbx08-menu-item', location.pathname.startsWith('/admin') && 'rbx08-menu-item-active')}
                >
                  Admin
                </Link>
              </>
            )}
          </span>
        </div>
      </div>

      {/* ── Mobile dropdown menu ── */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="md:hidden rbx08-container"
            style={{
              position: 'relative',
              zIndex: 50,
              background: '#E6E6E6',
              borderBottom: 'solid 1px #000',
              borderLeft: 'solid 1px #000',
              borderRight: 'solid 1px #000',
              padding: 10,
            }}
          >
            {visibleLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
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
            ))}
            {(isAdmin || isOwner || isEconomyManager) && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'block',
                  padding: '6px',
                  color: 'red',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  fontSize: 11,
                  marginTop: 6,
                  borderTop: 'solid 1px #000',
                  paddingTop: 10,
                }}
              >
                ⚡ {isAdmin ? 'Admin Panel' : isOwner ? 'Owner Panel' : 'Economy Panel'}
              </Link>
            )}
          </div>
        </>
      )}
    </>
  );
};
