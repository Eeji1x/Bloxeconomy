-- Fix RLS policies for item_serials - only allow authenticated users to insert/update
DROP POLICY IF EXISTS "System can insert serials" ON public.item_serials;
DROP POLICY IF EXISTS "System can update serials" ON public.item_serials;

-- Allow authenticated users to insert (triggers handle the actual inserts)
CREATE POLICY "Authenticated users can insert serials" 
ON public.item_serials 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update their own serials or admins to update any
CREATE POLICY "Users can update own serials or admins" 
ON public.item_serials 
FOR UPDATE 
USING (owner_id = auth.uid() OR is_admin(auth.uid()));