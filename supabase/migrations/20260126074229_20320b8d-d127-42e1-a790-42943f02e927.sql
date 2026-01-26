-- Add verified badge and daily claim support to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_daily_claim timestamp with time zone DEFAULT NULL;

-- Update RLS policy for admins to update any profile (for giving verified badge, emeralds, etc.)
CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (is_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_numeric_id ON public.profiles(numeric_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);