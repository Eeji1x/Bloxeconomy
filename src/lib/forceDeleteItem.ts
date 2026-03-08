import { supabase } from '@/lib/supabase';

/**
 * Force-deletes a catalog item and all related records across tables.
 * Respects foreign key dependency order.
 */
export const forceDeleteItem = async (itemId: string): Promise<{ success: boolean; error?: string; deletedName?: string }> => {
  try {
    const { data: item, error: itemError } = await supabase
      .from('catalog_items')
      .select('name')
      .eq('id', itemId)
      .maybeSingle();

    if (itemError) return { success: false, error: `catalog_items lookup: ${itemError.message}` };
    if (!item) return { success: false, error: 'Item not found' };

    const runStep = async (label: string, action: PromiseLike<{ error: { message: string } | null }>) => {
      const { error } = await action;
      if (error) throw new Error(`${label}: ${error.message}`);
    };

    // Step 1: delete rows that may reference user_inventory + catalog_items
    await runStep('lottery_prizes delete', supabase.from('lottery_prizes').delete().eq('item_id', itemId));
    await runStep('resale_listings delete', supabase.from('resale_listings').delete().eq('item_id', itemId));
    await runStep('item_serials delete', supabase.from('item_serials').delete().eq('item_id', itemId));

    // Step 2: delete direct dependencies
    await runStep('user_inventory delete', supabase.from('user_inventory').delete().eq('item_id', itemId));
    await runStep('value_history delete', supabase.from('value_history').delete().eq('item_id', itemId));
    await runStep('item_values delete', supabase.from('item_values').delete().eq('item_id', itemId));
    await runStep('item_tags delete', supabase.from('item_tags').delete().eq('item_id', itemId));

    // Step 3: unlink indirect references
    await runStep('promocodes unlink', supabase.from('promocodes').update({ item_reward_id: null }).eq('item_reward_id', itemId));
    await runStep('catalog_items giftbox unlink', supabase.from('catalog_items').update({ giftbox_reward_id: null }).eq('giftbox_reward_id', itemId));

    // Step 4: delete target item
    await runStep('catalog_items delete', supabase.from('catalog_items').delete().eq('id', itemId));

    return { success: true, deletedName: item.name };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
};
