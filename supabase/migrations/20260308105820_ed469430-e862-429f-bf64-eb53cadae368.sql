
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'owner')
$$;

CREATE POLICY "Owners can insert item values" ON public.item_values FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can update item values" ON public.item_values FOR UPDATE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can delete item values" ON public.item_values FOR DELETE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can insert item tags" ON public.item_tags FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can delete item tags" ON public.item_tags FOR DELETE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can insert value history" ON public.value_history FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can insert catalog items" ON public.catalog_items FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can update catalog items" ON public.catalog_items FOR UPDATE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can delete catalog items" ON public.catalog_items FOR DELETE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can insert promocodes" ON public.promocodes FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can update promocodes" ON public.promocodes FOR UPDATE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can delete promocodes" ON public.promocodes FOR DELETE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can view all promocodes" ON public.promocodes FOR SELECT TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can insert announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can update announcements" ON public.announcements FOR UPDATE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can delete announcements" ON public.announcements FOR DELETE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can insert invite keys" ON public.invite_keys FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can update invite keys" ON public.invite_keys FOR UPDATE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can delete invite keys" ON public.invite_keys FOR DELETE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can view invite keys" ON public.invite_keys FOR SELECT TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can insert site settings" ON public.site_settings FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can update site settings" ON public.site_settings FOR UPDATE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can insert admin logs" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can view admin logs" ON public.admin_logs FOR SELECT TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can update messages" ON public.messages FOR UPDATE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can insert inventory" ON public.user_inventory FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can update inventory" ON public.user_inventory FOR UPDATE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can delete inventory" ON public.user_inventory FOR DELETE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can insert serials" ON public.item_serials FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can update serials" ON public.item_serials FOR UPDATE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can delete serials" ON public.item_serials FOR DELETE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can delete resale listings" ON public.resale_listings FOR DELETE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can update resale listings" ON public.resale_listings FOR UPDATE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can insert lotteries" ON public.lotteries FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can update lotteries" ON public.lotteries FOR UPDATE TO authenticated USING (is_owner(auth.uid()));
CREATE POLICY "Owners can insert lottery prizes" ON public.lottery_prizes FOR INSERT TO authenticated WITH CHECK (is_owner(auth.uid()));
CREATE POLICY "Owners can update lottery prizes" ON public.lottery_prizes FOR UPDATE TO authenticated USING (is_owner(auth.uid()));
