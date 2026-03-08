-- Atomic emerald adjustment to prevent race conditions
CREATE OR REPLACE FUNCTION public.adjust_emeralds(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET emeralds = emeralds + p_amount
  WHERE user_id = p_user_id
    AND emeralds + p_amount >= 0;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient emeralds or user not found';
  END IF;
END;
$$;