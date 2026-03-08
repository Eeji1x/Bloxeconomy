-- Prevent self-friending at database level
ALTER TABLE public.friends ADD CONSTRAINT no_self_friend CHECK (requester_id != addressee_id);

-- Add unique constraint to prevent duplicate friend requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_friendship'
  ) THEN
    ALTER TABLE public.friends ADD CONSTRAINT unique_friendship
      UNIQUE (requester_id, addressee_id);
  END IF;
END $$;

-- Add unique constraint on promocode_redemptions to prevent double-redeem race
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_redemption'
  ) THEN
    ALTER TABLE public.promocode_redemptions ADD CONSTRAINT unique_redemption
      UNIQUE (promocode_id, user_id);
  END IF;
END $$;