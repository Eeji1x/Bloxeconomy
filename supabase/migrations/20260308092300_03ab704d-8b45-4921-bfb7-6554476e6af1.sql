-- Create a helper function to check if user is economy manager
CREATE OR REPLACE FUNCTION public.is_economy_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'economy_manager')
$$;

-- Allow economy managers to insert catalog items
CREATE POLICY "Economy managers can insert items"
ON public.catalog_items
FOR INSERT
TO authenticated
WITH CHECK (is_economy_manager(auth.uid()));

-- Allow economy managers to update catalog items
CREATE POLICY "Economy managers can update items"
ON public.catalog_items
FOR UPDATE
TO authenticated
USING (is_economy_manager(auth.uid()));

-- Allow economy managers to delete catalog items
CREATE POLICY "Economy managers can delete items"
ON public.catalog_items
FOR DELETE
TO authenticated
USING (is_economy_manager(auth.uid()));

-- Allow economy managers to insert promocodes
CREATE POLICY "Economy managers can insert promocodes"
ON public.promocodes
FOR INSERT
TO authenticated
WITH CHECK (is_economy_manager(auth.uid()));

-- Allow economy managers to update promocodes
CREATE POLICY "Economy managers can update promocodes"
ON public.promocodes
FOR UPDATE
TO authenticated
USING (is_economy_manager(auth.uid()));

-- Allow economy managers to delete promocodes
CREATE POLICY "Economy managers can delete promocodes"
ON public.promocodes
FOR DELETE
TO authenticated
USING (is_economy_manager(auth.uid()));

-- Allow economy managers to view all promocodes (including inactive)
CREATE POLICY "Economy managers can view all promocodes"
ON public.promocodes
FOR SELECT
TO authenticated
USING (is_economy_manager(auth.uid()));