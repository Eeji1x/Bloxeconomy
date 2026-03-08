
-- Add economy_manager to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'economy_manager';
