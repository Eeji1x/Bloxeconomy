ALTER TABLE public.lotteries ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 1440;
UPDATE public.lotteries SET duration_minutes = duration_hours * 60 WHERE duration_minutes = 1440;
ALTER TABLE public.lotteries DROP COLUMN IF EXISTS duration_hours;