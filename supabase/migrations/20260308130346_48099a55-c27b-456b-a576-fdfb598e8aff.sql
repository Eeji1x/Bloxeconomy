-- Allow staff roles to delete lottery prize rows (needed for catalog item force-delete)
DROP POLICY IF EXISTS "Admins can delete lottery prizes" ON public.lottery_prizes;
DROP POLICY IF EXISTS "Owners can delete lottery prizes" ON public.lottery_prizes;

CREATE POLICY "Admins can delete lottery prizes"
ON public.lottery_prizes
FOR DELETE
USING (is_admin(auth.uid()));

CREATE POLICY "Owners can delete lottery prizes"
ON public.lottery_prizes
FOR DELETE
USING (is_owner(auth.uid()));