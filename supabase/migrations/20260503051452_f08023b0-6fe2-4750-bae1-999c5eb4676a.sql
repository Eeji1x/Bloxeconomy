-- Game chat messages with realtime
CREATE TABLE public.game_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL,
  message text NOT NULL CHECK (length(message) > 0 AND length(message) <= 200),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.game_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view chat" ON public.game_chat FOR SELECT USING (true);
CREATE POLICY "Authenticated can send chat" ON public.game_chat FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_game_chat_created ON public.game_chat (created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_chat;
ALTER TABLE public.game_chat REPLICA IDENTITY FULL;