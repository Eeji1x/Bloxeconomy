import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_AVATAR_URL } from '@/lib/constants';

interface EquippedItem {
  id: string;
  catalog_items: {
    image_url: string;
    name: string;
  } | null;
}

interface UserAvatarProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showEquipped?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
};

export const UserAvatar = ({ 
  userId, 
  size = 'md', 
  className = '',
  showEquipped = true 
}: UserAvatarProps) => {
  const [equippedItems, setEquippedItems] = useState<EquippedItem[]>([]);

  useEffect(() => {
    if (showEquipped && userId) {
      fetchEquippedItems();
    }
  }, [userId, showEquipped]);

  const fetchEquippedItems = async () => {
    const { data } = await supabase
      .from('user_inventory')
      .select(`
        id,
        catalog_items (
          image_url,
          name
        )
      `)
      .eq('user_id', userId)
      .eq('is_equipped', true);

    if (data) {
      setEquippedItems(data as EquippedItem[]);
    }
  };

  return (
    <div className={`${sizeClasses[size]} relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 ${className}`}>
      {/* Base Avatar */}
      <img
        src={DEFAULT_AVATAR_URL}
        alt="Avatar"
        className="w-full h-full object-contain absolute inset-0"
        style={{ opacity: 1 }}
      />
      {/* Equipped items overlay - fully opaque */}
      {showEquipped && equippedItems.map((item) => (
        <img
          key={item.id}
          src={item.catalog_items?.image_url}
          alt={item.catalog_items?.name || 'Item'}
          className="w-full h-full object-contain absolute inset-0"
          style={{ 
            opacity: 1,
            mixBlendMode: 'normal'
          }}
        />
      ))}
    </div>
  );
};

// Simpler version that uses pre-fetched equipped items
interface UserAvatarSimpleProps {
  equippedItems?: { image_url: string; name?: string }[];
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const UserAvatarSimple = ({ 
  equippedItems = [], 
  size = 'md', 
  className = '' 
}: UserAvatarSimpleProps) => {
  return (
    <div className={`${sizeClasses[size]} relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 ${className}`}>
      {/* Base Avatar */}
      <img
        src={DEFAULT_AVATAR_URL}
        alt="Avatar"
        className="w-full h-full object-contain absolute inset-0"
        style={{ opacity: 1 }}
      />
      {/* Equipped items overlay - fully opaque */}
      {equippedItems.map((item, index) => (
        <img
          key={index}
          src={item.image_url}
          alt={item.name || 'Item'}
          className="w-full h-full object-contain absolute inset-0"
          style={{ 
            opacity: 1,
            mixBlendMode: 'normal'
          }}
        />
      ))}
    </div>
  );
};
