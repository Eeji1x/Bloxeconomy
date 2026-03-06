
-- Create invite_keys table
CREATE TABLE public.invite_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  used_by uuid NULL,
  used_at timestamp with time zone NULL,
  is_used boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.invite_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can view all keys
CREATE POLICY "Admins can view all invite keys"
  ON public.invite_keys FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Only admins can insert keys
CREATE POLICY "Admins can insert invite keys"
  ON public.invite_keys FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can delete keys
CREATE POLICY "Admins can delete invite keys"
  ON public.invite_keys FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Only admins can update keys
CREATE POLICY "Admins can update invite keys"
  ON public.invite_keys FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));
