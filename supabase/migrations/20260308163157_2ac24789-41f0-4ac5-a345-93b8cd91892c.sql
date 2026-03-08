CREATE POLICY "Admins can insert inventory"
ON public.user_inventory
FOR INSERT
WITH CHECK (is_admin(auth.uid()));