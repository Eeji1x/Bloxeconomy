import { supabase } from '@/lib/supabase';

/**
 * Update RAP for a limited item after a sale.
 * RAP moves 10% toward the sale price each transaction.
 * Formula: newRAP = oldRAP + (salePrice - oldRAP) * 0.1
 */
export const updateItemRAP = async (itemId: string, salePrice: number) => {
  try {
    const { data: existing } = await supabase
      .from('item_values')
      .select('rap')
      .eq('item_id', itemId)
      .maybeSingle();

    const oldRAP = existing?.rap || 0;
    // If no RAP exists yet, set it to the sale price directly
    const newRAP = oldRAP === 0
      ? salePrice
      : Math.round(oldRAP + (salePrice - oldRAP) * 0.1);

    if (existing) {
      await supabase
        .from('item_values')
        .update({ rap: newRAP, updated_at: new Date().toISOString() })
        .eq('item_id', itemId);
    } else {
      await supabase
        .from('item_values')
        .insert({
          item_id: itemId,
          rap: newRAP,
          value: salePrice,
          demand: 'Normal',
          trend: 'Stable',
        });
    }
  } catch (err) {
    console.error('Failed to update RAP:', err);
  }
};
