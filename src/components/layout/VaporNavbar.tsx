import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, ChevronDown } from 'lucide-react';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/catalog', label: 'Catalog' },
  { to: '/users', label: 'Players' },
  { to: '/trading', label: 'Trade' },
  { to: '/leaderboards', label: 'Leaderboard' },
  { to: '/sodamons', label: 'Sodamons' },
];

export const VaporNavbar = () => {
  const { user, profile, isAdmin, isOwner, isEconomyManager, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  return (
    <nav className="vapor-navbar">
      <div className="vapor-navbar-inner">
        {/* Logo */}
        <Link to="/" className="vapor-navbar-brand">
          SODABLOX
        </Link>

        {/* Mobile toggle */}
        <button className="vapor-navbar-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Links */}
        <div className={`vapor-navbar-collapse ${mobileOpen ? 'open' : ''}`}>
          <div className="vapor-navbar-links">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`vapor-nav-link ${location.pathname === link.to ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="vapor-navbar-right">
            {user && profile ? (
              <div className="vapor-user-dropdown-wrapper">
                <button
                  className="vapor-nav-link vapor-user-btn"
                  onClick={() => setUserDropdown(!userDropdown)}
                >
                  👤 {profile.username} <ChevronDown size={14} />
                </button>
                {userDropdown && (
                  <div className="vapor-dropdown-menu">
                    <Link to="/profile" className="vapor-dropdown-item" onClick={() => setUserDropdown(false)}>Profile</Link>
                    <Link to="/avatar" className="vapor-dropdown-item" onClick={() => setUserDropdown(false)}>Avatar</Link>
                    <Link to="/friends" className="vapor-dropdown-item" onClick={() => setUserDropdown(false)}>Friends</Link>
                    <Link to="/inbox" className="vapor-dropdown-item" onClick={() => setUserDropdown(false)}>Messages</Link>
                    <Link to="/settings" className="vapor-dropdown-item" onClick={() => setUserDropdown(false)}>Settings</Link>
                    <Link to="/promocodes" className="vapor-dropdown-item" onClick={() => setUserDropdown(false)}>Promo Codes</Link>
                    {(isAdmin || isOwner || isEconomyManager) && (
                      <Link to="/admin" className="vapor-dropdown-item" onClick={() => setUserDropdown(false)}>Admin</Link>
                    )}
                    <div className="vapor-dropdown-divider" />
                    <button className="vapor-dropdown-item vapor-logout-btn" onClick={() => { signOut(); setUserDropdown(false); }}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="vapor-auth-buttons">
                <Link to="/signup" className="vapor-btn vapor-btn-success" onClick={() => setMobileOpen(false)}>Register</Link>
                <Link to="/login" className="vapor-btn vapor-btn-danger" onClick={() => setMobileOpen(false)}>Login</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
