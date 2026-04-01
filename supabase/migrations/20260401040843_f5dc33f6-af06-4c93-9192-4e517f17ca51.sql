
-- Create storage bucket for catalog item images
INSERT INTO storage.buckets (id, name, public) VALUES ('catalog-images', 'catalog-images', true);

-- Allow admins, owners, and economy managers to upload to catalog-images
CREATE POLICY "Staff can upload catalog images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'catalog-images' AND (
    public.is_admin(auth.uid()) OR public.is_owner(auth.uid()) OR public.is_economy_manager(auth.uid())
  )
);

-- Anyone can view catalog images
CREATE POLICY "Anyone can view catalog images" ON storage.objects FOR SELECT USING (
  bucket_id = 'catalog-images'
);

-- Staff can delete catalog images
CREATE POLICY "Staff can delete catalog images" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'catalog-images' AND (
    public.is_admin(auth.uid()) OR public.is_owner(auth.uid()) OR public.is_economy_manager(auth.uid())
  )
);

-- Create beta_keys table
CREATE TABLE public.beta_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  feature TEXT NOT NULL DEFAULT 'games',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID,
  used_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.beta_keys ENABLE ROW LEVEL SECURITY;

-- Admins/owners can manage beta keys
CREATE POLICY "Admins can view beta keys" ON public.beta_keys FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR public.is_owner(auth.uid()));
CREATE POLICY "Admins can insert beta keys" ON public.beta_keys FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) OR public.is_owner(auth.uid()));
CREATE POLICY "Admins can update beta keys" ON public.beta_keys FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR public.is_owner(auth.uid()));
CREATE POLICY "Admins can delete beta keys" ON public.beta_keys FOR DELETE TO authenticated USING (public.is_admin(auth.uid()) OR public.is_owner(auth.uid()));

-- Users can view their own redeemed keys
CREATE POLICY "Users can view own beta keys" ON public.beta_keys FOR SELECT TO authenticated USING (used_by = auth.uid());

-- Create beta_access table to track which features users have access to
CREATE TABLE public.beta_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature TEXT NOT NULL DEFAULT 'games',
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  beta_key_id UUID REFERENCES public.beta_keys(id),
  UNIQUE(user_id, feature)
);

ALTER TABLE public.beta_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own beta access" ON public.beta_access FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all beta access" ON public.beta_access FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR public.is_owner(auth.uid()));
CREATE POLICY "Admins can insert beta access" ON public.beta_access FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) OR public.is_owner(auth.uid()));
CREATE POLICY "Users can insert own beta access" ON public.beta_access FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can delete beta access" ON public.beta_access FOR DELETE TO authenticated USING (public.is_admin(auth.uid()) OR public.is_owner(auth.uid()));
