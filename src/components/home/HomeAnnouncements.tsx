import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Megaphone, ExternalLink } from 'lucide-react';

interface Announcement {
  id: string;
  text: string;
  link_url: string | null;
  link_text: string | null;
  created_at: string;
}

export const HomeAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      setAnnouncements(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="cyber-card p-6">
        <div className="flex justify-center">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="cyber-card p-6 space-y-4">
      <h3 className="font-display font-bold flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-primary" />
        Announcements
      </h3>

      <div className="space-y-3">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="p-4 bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary rounded-r-lg"
          >
            <p className="text-sm">{announcement.text}</p>
            {announcement.link_url && (
              <a
                href={announcement.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
              >
                {announcement.link_text || 'Learn more'}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
