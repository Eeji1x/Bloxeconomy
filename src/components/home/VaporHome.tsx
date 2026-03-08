import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Announcement {
  id: string;
  text: string;
  link_url: string | null;
  link_text: string | null;
}

export const VaporHome = () => {
  const { user, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setAnnouncements(data); });
  }, []);

  return (
    <div className="vapor-home">
      {/* Hero Jumbotron */}
      <div className="vapor-jumbotron">
        <h1>Welcome back, <b>{profile?.username}</b>.</h1>
        <p>Your emeralds: 💎 {profile?.emeralds.toLocaleString()}</p>
        <div className="vapor-hero-actions">
          <Link to="/catalog" className="vapor-btn vapor-btn-light">Browse Catalog</Link>
          <Link to="/profile" className="vapor-btn vapor-btn-outline-light">View Profile</Link>
        </div>
      </div>

      {/* Content Grid */}
      <div className="vapor-home-grid">
        {/* Quick Links */}
        <div className="vapor-card">
          <div className="vapor-card-header">Quick Links</div>
          <div className="vapor-card-body">
            <div className="vapor-quick-links">
              <Link to="/catalog" className="vapor-quick-link">🛒 Catalog</Link>
              <Link to="/trading" className="vapor-quick-link">🔄 Trading</Link>
              <Link to="/avatar" className="vapor-quick-link">🎨 Avatar</Link>
              <Link to="/friends" className="vapor-quick-link">👥 Friends</Link>
              <Link to="/promocodes" className="vapor-quick-link">🎁 Promo Codes</Link>
              <Link to="/leaderboards" className="vapor-quick-link">🏆 Leaderboards</Link>
            </div>
          </div>
        </div>

        {/* Announcements */}
        <div className="vapor-card">
          <div className="vapor-card-header">Announcements</div>
          <div className="vapor-card-body">
            {announcements.length === 0 ? (
              <p style={{ color: '#666', fontSize: 14 }}>No announcements right now.</p>
            ) : (
              announcements.map(a => (
                <div key={a.id} className="vapor-announcement">
                  <span>{a.text}</span>
                  {a.link_url && (
                    <a href={a.link_url} target="_blank" rel="noopener noreferrer" className="vapor-announcement-link">
                      {a.link_text || 'Link'}
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="vapor-card">
          <div className="vapor-card-header">Your Stats</div>
          <div className="vapor-card-body">
            <div className="vapor-stats">
              <div className="vapor-stat">
                <div className="vapor-stat-value">💎 {profile?.emeralds.toLocaleString()}</div>
                <div className="vapor-stat-label">Emeralds</div>
              </div>
              <div className="vapor-stat">
                <div className="vapor-stat-value">#{profile?.numeric_id}</div>
                <div className="vapor-stat-label">User ID</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
