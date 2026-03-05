-- Ensure numeric_id is trigger-assigned (not default-assigned)
ALTER TABLE public.profiles
ALTER COLUMN numeric_id DROP DEFAULT;

-- Assign numeric IDs deterministically:
-- - keep explicit custom ID when provided
-- - auto-assign lowest available ID starting at 2
-- - always skip 5 (reserved for BadDecisions)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_numeric_id INTEGER;
  candidate INTEGER;
BEGIN
  -- Respect explicit numeric_id (admin custom creation path)
  IF NEW.numeric_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  candidate := 2;
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
      new_numeric_id := candidate;
      EXIT;
    END IF;

    candidate := candidate + 1;
  END LOOP;

  NEW.numeric_id := new_numeric_id;
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS profiles_assign_numeric_id ON public.profiles;
CREATE TRIGGER profiles_assign_numeric_id
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Helper function used by wipe routine to reset the sequence baseline
CREATE OR REPLACE FUNCTION public.reset_profiles_numeric_id_seq()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM setval('public.profiles_numeric_id_seq', 1, true);
END;
$function$;