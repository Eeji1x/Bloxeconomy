
-- Site settings table for maintenance mode
CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update site settings" ON public.site_settings FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert site settings" ON public.site_settings FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- Insert default maintenance mode setting
INSERT INTO public.site_settings (key, value) VALUES ('maintenance_mode', '{"enabled": false}'::jsonb);

-- Messages table for private messaging
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id OR is_admin(auth.uid()));
CREATE POLICY "Users can update own received messages" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id OR is_admin(auth.uid()));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Lotteries table
CREATE TABLE public.lotteries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  duration_hours integer NOT NULL DEFAULT 24,
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lotteries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lotteries" ON public.lotteries FOR SELECT USING (true);
CREATE POLICY "Admins can manage lotteries" ON public.lotteries FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update lotteries" ON public.lotteries FOR UPDATE USING (is_admin(auth.uid()));

-- Lottery prizes table
CREATE TABLE public.lottery_prizes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lottery_id uuid NOT NULL REFERENCES public.lotteries(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.catalog_items(id),
  inventory_id uuid NOT NULL REFERENCES public.user_inventory(id),
  winner_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lottery_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lottery prizes" ON public.lottery_prizes FOR SELECT USING (true);
CREATE POLICY "Admins can manage lottery prizes" ON public.lottery_prizes FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update lottery prizes" ON public.lottery_prizes FOR UPDATE USING (is_admin(auth.uid()));

-- Add sale timer fields to catalog_items
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS sale_start_time timestamp with time zone;
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS sale_end_time timestamp with time zone;
