import { useState, useEffect } from 'react';
import { X, Megaphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Announcement {
  id: string;
  text: string;
  link_url: string | null;
  link_text: string | null;
  is_active: boolean;
}

export const AnnouncementBar = () => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setAnnouncement(data);
        
        // Check if dismissed this session
        const dismissed = sessionStorage.getItem(`dismissed_announcement_${data.id}`);
        if (dismissed) {
          setIsDismissed(true);
        }
      }
    };

    fetchAnnouncement();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncement();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDismiss = () => {
    if (announcement) {
      sessionStorage.setItem(`dismissed_announcement_${announcement.id}`, 'true');
    }
    setIsDismissed(true);
  };

  if (!announcement || isDismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-secondary/20 via-primary/20 to-secondary/20 border-b border-primary/30">
      <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 via-primary/10 to-secondary/10 animate-pulse" />
      <div className="container mx-auto px-4 py-2 relative">
        <div className="flex items-center justify-center gap-3">
          <Megaphone className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm font-medium text-foreground">
            {announcement.text}
          </span>
          {announcement.link_url && announcement.link_text && (
            <a
              href={announcement.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
            >
              {announcement.link_text}
            </a>
          )}
          <button
            onClick={handleDismiss}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-primary/20 transition-colors"
            aria-label="Dismiss announcement"
          >
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};
