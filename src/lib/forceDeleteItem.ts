import { supabase } from '@/lib/supabase';

/**
 * Force-deletes a catalog item and all related records across tables.
 * Returns { success, error?, deletedName? }
 */
export const forceDeleteItem = async (itemId: string): Promise<{ success: boolean; error?: string; deletedName?: string }> => {
  try {
    // Get item name first
    const { data: item } = await supabase.from('catalog_items').select('name').eq('id', itemId).maybeSingle();
    if (!item) return { success: false, error: 'Item not found' };

    // Delete in dependency order
    const deletes = [
      supabase.from('value_history').delete().eq('item_id', itemId),
      supabase.from('item_values').delete().eq('item_id', itemId),
      supabase.from('item_tags').delete().eq('item_id', itemId),
      supabase.from('resale_listings').delete().eq('item_id', itemId),
      supabase.from('item_serials').delete().eq('item_id', itemId),
      supabase.from('lottery_prizes').delete().eq('item_id', itemId),
    ];
    await Promise.all(deletes);

    // Delete inventory records
    await supabase.from('user_inventory').delete().eq('item_id', itemId);

    // Delete the item itself
    const { error } = await supabase.from('catalog_items').delete().eq('id', itemId);
    if (error) return { success: false, error: error.message };

    return { success: true, deletedName: item.name };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
};
