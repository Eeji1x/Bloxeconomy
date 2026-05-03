import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AuthHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }
    setIsLoggingIn(true);
    try {
      const email = `${username.toLowerCase()}@sodablox.local`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error('Invalid username or password');
      } else {
        navigate('/');
      }
    } catch {
      toast.error('Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Source Sans Pro', Arial, sans-serif" }}>
      {/* Top bar */}
      <div style={{ background: '#0074BD', height: 45 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
          <Link to="/auth" style={{ color: '#fff', fontSize: 22, fontWeight: 800, textDecoration: 'none', letterSpacing: 1 }}>
            BloxEconomy
          </Link>
          {!user && (
            <form onSubmit={handleLogin} style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="hidden sm:flex">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ height: 30, padding: '0 8px', fontSize: 13, border: '1px solid #005a94', borderRadius: 2, width: 130, background: 'rgba(255,255,255,0.9)', color: '#1e1e1f' }}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ height: 30, padding: '0 8px', fontSize: 13, border: '1px solid #005a94', borderRadius: 2, width: 130, background: 'rgba(255,255,255,0.9)', color: '#1e1e1f' }}
              />
              <button
                type="submit"
                disabled={isLoggingIn}
                style={{ height: 30, padding: '0 16px', fontSize: 13, fontWeight: 700, background: '#00a2ff', color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer' }}
              >
                {isLoggingIn ? '...' : 'Login'}
              </button>
            </form>
          )}
          {user && (
            <Link to="/" style={{ color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', background: '#00a2ff', padding: '6px 16px', borderRadius: 2 }}>
              Go to Home
            </Link>
          )}
        </div>
      </div>

      {/* Hero Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0074BD 0%, #00a2ff 50%, #00c3ff 100%)', padding: '60px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 56, fontWeight: 800, color: '#fff', margin: '0 0 16px', letterSpacing: 2, textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          BloxEconomy
        </h1>
        <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.9)', margin: '0 0 32px', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
          A virtual world revival. Collect items, trade limiteds, and build your legacy.
        </p>
        {!user ? (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{ display: 'inline-block', padding: '12px 36px', fontSize: 16, fontWeight: 700, background: '#3bc95f', color: '#fff', borderRadius: 4, textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
              Sign Up
            </Link>
            <Link to="/apply" style={{ display: 'inline-block', padding: '12px 36px', fontSize: 16, fontWeight: 700, background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 4, textDecoration: 'none', border: '2px solid rgba(255,255,255,0.4)' }}>
              Apply to Join
            </Link>
          </div>
        ) : (
          <Link to="/" style={{ display: 'inline-block', padding: '12px 36px', fontSize: 16, fontWeight: 700, background: '#3bc95f', color: '#fff', borderRadius: 4, textDecoration: 'none' }}>
            Go to Dashboard
          </Link>
        )}
      </div>

      {/* Mobile login */}
      {!user && (
        <div className="sm:hidden" style={{ padding: 20 }}>
          <div style={{ border: '1px solid #c3c3c3', borderRadius: 4, padding: 16, background: '#f8f8f8' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#393b3d', marginBottom: 12 }}>Login</h3>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ height: 36, padding: '0 10px', fontSize: 14, border: '1px solid #c3c3c3', borderRadius: 2 }}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ height: 36, padding: '0 10px', fontSize: 14, border: '1px solid #c3c3c3', borderRadius: 2 }}
              />
              <button
                type="submit"
                disabled={isLoggingIn}
                style={{ height: 36, fontSize: 14, fontWeight: 700, background: '#0074BD', color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer' }}
              >
                {isLoggingIn ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Features grid */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 20px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#393b3d', textAlign: 'center', marginBottom: 32 }}>Features</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
          {[
            { icon: '🛒', title: 'Catalog', desc: 'Browse and purchase items. Find rare limiteds and exclusive gear.' },
            { icon: '🔄', title: 'Trading', desc: 'Trade limited items with other players. Grow your collection.' },
            { icon: '👥', title: 'Community', desc: 'Connect with players, send messages, and add friends.' },
            { icon: '💎', title: 'Free Emeralds', desc: 'Every new player receives 100 free emeralds to start.' },
            { icon: '⭐', title: 'Limited Items', desc: 'Collect rare limited items with serial numbers.' },
            { icon: '🏆', title: 'Leaderboards', desc: 'Compete with other players and climb the rankings.' },
          ].map((f) => (
            <div key={f.title} style={{ border: '1px solid #c3c3c3', borderRadius: 4, padding: 20, background: '#fff' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#393b3d', marginBottom: 6 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      {!user && (
        <div style={{ background: '#f2f2f2', padding: '40px 20px', textAlign: 'center', borderTop: '1px solid #e3e3e3' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#393b3d', marginBottom: 12 }}>Ready to join?</h2>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 20, maxWidth: 500, margin: '0 auto 20px' }}>
            Create your account now and receive 100 free emeralds to start your journey.
          </p>
          <Link to="/signup" style={{ display: 'inline-block', padding: '12px 36px', fontSize: 16, fontWeight: 700, background: '#0074BD', color: '#fff', borderRadius: 4, textDecoration: 'none' }}>
            Create Account
          </Link>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e3e3e3', padding: '16px 20px', textAlign: 'center', fontSize: 12, color: '#999' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
          <Link to="/terms" style={{ color: '#00a2ff', textDecoration: 'none' }}>Terms of Service</Link>
          <Link to="/privacy" style={{ color: '#00a2ff', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link to="/apply" style={{ color: '#00a2ff', textDecoration: 'none' }}>Apply</Link>
        </div>
        <p>© {new Date().getFullYear()} BloxEconomy. All rights reserved.</p>
      </div>
    </div>
  );
};

export default AuthHome;
