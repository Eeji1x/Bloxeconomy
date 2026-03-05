-- Remove the duplicate trigger that causes double serial creation
DROP TRIGGER IF EXISTS tr_assign_serial_on_purchase ON public.user_inventory;
