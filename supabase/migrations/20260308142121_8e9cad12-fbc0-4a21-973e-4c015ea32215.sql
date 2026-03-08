-- Create a safe public profile view (excludes banned accounts and sensitive moderation fields)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  user_id,
  username,
  numeric_id,
  emeralds,
  avatar_data,
  is_online,
  is_verified,
  created_at,
  updated_at,
  last_seen
FROM public.profiles
WHERE COALESCE(is_banned, false) = false;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Tighten profile read access
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all profiles"
ON public.profiles
FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR public.is_owner(auth.uid())
  OR public.is_economy_manager(auth.uid())
);

-- Prevent users from changing ownership of profile rows
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);