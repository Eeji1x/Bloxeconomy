-- Create resale_listings table for item reselling
CREATE TABLE public.resale_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL,
    item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.user_inventory(id) ON DELETE CASCADE,
    price INTEGER NOT NULL CHECK (price > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(inventory_id)
);

-- Enable RLS on resale_listings
ALTER TABLE public.resale_listings ENABLE ROW LEVEL SECURITY;

-- RLS policies for resale_listings
CREATE POLICY "Resale listings viewable by everyone" 
ON public.resale_listings FOR SELECT 
USING (true);

CREATE POLICY "Users can create own listings" 
ON public.resale_listings FOR INSERT 
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update own listings" 
ON public.resale_listings FOR UPDATE 
USING (auth.uid() = seller_id OR is_admin(auth.uid()));

CREATE POLICY "Users can delete own listings or admins" 
ON public.resale_listings FOR DELETE 
USING (auth.uid() = seller_id OR is_admin(auth.uid()));

-- Add banned_by and banned_at to profiles for tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banned_by UUID,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;

-- Enable realtime for trades
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;

-- Create index for faster trade lookups
CREATE INDEX IF NOT EXISTS idx_trades_sender ON public.trades(sender_id);
CREATE INDEX IF NOT EXISTS idx_trades_receiver ON public.trades(receiver_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);

-- Create index for resale listings
CREATE INDEX IF NOT EXISTS idx_resale_item ON public.resale_listings(item_id);
CREATE INDEX IF NOT EXISTS idx_resale_seller ON public.resale_listings(seller_id);