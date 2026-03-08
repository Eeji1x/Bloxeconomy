import { supabase } from '@/lib/supabase';

/**
 * Force-deletes a catalog item and all related records across tables.
 * Respects foreign key dependency order.
 */
export const forceDeleteItem = async (itemId: string): Promise<{ success: boolean; error?: string; deletedName?: string }> => {
  try {
    const { data: item } = await supabase.from('catalog_items').select('name').eq('id', itemId).maybeSingle();
    if (!item) return { success: false, error: 'Item not found' };

    // Step 1: Delete records that reference user_inventory AND catalog_items
    await Promise.all([
      supabase.from('lottery_prizes').delete().eq('item_id', itemId),
      supabase.from('resale_listings').delete().eq('item_id', itemId),
      supabase.from('item_serials').delete().eq('item_id', itemId),
    ]);

    // Step 2: Delete records that only reference catalog_items
    await Promise.all([
      supabase.from('user_inventory').delete().eq('item_id', itemId),
      supabase.from('value_history').delete().eq('item_id', itemId),
      supabase.from('item_values').delete().eq('item_id', itemId),
      supabase.from('item_tags').delete().eq('item_id', itemId),
    ]);

    // Step 3: Unlink promocodes that reference this item
    await supabase.from('promocodes').update({ item_reward_id: null }).eq('item_reward_id', itemId);

    // Step 4: Handle giftbox_reward_id self-reference
    await supabase.from('catalog_items').update({ giftbox_reward_id: null }).eq('giftbox_reward_id', itemId);

    // Step 5: Delete the item itself
    const { error } = await supabase.from('catalog_items').delete().eq('id', itemId);
    if (error) return { success: false, error: error.message };

    return { success: true, deletedName: item.name };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
};
