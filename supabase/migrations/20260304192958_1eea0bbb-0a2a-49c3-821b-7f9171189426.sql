
-- Update handle_new_user to fill gaps in numeric_id and always skip ID 5 (reserved)
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
    -- If numeric_id is already set (admin-created user with custom ID), keep it
    IF NEW.numeric_id IS NOT NULL AND NEW.numeric_id > 0 THEN
        RETURN NEW;
    END IF;
    
    -- Find the lowest available numeric_id starting from 1, skipping 5 (reserved for BadDecisions)
    candidate := 1;
    LOOP
        -- Skip ID 5 which is always reserved for BadDecisions
        IF candidate = 5 THEN
            candidate := candidate + 1;
            CONTINUE;
        END IF;
        
        -- Check if this candidate ID is taken
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE numeric_id = candidate) THEN
            new_numeric_id := candidate;
            EXIT;
        END IF;
        
        candidate := candidate + 1;
    END LOOP;
    
    NEW.numeric_id := new_numeric_id;
    
    -- If this is user ID 1, make them admin
    IF new_numeric_id = 1 THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.user_id, 'admin');
    END IF;
    
    RETURN NEW;
END;
$function$;
