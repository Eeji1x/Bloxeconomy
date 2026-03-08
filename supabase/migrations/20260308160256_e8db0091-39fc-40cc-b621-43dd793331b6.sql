
-- Add short_id to applications (random string like "APP-XXXXXX")
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS short_id text UNIQUE;

-- Backfill existing applications with a short_id
UPDATE public.applications SET short_id = 'APP-' || upper(substr(md5(random()::text), 1, 8)) WHERE short_id IS NULL;

-- Make short_id NOT NULL with a default
ALTER TABLE public.applications ALTER COLUMN short_id SET DEFAULT 'APP-' || upper(substr(md5(random()::text), 1, 8));

-- Create registration_tokens table
CREATE TABLE public.registration_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  username text NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  used_by uuid
);

-- Enable RLS
ALTER TABLE public.registration_tokens ENABLE ROW LEVEL SECURITY;

-- Admins/owners can manage tokens
CREATE POLICY "Admins can view tokens" ON public.registration_tokens FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Owners can view tokens" ON public.registration_tokens FOR SELECT TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Admins can insert tokens" ON public.registration_tokens FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Owners can insert tokens" ON public.registration_tokens FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Admins can update tokens" ON public.registration_tokens FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Owners can update tokens" ON public.registration_tokens FOR UPDATE TO authenticated USING (is_owner(auth.uid()));
