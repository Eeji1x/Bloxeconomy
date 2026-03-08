
-- Create a secure server-side function for daily emerald claims
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
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  SELECT last_daily_claim INTO v_last_claim
  FROM profiles
  WHERE user_id = v_user_id;

  IF v_last_claim IS NOT NULL THEN
    v_hours_since := EXTRACT(EPOCH FROM (now() - v_last_claim)) / 3600;
    IF v_hours_since < 24 THEN
      RETURN json_build_object('success', false, 'message', 'Already claimed today');
    END IF;
  END IF;

  UPDATE profiles
  SET emeralds = emeralds + 100,
      last_daily_claim = now()
  WHERE user_id = v_user_id
  RETURNING emeralds INTO v_new_balance;

  RETURN json_build_object('success', true, 'emeralds', v_new_balance);
END;
$$;
