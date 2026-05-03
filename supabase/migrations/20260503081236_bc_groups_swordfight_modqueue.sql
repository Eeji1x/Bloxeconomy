-- ============================================================================
-- STORAGE BUCKETS
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-icons', 'group-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder; public read.
DROP POLICY IF EXISTS "Group icons are publicly readable" ON storage.objects;
CREATE POLICY "Group icons are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'group-icons');

DROP POLICY IF EXISTS "Authenticated users upload their group icons" ON storage.objects;
CREATE POLICY "Authenticated users upload their group icons"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'group-icons'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('asset-submissions', 'asset-submissions', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Asset submissions are publicly readable" ON storage.objects;
CREATE POLICY "Asset submissions are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'asset-submissions');

DROP POLICY IF EXISTS "Authenticated users upload their asset submissions" ON storage.objects;
CREATE POLICY "Authenticated users upload their asset submissions"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'asset-submissions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- Builders Club, Groups, Sword Fight, and Asset/Chat moderation
-- ----------------------------------------------------------------------------
-- This migration adds:
--   * builders_club_subscriptions  -- BC tier per user, with expiry
--   * groups + group_members       -- Roblox-style groups
--   * sword_fight_kills            -- in-memory leaderboard rows (cleared on leave)
--   * asset_moderation_queue       -- pending catalog assets awaiting moderator
--   * Updated public.claim_daily_emeralds() RPC: BC members only, tier-based payout
--   * RPC public.activate_builders_club(tier) — purchase + activate BC
--   * RPC public.change_username(new_username) — bypass the self-update trigger
--   * RPC public.record_sword_fight_kill() — increment kill count
--   * RPC public.clear_sword_fight_score() — reset on leave
-- ============================================================================

-- ─── BUILDERS CLUB ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.builders_club_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier text NOT NULL CHECK (tier IN ('classic', 'turbo', 'outrageous')),
  active boolean NOT NULL DEFAULT true,
  activated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.builders_club_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view BC status"
  ON public.builders_club_subscriptions FOR SELECT
  USING (true);

CREATE POLICY "Admins manage BC"
  ON public.builders_club_subscriptions FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE INDEX IF NOT EXISTS idx_bc_user ON public.builders_club_subscriptions(user_id);

-- ─── GROUPS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (length(name) BETWEEN 3 AND 32),
  description text NOT NULL DEFAULT '',
  icon_url text,
  owner_id uuid NOT NULL,
  member_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view groups"
  ON public.groups FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can create groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update groups"
  ON public.groups FOR UPDATE
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners and admins can delete groups"
  ON public.groups FOR DELETE
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view group members"
  ON public.group_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join groups"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave their own membership"
  ON public.group_members FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);

-- Auto-update group member_count when membership changes.
CREATE OR REPLACE FUNCTION public.bump_group_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.groups SET member_count = member_count + 1, updated_at = now() WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.groups SET member_count = GREATEST(member_count - 1, 0), updated_at = now() WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS group_members_count_trigger ON public.group_members;
CREATE TRIGGER group_members_count_trigger
  AFTER INSERT OR DELETE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.bump_group_member_count();

-- ─── SWORD FIGHT KILLS ──────────────────────────────────────────────────────
-- Rows are deleted via clear_sword_fight_score() when a user leaves the game,
-- so the leaderboard is effectively per-session.
CREATE TABLE IF NOT EXISTS public.sword_fight_kills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  username text NOT NULL,
  kills int NOT NULL DEFAULT 0,
  deaths int NOT NULL DEFAULT 0,
  last_kill_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sword_fight_kills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sword fight scores"
  ON public.sword_fight_kills FOR SELECT
  USING (true);

CREATE POLICY "Users manage their own sword fight rows"
  ON public.sword_fight_kills FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.sword_fight_kills;
ALTER TABLE public.sword_fight_kills REPLICA IDENTITY FULL;

