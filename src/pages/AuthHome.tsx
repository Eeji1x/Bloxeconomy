import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const AuthHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // If already logged in, redirect
  if (user) {
    navigate('/');
    return null;
  }

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
    <div className="min-h-screen bg-[#e1e1e1]" style={{ fontFamily: "'Source Sans Pro', Arial, sans-serif" }}>
      {/* Top navigation bar */}
      <div className="bg-[#393b3d] border-b-[3px] border-[#2e7d32]">
        <div className="max-w-[960px] mx-auto flex items-center justify-between px-4 h-[48px]">
          <div className="flex items-center gap-6">
            <span className="text-white font-bold text-lg tracking-wide">SODABLOX</span>
          </div>
          <form onSubmit={handleLogin} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-[30px] px-2 text-sm border border-[#666] rounded-sm bg-white w-[140px]"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-[30px] px-2 text-sm border border-[#666] rounded-sm bg-white w-[140px]"
            />
            <button
              type="submit"
              disabled={isLoggingIn}
              className="h-[30px] px-4 text-sm font-bold text-white bg-[#0074BD] hover:bg-[#005a94] rounded-sm border border-[#005a94]"
            >
              {isLoggingIn ? '...' : 'Login'}
            </button>
          </form>
        </div>
      </div>

      {/* Hero section */}
      <div className="bg-gradient-to-b from-[#0074BD] to-[#005a94] py-16">
        <div className="max-w-[960px] mx-auto px-4 text-center text-white">
          <h1 className="text-5xl font-black mb-4 tracking-tight" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            SODABLOX
          </h1>
          <p className="text-xl mb-8 opacity-90">
            A virtual world revival. Collect items, trade limiteds, and build your legacy.
          </p>
          <Link to="/signup">
            <button className="px-8 py-3 text-lg font-bold text-white bg-[#2e7d32] hover:bg-[#256b28] rounded border border-[#1b5e20] shadow-lg">
              Sign Up Now — It's Free!
            </button>
          </Link>
        </div>
      </div>

      {/* Content section */}
      <div className="max-w-[960px] mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature cards */}
          <div className="bg-white border border-[#c3c3c3] p-0">
            <div className="bg-[#e8e8e8] border-b border-[#c3c3c3] px-4 py-2 font-bold text-[#333] text-sm">
              🛒 Catalog
            </div>
            <div className="p-4">
              <p className="text-sm text-[#666]">
                Browse and purchase items from our catalog. Find rare limiteds and exclusive gear.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#c3c3c3] p-0">
            <div className="bg-[#e8e8e8] border-b border-[#c3c3c3] px-4 py-2 font-bold text-[#333] text-sm">
              🔄 Trading
            </div>
            <div className="p-4">
              <p className="text-sm text-[#666]">
                Trade limited items with other players. Build your collection and grow your wealth.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#c3c3c3] p-0">
            <div className="bg-[#e8e8e8] border-b border-[#c3c3c3] px-4 py-2 font-bold text-[#333] text-sm">
              👥 Community
            </div>
            <div className="p-4">
              <p className="text-sm text-[#666]">
                Connect with other players, send messages, and add friends.
              </p>
            </div>
          </div>
        </div>

        {/* Stats / info */}
        <div className="mt-8 bg-white border border-[#c3c3c3]">
          <div className="bg-[#e8e8e8] border-b border-[#c3c3c3] px-4 py-2 font-bold text-[#333] text-sm">
            Why Join SODABLOX?
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-[#333] mb-2">💎 Free Emeralds</h3>
              <p className="text-sm text-[#666]">Every new player receives 100 free emeralds to start their journey.</p>
            </div>
            <div>
              <h3 className="font-bold text-[#333] mb-2">⭐ Limited Items</h3>
              <p className="text-sm text-[#666]">Collect rare limited items with serial numbers. Trade them for profit!</p>
            </div>
            <div>
              <h3 className="font-bold text-[#333] mb-2">🎁 Promocodes</h3>
              <p className="text-sm text-[#666]">Redeem special codes for free emeralds and exclusive items.</p>
            </div>
            <div>
              <h3 className="font-bold text-[#333] mb-2">🏆 Leaderboards</h3>
              <p className="text-sm text-[#666]">Compete with other players and climb the rankings.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#393b3d] text-[#999] text-center py-4 text-xs mt-8">
        © {new Date().getFullYear()} SODABLOX. All rights reserved.
      </div>
    </div>
  );
};

export default AuthHome;
