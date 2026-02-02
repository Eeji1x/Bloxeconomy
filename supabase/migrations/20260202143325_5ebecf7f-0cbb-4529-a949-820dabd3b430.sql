-- Create item_serials table for tracking serial numbers and seized status
CREATE TABLE IF NOT EXISTS public.item_serials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  serial_number INTEGER NOT NULL,
  inventory_id UUID REFERENCES public.user_inventory(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL,
  original_owner_id UUID NOT NULL,
  is_seized BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint for item + serial combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_serials_unique ON public.item_serials(item_id, serial_number);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_item_serials_item_id ON public.item_serials(item_id);
CREATE INDEX IF NOT EXISTS idx_item_serials_owner_id ON public.item_serials(owner_id);

-- Enable RLS
ALTER TABLE public.item_serials ENABLE ROW LEVEL SECURITY;

-- RLS policies for item_serials
CREATE POLICY "Anyone can view item serials" 
ON public.item_serials 
FOR SELECT 
USING (true);

CREATE POLICY "System can insert serials" 
ON public.item_serials 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update serials" 
ON public.item_serials 
FOR UPDATE 
USING (true);

CREATE POLICY "Admins can delete serials" 
ON public.item_serials 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Add resell_enabled column to catalog_items if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'resell_enabled') THEN
    ALTER TABLE public.catalog_items ADD COLUMN resell_enabled BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Create a unique index to prevent duplicate inventory items
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_inventory_user_item ON public.user_inventory(user_id, item_id);

-- Function to get next serial number for an item
CREATE OR REPLACE FUNCTION public.get_next_serial(p_item_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_serial INTEGER;
BEGIN
  SELECT COALESCE(MAX(serial_number), 0) + 1 INTO next_serial
  FROM public.item_serials
  WHERE item_id = p_item_id;
  
  RETURN next_serial;
END;
$$;

-- Function to assign serial on limited item purchase
CREATE OR REPLACE FUNCTION public.assign_serial_on_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_type TEXT;
  v_next_serial INTEGER;
BEGIN
  -- Check if item is limited
  SELECT item_type INTO v_item_type
  FROM public.catalog_items
  WHERE id = NEW.item_id;
  
  IF v_item_type = 'limited' THEN
    -- Get next serial
    v_next_serial := public.get_next_serial(NEW.item_id);
    
    -- Create serial record
    INSERT INTO public.item_serials (item_id, serial_number, inventory_id, owner_id, original_owner_id)
    VALUES (NEW.item_id, v_next_serial, NEW.id, NEW.user_id, NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for serial assignment
DROP TRIGGER IF EXISTS tr_assign_serial_on_purchase ON public.user_inventory;
CREATE TRIGGER tr_assign_serial_on_purchase
AFTER INSERT ON public.user_inventory
FOR EACH ROW
EXECUTE FUNCTION public.assign_serial_on_purchase();

-- Function to update serial owner on inventory transfer
CREATE OR REPLACE FUNCTION public.update_serial_on_transfer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user_id changed, update the serial record
  IF OLD.user_id != NEW.user_id THEN
    UPDATE public.item_serials
    SET owner_id = NEW.user_id
    WHERE inventory_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for transfer updates
DROP TRIGGER IF EXISTS tr_update_serial_on_transfer ON public.user_inventory;
CREATE TRIGGER tr_update_serial_on_transfer
AFTER UPDATE ON public.user_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_serial_on_transfer();