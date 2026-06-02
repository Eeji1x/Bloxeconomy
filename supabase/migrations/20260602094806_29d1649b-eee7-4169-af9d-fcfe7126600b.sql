-- Security hardening: lock sensitive profile fields from direct user edits.
CREATE OR REPLACE FUNCTION public.restrict_profile_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner') THEN
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

DROP TRIGGER IF EXISTS restrict_profile_self_update_trigger ON public.profiles;
DROP TRIGGER IF EXISTS trg_restrict_profile_self_update ON public.profiles;
CREATE TRIGGER restrict_profile_self_update_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.restrict_profile_self_update();

-- Security hardening: users can only toggle equipped state on inventory they own.
CREATE OR REPLACE FUNCTION public.restrict_inventory_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner') THEN
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

DROP TRIGGER IF EXISTS restrict_inventory_self_update_trigger ON public.user_inventory;
CREATE TRIGGER restrict_inventory_self_update_trigger
BEFORE UPDATE ON public.user_inventory
FOR EACH ROW
EXECUTE FUNCTION public.restrict_inventory_self_update();

-- Security hardening: only owners can modify roles, and nobody can edit their own role row directly.
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

DROP TRIGGER IF EXISTS restrict_user_roles_mutation_trigger ON public.user_roles;
CREATE TRIGGER restrict_user_roles_mutation_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.restrict_user_roles_mutation();

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners can delete roles" ON public.user_roles;

CREATE POLICY "Owners can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_owner(auth.uid()) AND auth.uid() <> user_id);

CREATE POLICY "Owners can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_owner(auth.uid()) AND auth.uid() <> user_id)
WITH CHECK (public.is_owner(auth.uid()) AND auth.uid() <> user_id);

CREATE POLICY "Owners can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_owner(auth.uid()) AND auth.uid() <> user_id);

-- Security hardening: only staff can purge game chat from admin tools.
CREATE OR REPLACE FUNCTION public.clear_game_chat(p_game_id text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  IF NOT (public.has_role(v_user_id, 'admin') OR public.has_role(v_user_id, 'owner')) THEN
    RETURN json_build_object('success', false, 'message', 'Forbidden');
  END IF;

  IF p_game_id IS NULL THEN
    WITH deleted AS (DELETE FROM public.game_chat RETURNING 1)
    SELECT count(*) INTO v_count FROM deleted;
  ELSE
    WITH deleted AS (DELETE FROM public.game_chat WHERE game_id = p_game_id RETURNING 1)
    SELECT count(*) INTO v_count FROM deleted;
  END IF;

  RETURN json_build_object('success', true, 'cleared', v_count);
END;
$$;

-- Admin group manager: single safe endpoint for staff group edits.
CREATE OR REPLACE FUNCTION public.admin_update_group(
  p_group_id uuid,
  p_name text,
  p_description text,
  p_icon_url text,
  p_is_verified boolean,
  p_is_locked boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  IF NOT (public.has_role(v_user_id, 'admin') OR public.has_role(v_user_id, 'owner')) THEN
    RETURN json_build_object('success', false, 'message', 'Forbidden');
  END IF;

  p_name := trim(p_name);
  IF p_name IS NULL OR length(p_name) < 3 OR length(p_name) > 32 THEN
    RETURN json_build_object('success', false, 'message', 'Name must be 3-32 characters');
  END IF;

  IF EXISTS (SELECT 1 FROM public.groups WHERE lower(name) = lower(p_name) AND id <> p_group_id) THEN
    RETURN json_build_object('success', false, 'message', 'Group name already taken');
  END IF;

  UPDATE public.groups
  SET name = p_name,
      description = COALESCE(left(p_description, 500), ''),
      icon_url = COALESCE(NULLIF(trim(p_icon_url), ''), icon_url),
      is_verified = COALESCE(p_is_verified, is_verified),
      is_locked = COALESCE(p_is_locked, is_locked),
      updated_at = now()
  WHERE id = p_group_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Group not found');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;