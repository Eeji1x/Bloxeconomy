
-- ============================================
-- FIX 1: Lock down user_inventory updates
-- Users should ONLY be able to toggle is_equipped on their own items
-- ============================================

-- Drop the overly permissive user update policy
DROP POLICY IF EXISTS "Users can update own inventory" ON public.user_inventory;

-- Create a trigger to restrict what users can change in inventory
CREATE OR REPLACE FUNCTION public.restrict_inventory_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Admins and owners can change anything
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner') THEN
    RETURN NEW;
  END IF;

  -- Regular users can only toggle is_equipped
  NEW.user_id := OLD.user_id;
  NEW.item_id := OLD.item_id;
  NEW.quantity := OLD.quantity;
  NEW.acquired_at := OLD.acquired_at;
  NEW.id := OLD.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER restrict_inventory_self_update_trigger
  BEFORE UPDATE ON public.user_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_inventory_self_update();

-- Recreate with proper restriction - users can only update their own rows
CREATE POLICY "Users can update own inventory"
  ON public.user_inventory
  FOR UPDATE
  USING ((auth.uid() = user_id) OR is_admin(auth.uid()))
  WITH CHECK ((auth.uid() = user_id) OR is_admin(auth.uid()));

-- ============================================
-- FIX 2: Lock down trades updates
-- ============================================

DROP POLICY IF EXISTS "Trade participants can update" ON public.trades;

-- Create a trigger to restrict trade modifications
CREATE OR REPLACE FUNCTION public.restrict_trade_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow status changes, nothing else
  NEW.sender_id := OLD.sender_id;
  NEW.receiver_id := OLD.receiver_id;
  NEW.sender_items := OLD.sender_items;
  NEW.receiver_items := OLD.receiver_items;
  NEW.sender_emeralds := OLD.sender_emeralds;
  NEW.receiver_emeralds := OLD.receiver_emeralds;
  NEW.created_at := OLD.created_at;
  NEW.id := OLD.id;
  
  -- Sender can only cancel
  IF auth.uid() = OLD.sender_id THEN
    IF NEW.status NOT IN ('cancelled') THEN
      RAISE EXCEPTION 'Sender can only cancel trades';
    END IF;
  END IF;

  -- Receiver can only accept or decline
  IF auth.uid() = OLD.receiver_id THEN
    IF NEW.status NOT IN ('accepted', 'declined') THEN
      RAISE EXCEPTION 'Receiver can only accept or decline trades';
    END IF;
  END IF;

  -- Can only update pending trades
  IF OLD.status != 'pending' THEN
    RAISE EXCEPTION 'Can only update pending trades';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER restrict_trade_update_trigger
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_trade_update();

-- Recreate trade update policy with WITH CHECK
CREATE POLICY "Trade participants can update"
  ON public.trades
  FOR UPDATE
  USING ((auth.uid() = sender_id) OR (auth.uid() = receiver_id))
  WITH CHECK ((auth.uid() = sender_id) OR (auth.uid() = receiver_id));

-- ============================================
-- FIX 3: Lock down item_serials updates
-- Remove user self-update entirely, only admins/owners
-- ============================================

DROP POLICY IF EXISTS "Users can update own serials or admins" ON public.item_serials;

-- ============================================
-- FIX 4: Lock down user_inventory deletes
-- Users should not be able to delete their own inventory freely
-- (only through proper trade/sell flows)
-- ============================================

DROP POLICY IF EXISTS "Users can delete from own inventory" ON public.user_inventory;

-- Recreate: only admins can delete inventory
CREATE POLICY "Only admins can delete inventory"
  ON public.user_inventory
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================
-- FIX 5: Enable leaked password protection
-- ============================================
-- (This needs to be done via auth config)
