ALTER TABLE public.user_inventory DROP CONSTRAINT IF EXISTS idx_user_inventory_user_item;
DROP INDEX IF EXISTS public.idx_user_inventory_user_item;