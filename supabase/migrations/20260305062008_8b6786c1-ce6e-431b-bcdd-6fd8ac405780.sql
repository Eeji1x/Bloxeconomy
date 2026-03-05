-- Compute next available profile numeric ID (starts at 2, skips reserved 5)
CREATE OR REPLACE FUNCTION public.next_profile_numeric_id()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  candidate integer := 2;
BEGIN
  LOOP
    IF candidate = 5 THEN
      candidate := candidate + 1;
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE numeric_id = candidate
    ) THEN
      RETURN candidate;
    END IF;

    candidate := candidate + 1;
  END LOOP;
END;
$function$;

-- Keep numeric_id auto-assigned at DB level for normal signups
ALTER TABLE public.profiles
ALTER COLUMN numeric_id SET DEFAULT public.next_profile_numeric_id();