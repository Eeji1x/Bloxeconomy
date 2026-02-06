
-- Attach the serial assignment trigger on inventory insert
CREATE TRIGGER assign_serial_on_purchase
AFTER INSERT ON public.user_inventory
FOR EACH ROW
EXECUTE FUNCTION public.assign_serial_on_purchase();

-- Attach the serial transfer trigger on inventory update (owner change)
CREATE TRIGGER update_serial_on_transfer
AFTER UPDATE ON public.user_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_serial_on_transfer();
