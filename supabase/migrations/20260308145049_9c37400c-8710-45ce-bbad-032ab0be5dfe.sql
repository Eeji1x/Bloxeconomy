
-- Applications table for users to apply to join
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an application (even unauthenticated via edge function)
CREATE POLICY "Anyone can view own application by username"
  ON public.applications FOR SELECT
  USING (true);

CREATE POLICY "Admins can update applications"
  ON public.applications FOR UPDATE
  USING (is_admin(auth.uid()) OR is_owner(auth.uid()));

CREATE POLICY "Anyone can insert applications"
  ON public.applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can delete applications"
  ON public.applications FOR DELETE
  USING (is_admin(auth.uid()) OR is_owner(auth.uid()));
