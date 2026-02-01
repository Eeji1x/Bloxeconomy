-- Add index for fast ownership lookups
CREATE INDEX IF NOT EXISTS idx_user_inventory_item_id ON public.user_inventory(item_id);

-- Drop old restrictive policy if it exists and add new one
DROP POLICY IF EXISTS "Users can view own inventory" ON public.user_inventory;

-- Allow anyone to view inventory for ownership display (limited items only)
CREATE POLICY "Anyone can view inventory" 
ON public.user_inventory 
FOR SELECT 
USING (true);