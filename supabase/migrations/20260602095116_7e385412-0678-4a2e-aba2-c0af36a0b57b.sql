-- Allow trusted security-definer economy functions to update protected profile fields.
CREATE OR REPLACE FUNCTION public.restrict_profile_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('app.bypass_profile_guard', true) = 'on'
     OR auth.role() = 'service_role'
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'owner') THEN
    RETURN NEW;
  END IF;

  NEW.emeralds := OLD.emeralds;
  NEW.is_banned := OLD.is_banned;
  NEW.ban_reason := OLD.ban_reason;
  NEW.banned_by := OLD.banned_by;
  NEW.banned_at := OLD.banned_at;
  NEW.is_verified := OLD.is_verified;
  NEW.numeric_id := OLD.numeric_id;
  NEW.username := OLD.username;
  NEW.user_id := OLD.user_id;
  NEW.id := OLD.id;
  NEW.created_at := OLD.created_at;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.restrict_inventory_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('app.bypass_inventory_guard', true) = 'on'
     OR auth.role() = 'service_role'
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'owner') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> OLD.user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  NEW.user_id := OLD.user_id;
  NEW.item_id := OLD.item_id;
  NEW.quantity := OLD.quantity;
  NEW.acquired_at := OLD.acquired_at;
  NEW.id := OLD.id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.restrict_user_roles_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_target uuid := COALESCE(NEW.user_id, OLD.user_id);
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_role(v_actor, 'owner') THEN
    RAISE EXCEPTION 'Only owners can change roles';
  END IF;

  IF v_actor = v_target THEN
    RAISE EXCEPTION 'Owners cannot edit their own roles directly';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_emeralds(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  UPDATE public.profiles
  SET emeralds = emeralds + p_amount
  WHERE user_id = p_user_id
    AND emeralds + p_amount >= 0;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient emeralds or user not found';
  END IF;
END;
$$;

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

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_user_id AND is_banned IS TRUE) THEN
    RETURN jsonb_build_object('error', 'Account is banned');
  END IF;

  SELECT price, stock, is_on_sale, item_type, sale_start_time, sale_end_time
  INTO v_price, v_stock, v_is_on_sale, v_item_type, v_sale_start, v_sale_end
  FROM public.catalog_items
  WHERE id = p_item_id
  FOR UPDATE;

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

  IF v_item_type = 'limited' AND EXISTS (
    SELECT 1 FROM public.user_inventory WHERE user_id = v_user_id AND item_id = p_item_id
  ) THEN
    RETURN jsonb_build_object('error', 'You can only own one of this limited item');
  END IF;

  SELECT emeralds INTO v_user_emeralds
  FROM public.profiles
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_user_emeralds < v_price THEN
    RETURN jsonb_build_object('error', 'Not enough emeralds');
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  PERFORM set_config('app.bypass_inventory_guard', 'on', true);

  UPDATE public.profiles SET emeralds = emeralds - v_price WHERE user_id = v_user_id;

  IF v_stock IS NOT NULL THEN
    UPDATE public.catalog_items
    SET stock = stock - 1,
        is_on_sale = CASE WHEN stock - 1 <= 0 THEN false ELSE is_on_sale END
    WHERE id = p_item_id;
  END IF;

  INSERT INTO public.user_inventory (user_id, item_id, quantity, is_equipped)
  VALUES (v_user_id, p_item_id, 1, false);

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.change_username(p_new_username text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance int;
  v_username_cost int := 1000;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  p_new_username := trim(p_new_username);
  IF p_new_username IS NULL OR length(p_new_username) < 3 OR length(p_new_username) > 20 OR p_new_username !~ '^[A-Za-z0-9]+$' THEN
    RETURN json_build_object('success', false, 'message', 'Username must be 3-20 letters or numbers');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(p_new_username) AND user_id <> v_user_id) THEN
    RETURN json_build_object('success', false, 'message', 'Username already taken');
  END IF;

  SELECT emeralds INTO v_balance FROM public.profiles WHERE user_id = v_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Profile not found');
  END IF;
  IF v_balance < v_username_cost AND NOT (public.has_role(v_user_id, 'admin') OR public.has_role(v_user_id, 'owner')) THEN
    RETURN json_build_object('success', false, 'message', 'Need 1000 emeralds to change username');
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  UPDATE public.profiles
  SET username = p_new_username,
      emeralds = CASE WHEN public.has_role(v_user_id, 'admin') OR public.has_role(v_user_id, 'owner') THEN emeralds ELSE emeralds - v_username_cost END,
      updated_at = now()
  WHERE user_id = v_user_id;

  UPDATE public.game_chat SET username = p_new_username WHERE user_id = v_user_id;
  UPDATE public.sword_fight_kills SET username = p_new_username WHERE user_id = v_user_id;

  RETURN json_build_object('success', true, 'username', p_new_username);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group(p_name text, p_description text, p_icon_url text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance int;
  v_cost int := 250;
  v_group_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_user_id AND is_banned IS TRUE) THEN
    RETURN json_build_object('success', false, 'message', 'Account is banned');
  END IF;

  p_name := trim(p_name);
  IF p_name IS NULL OR length(p_name) < 3 OR length(p_name) > 32 THEN
    RETURN json_build_object('success', false, 'message', 'Name must be 3-32 characters');
  END IF;

  IF p_icon_url IS NULL OR length(trim(p_icon_url)) = 0 THEN
    RETURN json_build_object('success', false, 'message', 'Icon required');
  END IF;

  IF EXISTS (SELECT 1 FROM public.groups WHERE lower(name) = lower(p_name)) THEN
    RETURN json_build_object('success', false, 'message', 'Group name already taken');
  END IF;

  SELECT emeralds INTO v_balance FROM public.profiles WHERE user_id = v_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Profile not found');
  END IF;
  IF v_balance < v_cost THEN
    RETURN json_build_object('success', false, 'message', 'Need 250 emeralds to create a group');
  END IF;

  INSERT INTO public.groups (name, description, icon_url, owner_id, member_count)
  VALUES (p_name, COALESCE(left(p_description, 500), ''), p_icon_url, v_user_id, 0)
  RETURNING id INTO v_group_id;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'owner');

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles SET emeralds = emeralds - v_cost, updated_at = now() WHERE user_id = v_user_id;

  RETURN json_build_object('success', true, 'group_id', v_group_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_daily_emeralds()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_last_claim timestamptz;
  v_hours_since numeric;
  v_new_balance int;
  v_tier text;
  v_payout int;
  v_active boolean;
  v_expires timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  SELECT tier, active, expires_at INTO v_tier, v_active, v_expires
  FROM public.builders_club_subscriptions
  WHERE user_id = v_user_id;

  IF v_tier IS NULL OR v_active IS NOT TRUE OR v_expires <= now() THEN
    RETURN json_build_object('success', false, 'message', 'Builders Club required');
  END IF;

  SELECT last_daily_claim INTO v_last_claim
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_last_claim IS NOT NULL THEN
    v_hours_since := EXTRACT(EPOCH FROM (now() - v_last_claim)) / 3600;
    IF v_hours_since < 24 THEN
      RETURN json_build_object('success', false, 'message', 'Already claimed today');
    END IF;
  END IF;

  v_payout := CASE v_tier
    WHEN 'classic' THEN 130
    WHEN 'turbo' THEN 200
    WHEN 'outrageous' THEN 300
    ELSE 0
  END;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
  SET emeralds = emeralds + v_payout,
      last_daily_claim = now(),
      updated_at = now()
  WHERE user_id = v_user_id
  RETURNING emeralds INTO v_new_balance;

  RETURN json_build_object('success', true, 'emeralds', v_new_balance, 'payout', v_payout);
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_builders_club(p_tier text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cost int;
  v_balance int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  v_cost := CASE p_tier
    WHEN 'classic' THEN 1500
    WHEN 'turbo' THEN 2500
    WHEN 'outrageous' THEN 4000
    ELSE NULL
  END;

  IF v_cost IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid Builders Club tier');
  END IF;

  SELECT emeralds INTO v_balance FROM public.profiles WHERE user_id = v_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Profile not found');
  END IF;
  IF v_balance < v_cost THEN
    RETURN json_build_object('success', false, 'message', 'Not enough emeralds');
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
  SET emeralds = emeralds - v_cost, updated_at = now()
  WHERE user_id = v_user_id;

  INSERT INTO public.builders_club_subscriptions (user_id, tier, active, activated_at, expires_at)
  VALUES (v_user_id, p_tier, true, now(), now() + interval '30 days')
  ON CONFLICT (user_id) DO UPDATE
    SET tier = EXCLUDED.tier,
        active = true,
        activated_at = now(),
        expires_at = now() + interval '30 days',
        updated_at = now();

  RETURN json_build_object('success', true);
END;
$$;