
-- ============================================
-- FIX 1: Lock down profile self-updates
-- Users should ONLY be able to update: avatar_data, is_online, last_seen
-- NOT: emeralds, is_banned, ban_reason, banned_by, banned_at, is_verified, numeric_id, username
-- ============================================

CREATE OR REPLACE FUNCTION public.restrict_profile_self_update()
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

  -- Lock sensitive fields for regular users
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

CREATE TRIGGER restrict_profile_self_update_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_profile_self_update();

-- ============================================
-- FIX 2: Restrict user_roles visibility
-- Users should only see their own roles
-- ============================================

DROP POLICY IF EXISTS "User roles viewable by everyone" ON public.user_roles;

CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- FIX 3: Restrict promocodes visibility
-- Only let authenticated users check codes, not enumerate all
-- ============================================

DROP POLICY IF EXISTS "Active promocodes viewable by everyone" ON public.promocodes;

CREATE POLICY "Authenticated users can view active promocodes"
  ON public.promocodes
  FOR SELECT
  TO authenticated
  USING (is_active = true);
