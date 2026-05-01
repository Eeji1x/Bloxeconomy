CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.hash_key(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.digest(convert_to(upper(btrim(_value)), 'UTF8'), 'sha256'), 'hex')
$$;

-- ============ INVITE KEYS ============
DELETE FROM public.invite_keys WHERE is_used = false;

ALTER TABLE public.invite_keys
  ADD COLUMN IF NOT EXISTS key_hash text,
  ADD COLUMN IF NOT EXISTS key_prefix text;

UPDATE public.invite_keys
SET key_hash = public.hash_key(key),
    key_prefix = substring(key from 1 for 9) || '-•••••'
WHERE key_hash IS NULL AND key IS NOT NULL;

ALTER TABLE public.invite_keys
  ALTER COLUMN key_hash SET NOT NULL,
  ALTER COLUMN key_prefix SET NOT NULL;

ALTER TABLE public.invite_keys DROP COLUMN IF EXISTS key;

CREATE UNIQUE INDEX IF NOT EXISTS invite_keys_key_hash_unique
  ON public.invite_keys(key_hash);

-- ============ BETA KEYS ============
DELETE FROM public.beta_keys WHERE is_used = false;

ALTER TABLE public.beta_keys
  ADD COLUMN IF NOT EXISTS key_hash text,
  ADD COLUMN IF NOT EXISTS key_prefix text;

UPDATE public.beta_keys
SET key_hash = public.hash_key(key),
    key_prefix = substring(key from 1 for 10) || '-•••••'
WHERE key_hash IS NULL AND key IS NOT NULL;

ALTER TABLE public.beta_keys
  ALTER COLUMN key_hash SET NOT NULL,
  ALTER COLUMN key_prefix SET NOT NULL;

ALTER TABLE public.beta_keys DROP COLUMN IF EXISTS key;

CREATE UNIQUE INDEX IF NOT EXISTS beta_keys_key_hash_unique
  ON public.beta_keys(key_hash);

-- ============ REGISTRATION TOKENS ============
DELETE FROM public.registration_tokens WHERE is_used = false;

ALTER TABLE public.registration_tokens
  ADD COLUMN IF NOT EXISTS token_hash text,
  ADD COLUMN IF NOT EXISTS token_prefix text;

UPDATE public.registration_tokens
SET token_hash = public.hash_key(token),
    token_prefix = substring(token from 1 for 8) || '…'
WHERE token_hash IS NULL AND token IS NOT NULL;

ALTER TABLE public.registration_tokens
  ALTER COLUMN token_hash SET NOT NULL,
  ALTER COLUMN token_prefix SET NOT NULL;

ALTER TABLE public.registration_tokens DROP COLUMN IF EXISTS token;

CREATE UNIQUE INDEX IF NOT EXISTS registration_tokens_token_hash_unique
  ON public.registration_tokens(token_hash);