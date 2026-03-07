
-- Create admin_logs table for audit trail
CREATE TABLE public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view all logs"
ON public.admin_logs FOR SELECT
USING (public.is_admin(auth.uid()));

-- Only admins can insert logs
CREATE POLICY "Admins can insert logs"
ON public.admin_logs FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));
