DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker=on) AS
  SELECT 
    id,
    user_id,
    username,
    numeric_id,
    avatar_data,
    is_online,
    is_verified,
    created_at,
    updated_at,
    last_seen,
    emeralds
  FROM public.profiles;