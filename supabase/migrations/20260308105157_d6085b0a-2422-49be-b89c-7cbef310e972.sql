
-- Allow economy managers to manage item_values
CREATE POLICY "Economy managers can insert item values"
ON public.item_values FOR INSERT TO authenticated
WITH CHECK (is_economy_manager(auth.uid()));

CREATE POLICY "Economy managers can update item values"
ON public.item_values FOR UPDATE TO authenticated
USING (is_economy_manager(auth.uid()));

CREATE POLICY "Economy managers can delete item values"
ON public.item_values FOR DELETE TO authenticated
USING (is_economy_manager(auth.uid()));

-- Allow economy managers to manage item_tags
CREATE POLICY "Economy managers can insert item tags"
ON public.item_tags FOR INSERT TO authenticated
WITH CHECK (is_economy_manager(auth.uid()));

CREATE POLICY "Economy managers can delete item tags"
ON public.item_tags FOR DELETE TO authenticated
USING (is_economy_manager(auth.uid()));

-- Allow economy managers to insert value_history
CREATE POLICY "Economy managers can insert value history"
ON public.value_history FOR INSERT TO authenticated
WITH CHECK (is_economy_manager(auth.uid()));