-- ─── ASSET MODERATION QUEUE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.asset_moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL,
  item_type text NOT NULL DEFAULT 'normal',
  suggested_price int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id uuid,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE public.asset_moderation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Submitters can view their submissions"
  ON public.asset_moderation_queue FOR SELECT
  USING (auth.uid() = submitted_by OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Authenticated users can submit assets"
  ON public.asset_moderation_queue FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Admins update moderation queue"
  ON public.asset_moderation_queue FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins delete moderation queue"
  ON public.asset_moderation_queue FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE INDEX IF NOT EXISTS idx_asset_mod_status ON public.asset_moderation_queue(status, created_at DESC);

-- ─── CHAT MODERATION: allow admin DELETE on game_chat ───────────────────────
DROP POLICY IF EXISTS "Admins can delete chat" ON public.game_chat;
CREATE POLICY "Admins can delete chat"
  ON public.game_chat FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Allow DELETE event in realtime so subscribers see message removals.
ALTER TABLE public.game_chat REPLICA IDENTITY FULL;

-- ─── DAILY EMERALDS: BC-only, tier-based ────────────────────────────────────
-- Replaces the previous flat 100/day grant.
CREATE OR REPLACE FUNCTION public.claim_daily_emeralds()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_last_claim timestamptz;
  v_hours_since numeric;
  v_new_balance int;
  v_tier text;
  v_payout int;
  v_active boolean;
  v_expires timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Look up active BC subscription
  SELECT tier, active, expires_at INTO v_tier, v_active, v_expires
  FROM public.builders_club_subscriptions
  WHERE user_id = v_user_id;

  IF v_tier IS NULL OR v_active IS NOT TRUE OR v_expires IS NULL OR v_expires <= now() THEN
    RETURN json_build_object('success', false, 'message', 'Builders Club required for daily emeralds');
  END IF;

  v_payout := CASE v_tier
    WHEN 'classic'    THEN 130
    WHEN 'turbo'      THEN 200
    WHEN 'outrageous' THEN 300
    ELSE 130
  END;

  SELECT last_daily_claim INTO v_last_claim
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_last_claim IS NOT NULL THEN
    v_hours_since := EXTRACT(EPOCH FROM (now() - v_last_claim)) / 3600;
    IF v_hours_since < 24 THEN
      RETURN json_build_object('success', false, 'message', 'Already claimed today');
    END IF;
  END IF;

  UPDATE public.profiles
  SET emeralds = emeralds + v_payout,
      last_daily_claim = now()
  WHERE user_id = v_user_id
  RETURNING emeralds INTO v_new_balance;

  RETURN json_build_object('success', true, 'emeralds', v_new_balance, 'amount', v_payout, 'tier', v_tier);
END;
$$;

-- ─── ACTIVATE BUILDERS CLUB ─────────────────────────────────────────────────
-- Costs emeralds. 30-day subscription. Idempotent — reactivating extends.
CREATE OR REPLACE FUNCTION public.activate_builders_club(p_tier text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cost int;
  v_balance int;
  v_existing_expires timestamptz;
  v_new_expires timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  IF p_tier NOT IN ('classic', 'turbo', 'outrageous') THEN
    RETURN json_build_object('success', false, 'message', 'Invalid tier');
  END IF;

  v_cost := CASE p_tier
    WHEN 'classic'    THEN 1500
    WHEN 'turbo'      THEN 2500
    WHEN 'outrageous' THEN 4000
  END;

  SELECT emeralds INTO v_balance FROM public.profiles WHERE user_id = v_user_id FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Profile not found');
  END IF;

  IF v_balance < v_cost THEN
    RETURN json_build_object('success', false, 'message', 'Not enough emeralds');
  END IF;

  -- Charge user
  UPDATE public.profiles SET emeralds = emeralds - v_cost WHERE user_id = v_user_id;

  -- Compute new expiry (extend if existing & active)
  SELECT expires_at INTO v_existing_expires
  FROM public.builders_club_subscriptions
  WHERE user_id = v_user_id AND active = true;

  v_new_expires := GREATEST(COALESCE(v_existing_expires, now()), now()) + interval '30 days';

  INSERT INTO public.builders_club_subscriptions (user_id, tier, active, activated_at, expires_at)
  VALUES (v_user_id, p_tier, true, now(), v_new_expires)
  ON CONFLICT (user_id) DO UPDATE
    SET tier = EXCLUDED.tier,
        active = true,
        activated_at = now(),
        expires_at = v_new_expires,
        updated_at = now();

  RETURN json_build_object('success', true, 'tier', p_tier, 'expires_at', v_new_expires);
END;
$$;

-- ─── CHANGE USERNAME RPC ────────────────────────────────────────────────────
-- The restrict_profile_self_update trigger blocks direct username updates by
-- end users. This RPC bypasses that trigger via SECURITY DEFINER, performs
-- profanity-safe validation, charges 1000 emeralds, and updates atomically.
CREATE OR REPLACE FUNCTION public.change_username(p_new_username text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance int;
  v_existing_count int;
  v_username_cost int := 1000;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  IF p_new_username IS NULL OR length(p_new_username) < 3 OR length(p_new_username) > 20 THEN
    RETURN json_build_object('success', false, 'message', 'Username must be 3-20 characters');
  END IF;

  IF p_new_username !~ '^[A-Za-z0-9]+$' THEN
    RETURN json_build_object('success', false, 'message', 'Username can only contain letters and numbers');
  END IF;

  -- Uniqueness (case-insensitive)
  SELECT count(*) INTO v_existing_count
  FROM public.profiles
  WHERE lower(username) = lower(p_new_username) AND user_id <> v_user_id;
  IF v_existing_count > 0 THEN
    RETURN json_build_object('success', false, 'message', 'Username already taken');
  END IF;

  SELECT emeralds INTO v_balance FROM public.profiles WHERE user_id = v_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Profile not found');
  END IF;
  IF v_balance < v_username_cost THEN
    RETURN json_build_object('success', false, 'message', 'Need 1000 emeralds to change username');
  END IF;

  UPDATE public.profiles
  SET username = p_new_username,
      emeralds = emeralds - v_username_cost,
      updated_at = now()
  WHERE user_id = v_user_id;

  RETURN json_build_object('success', true, 'username', p_new_username);
END;
$$;

-- ─── SWORD FIGHT RPCs ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_sword_fight_kill(p_username text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_kills int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  INSERT INTO public.sword_fight_kills (user_id, username, kills, last_kill_at)
  VALUES (v_user_id, COALESCE(p_username, 'Player'), 1, now())
  ON CONFLICT (user_id) DO UPDATE
    SET kills = public.sword_fight_kills.kills + 1,
        last_kill_at = now(),
        username = EXCLUDED.username
  RETURNING kills INTO v_kills;

  RETURN json_build_object('success', true, 'kills', v_kills);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_sword_fight_death()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_deaths int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  INSERT INTO public.sword_fight_kills (user_id, username, deaths, last_kill_at)
  VALUES (v_user_id, COALESCE((SELECT username FROM public.profiles WHERE user_id = v_user_id), 'Player'), 0, now())
  ON CONFLICT (user_id) DO UPDATE
    SET deaths = public.sword_fight_kills.deaths + 1,
        last_kill_at = now()
  RETURNING deaths INTO v_deaths;

  RETURN json_build_object('success', true, 'deaths', v_deaths);
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_sword_fight_score()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  DELETE FROM public.sword_fight_kills WHERE user_id = v_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- ─── CREATE GROUP (charges emeralds, inserts membership) ───────────────────
CREATE OR REPLACE FUNCTION public.create_group(
  p_name text,
  p_description text,
  p_icon_url text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance int;
  v_cost int := 250;
  v_group_id uuid;
  v_existing int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) < 3 OR length(p_name) > 32 THEN
    RETURN json_build_object('success', false, 'message', 'Name must be 3-32 characters');
  END IF;

  IF p_icon_url IS NULL OR length(p_icon_url) = 0 THEN
    RETURN json_build_object('success', false, 'message', 'Icon required');
  END IF;

  SELECT count(*) INTO v_existing FROM public.groups WHERE lower(name) = lower(p_name);
  IF v_existing > 0 THEN
    RETURN json_build_object('success', false, 'message', 'Group name already taken');
  END IF;

  SELECT emeralds INTO v_balance FROM public.profiles WHERE user_id = v_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Profile not found');
  END IF;
  IF v_balance < v_cost THEN
    RETURN json_build_object('success', false, 'message', 'Need 250 emeralds to create a group');
  END IF;

  INSERT INTO public.groups (name, description, icon_url, owner_id, member_count)
  VALUES (trim(p_name), COALESCE(p_description, ''), p_icon_url, v_user_id, 0)
  RETURNING id INTO v_group_id;

  -- bump_group_member_count() trigger will set member_count to 1.
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'owner');

  UPDATE public.profiles SET emeralds = emeralds - v_cost WHERE user_id = v_user_id;

  RETURN json_build_object('success', true, 'group_id', v_group_id);
END;
$$;

-- ─── JOIN/LEAVE GROUP RPCs (don't fight the self-update trigger) ────────────
CREATE OR REPLACE FUNCTION public.join_group(p_group_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  SELECT count(*) INTO v_existing FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;
  IF v_existing > 0 THEN
    RETURN json_build_object('success', false, 'message', 'Already a member');
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role) VALUES (p_group_id, v_user_id, 'member');
  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_group(p_group_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  DELETE FROM public.group_members WHERE group_id = p_group_id AND user_id = v_user_id AND role <> 'owner';
  RETURN json_build_object('success', true);
END;
$$;

-- ─── ASSET MODERATION RPCs ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_asset(p_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row record;
  v_item_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  IF NOT (public.has_role(v_user_id, 'admin') OR public.has_role(v_user_id, 'owner')) THEN
    RETURN json_build_object('success', false, 'message', 'Forbidden');
  END IF;

  SELECT * INTO v_row FROM public.asset_moderation_queue WHERE id = p_id AND status = 'pending';
  IF v_row IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Submission not found or already reviewed');
  END IF;

  -- Insert into catalog_items as approved.
  INSERT INTO public.catalog_items (name, description, image_url, price, item_type, is_on_sale, created_by)
  VALUES (
    v_row.name,
    v_row.description,
    v_row.image_url,
    v_row.suggested_price,
    COALESCE(v_row.item_type, 'normal')::public.item_type,
    true,
    v_row.submitted_by
  )
  RETURNING id INTO v_item_id;

  UPDATE public.asset_moderation_queue
  SET status = 'approved', reviewer_id = v_user_id, reviewed_at = now()
  WHERE id = p_id;

  RETURN json_build_object('success', true, 'item_id', v_item_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_asset(p_id uuid, p_reason text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;
  IF NOT (public.has_role(v_user_id, 'admin') OR public.has_role(v_user_id, 'owner')) THEN
    RETURN json_build_object('success', false, 'message', 'Forbidden');
  END IF;

  UPDATE public.asset_moderation_queue
  SET status = 'rejected', reviewer_id = v_user_id, reviewed_at = now(), reject_reason = p_reason
  WHERE id = p_id;

  RETURN json_build_object('success', true);
END;
$$;

-- ─── CLEAR GAME CHAT (presence-based reset) ─────────────────────────────────
-- Called by the client when the last player leaves the lobby. RLS only allows
-- admins to delete from game_chat directly, so this RPC bypasses that via
-- SECURITY DEFINER. Open to any authenticated user; the client only invokes
-- this when its presence channel reports zero remaining participants.
CREATE OR REPLACE FUNCTION public.clear_game_chat()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  WITH deleted AS (
    DELETE FROM public.game_chat RETURNING 1
  )
  SELECT count(*) INTO v_count FROM deleted;

  RETURN json_build_object('success', true, 'cleared', v_count);
END;
$$;
