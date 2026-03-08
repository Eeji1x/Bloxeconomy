
-- Item values table for Sodamons
CREATE TABLE public.item_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  value integer NOT NULL DEFAULT 0,
  demand text NOT NULL DEFAULT 'Normal' CHECK (demand IN ('Low', 'Normal', 'High', 'Very High')),
  trend text NOT NULL DEFAULT 'Stable' CHECK (trend IN ('Rising', 'Stable', 'Dropping', 'Unstable')),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE(item_id)
);

ALTER TABLE public.item_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view item values" ON public.item_values FOR SELECT USING (true);
CREATE POLICY "Admins can insert item values" ON public.item_values FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update item values" ON public.item_values FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete item values" ON public.item_values FOR DELETE USING (is_admin(auth.uid()));

-- Value history table
CREATE TABLE public.value_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  old_value integer,
  new_value integer NOT NULL,
  old_demand text,
  new_demand text,
  old_trend text,
  new_trend text,
  changed_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.value_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view value history" ON public.value_history FOR SELECT USING (true);
CREATE POLICY "Admins can insert value history" ON public.value_history FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- Item tags table
CREATE TABLE public.item_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(item_id, tag)
);

ALTER TABLE public.item_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view item tags" ON public.item_tags FOR SELECT USING (true);
CREATE POLICY "Admins can insert item tags" ON public.item_tags FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can delete item tags" ON public.item_tags FOR DELETE USING (is_admin(auth.uid()));
