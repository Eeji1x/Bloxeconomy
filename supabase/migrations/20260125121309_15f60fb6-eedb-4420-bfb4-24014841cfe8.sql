-- Create custom types
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.item_type AS ENUM ('normal', 'limited', 'giftbox');
CREATE TYPE public.trade_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled');
CREATE TYPE public.friend_status AS ENUM ('pending', 'accepted', 'declined');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    numeric_id SERIAL,
    emeralds INTEGER NOT NULL DEFAULT 100,
    avatar_data JSONB DEFAULT '{}',
    is_online BOOLEAN DEFAULT false,
    is_banned BOOLEAN DEFAULT false,
    ban_reason TEXT,
    last_seen TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    UNIQUE (user_id, role)
);

-- Create catalog_items table
CREATE TABLE public.catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    item_type item_type NOT NULL DEFAULT 'normal',
    price INTEGER NOT NULL DEFAULT 1,
    stock INTEGER,
    max_stock INTEGER,
    is_on_sale BOOLEAN DEFAULT true,
    is_giftbox BOOLEAN DEFAULT false,
    giftbox_reward_id UUID REFERENCES public.catalog_items(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_inventory table
CREATE TABLE public.user_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES public.catalog_items(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    is_equipped BOOLEAN DEFAULT false,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create trades table
CREATE TABLE public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    sender_items UUID[] DEFAULT '{}',
    receiver_items UUID[] DEFAULT '{}',
    sender_emeralds INTEGER DEFAULT 0,
    receiver_emeralds INTEGER DEFAULT 0,
    status trade_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create friends table
CREATE TABLE public.friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    addressee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status friend_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (requester_id, addressee_id)
);

-- Create promocodes table
CREATE TABLE public.promocodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    emerald_reward INTEGER DEFAULT 0,
    item_reward_id UUID REFERENCES public.catalog_items(id),
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create promocode_redemptions table
CREATE TABLE public.promocode_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promocode_id UUID REFERENCES public.promocodes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (promocode_id, user_id)
);

-- Create announcements table
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    link_url TEXT,
    link_text TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocode_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Security definer function to check admin role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
            AND role = _role
    )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'admin')
$$;

-- Function to get next numeric ID and assign admin if ID = 1
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_numeric_id INTEGER;
BEGIN
    -- Get the next numeric ID
    SELECT COALESCE(MAX(numeric_id), 0) + 1 INTO new_numeric_id FROM public.profiles;
    
    -- Update the profile with the numeric ID
    NEW.numeric_id := new_numeric_id;
    
    -- If this is the first user (ID = 1), make them admin
    IF new_numeric_id = 1 THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.user_id, 'admin');
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_profile_created
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_catalog_items_updated_at BEFORE UPDATE ON public.catalog_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON public.trades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles (only admins can modify, everyone can read)
CREATE POLICY "User roles viewable by everyone" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.is_admin(auth.uid()));

-- RLS Policies for catalog_items
CREATE POLICY "Catalog items viewable by everyone" ON public.catalog_items FOR SELECT USING (true);
CREATE POLICY "Admins can insert items" ON public.catalog_items FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update items" ON public.catalog_items FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete items" ON public.catalog_items FOR DELETE USING (public.is_admin(auth.uid()));

-- RLS Policies for user_inventory
CREATE POLICY "Users can view own inventory" ON public.user_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert to own inventory" ON public.user_inventory FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users can update own inventory" ON public.user_inventory FOR UPDATE USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users can delete from own inventory" ON public.user_inventory FOR DELETE USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- RLS Policies for trades
CREATE POLICY "Users can view own trades" ON public.trades FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can create trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Trade participants can update" ON public.trades FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- RLS Policies for friends
CREATE POLICY "Users can view own friendships" ON public.friends FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can send friend requests" ON public.friends FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update friend status" ON public.friends FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can remove friendships" ON public.friends FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- RLS Policies for promocodes
CREATE POLICY "Active promocodes viewable by everyone" ON public.promocodes FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage promocodes" ON public.promocodes FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update promocodes" ON public.promocodes FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete promocodes" ON public.promocodes FOR DELETE USING (public.is_admin(auth.uid()));

-- RLS Policies for promocode_redemptions
CREATE POLICY "Users can view own redemptions" ON public.promocode_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can redeem codes" ON public.promocode_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for announcements
CREATE POLICY "Announcements viewable by everyone" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update announcements" ON public.announcements FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete announcements" ON public.announcements FOR DELETE USING (public.is_admin(auth.uid()));

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_inventory;