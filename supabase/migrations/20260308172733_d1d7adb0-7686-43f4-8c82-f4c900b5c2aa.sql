
-- Add model_url column to catalog_items
ALTER TABLE public.catalog_items ADD COLUMN model_url text DEFAULT NULL;

-- Create storage bucket for 3D models
INSERT INTO storage.buckets (id, name, public) VALUES ('item-models', 'item-models', true);

-- Allow authenticated staff to upload models
CREATE POLICY "Staff can upload models"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'item-models' AND (
    public.is_admin(auth.uid()) OR 
    public.is_owner(auth.uid()) OR 
    public.is_economy_manager(auth.uid())
  )
);

-- Allow anyone to view models
CREATE POLICY "Anyone can view models"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'item-models');

-- Allow staff to delete models
CREATE POLICY "Staff can delete models"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'item-models' AND (
    public.is_admin(auth.uid()) OR 
    public.is_owner(auth.uid()) OR 
    public.is_economy_manager(auth.uid())
  )
);
