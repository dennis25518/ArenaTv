-- Migration: Create chatroom messages and upvotes schema
-- Date: 2026-10-29

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT,
  avatar_url TEXT,
  channel_room TEXT NOT NULL DEFAULT 'general', -- 'general', 'channel_requests', 'feedback', 'announcements'
  message TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'under_review', 'completed'
  is_admin BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast indexing for filtering messages per room ordered by time
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created 
ON public.chat_messages (channel_room, created_at DESC);

-- Upvote tracking table (ensures each user only upvotes once)
CREATE TABLE IF NOT EXISTS public.chat_upvotes (
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_upvotes ENABLE ROW LEVEL SECURITY;

-- Read policies: anyone authenticated can read chat messages and upvotes
CREATE POLICY "Allow authenticated read chat_messages"
ON public.chat_messages FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Allow authenticated read chat_upvotes"
ON public.chat_upvotes FOR SELECT
TO authenticated, anon
USING (true);

-- Insert policies
CREATE POLICY "Allow authenticated insert chat_messages"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  OR channel_room != 'announcements' 
  OR is_admin = true
);

CREATE POLICY "Allow authenticated insert chat_upvotes"
ON public.chat_upvotes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated delete own chat_upvotes"
ON public.chat_upvotes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable Supabase Realtime for instant chat message broadcasting
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;

