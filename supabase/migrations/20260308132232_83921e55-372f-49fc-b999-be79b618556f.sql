
-- 1. Restrict profile self-update to safe columns only via trigger
CREATE OR REPLACE FUNCTION public.restrict_profile_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') 
     AND NOT public.has_role(auth.uid(), 'owner') THEN
    NEW.emeralds := OLD.emeralds;
    NEW.is_banned := OLD.is_banned;
    NEW.ban_reason := OLD.ban_reason;
    NEW.banned_by := OLD.banned_by;
    NEW.banned_at := OLD.banned_at;
    NEW.is_verified := OLD.is_verified;
    NEW.numeric_id := OLD.numeric_id;
    NEW.username := OLD.username;
    NEW.last_daily_claim := OLD.last_daily_claim;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restrict_profile_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_profile_self_update();

-- 2. Remove dangerous "any authenticated user can insert serials" policy
DROP POLICY IF EXISTS "Authenticated users can insert serials" ON public.item_serials;

-- 3. Create ip_hashes table for alt detection
CREATE TABLE public.ip_hashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ip_hashes_ip_hash ON public.ip_hashes(ip_hash);
CREATE INDEX idx_ip_hashes_user_id ON public.ip_hashes(user_id);

ALTER TABLE public.ip_hashes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ip hashes" ON public.ip_hashes
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Owners can view ip hashes" ON public.ip_hashes
  FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));

-- 4. Remove direct user insert to inventory (purchases should go through secure function)
DROP POLICY IF EXISTS "Users can insert to own inventory" ON public.user_inventory;

-- 5. Create a secure purchase function
CREATE OR REPLACE FUNCTION public.purchase_item(p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_price integer;
  v_stock integer;
  v_is_on_sale boolean;
  v_user_emeralds integer;
  v_item_type text;
  v_sale_start timestamptz;
  v_sale_end timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT price, stock, is_on_sale, item_type, sale_start_time, sale_end_time
  INTO v_price, v_stock, v_is_on_sale, v_item_type, v_sale_start, v_sale_end
  FROM public.catalog_items WHERE id = p_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Item not found');
  END IF;

  IF v_is_on_sale IS NOT TRUE THEN
    RETURN jsonb_build_object('error', 'Item is not on sale');
  END IF;

  IF v_sale_start IS NOT NULL AND now() < v_sale_start THEN
    RETURN jsonb_build_object('error', 'Sale has not started yet');
  END IF;

  IF v_sale_end IS NOT NULL AND now() > v_sale_end THEN
    RETURN jsonb_build_object('error', 'Sale has ended');
  END IF;

  IF v_stock IS NOT NULL AND v_stock <= 0 THEN
    RETURN jsonb_build_object('error', 'Out of stock');
  END IF;

  SELECT emeralds INTO v_user_emeralds FROM public.profiles WHERE user_id = v_user_id;
  IF v_user_emeralds < v_price THEN
    RETURN jsonb_build_object('error', 'Not enough emeralds');
  END IF;

  UPDATE public.profiles SET emeralds = emeralds - v_price WHERE user_id = v_user_id;

  IF v_stock IS NOT NULL THEN
    UPDATE public.catalog_items SET stock = stock - 1 WHERE id = p_item_id;
  END IF;

  INSERT INTO public.user_inventory (user_id, item_id) VALUES (v_user_id, p_item_id);

  RETURN jsonb_build_object('success', true);
END;
$$;
