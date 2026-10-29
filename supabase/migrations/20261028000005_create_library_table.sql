-- ====================================================================
-- Create Library Table for Storing M3U / M3U8 Playlist URLs
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.library (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Multi-Category',
  region TEXT DEFAULT 'Global',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Library viewable by authenticated users" ON public.library;
CREATE POLICY "Library viewable by authenticated users"
  ON public.library FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage library" ON public.library;
CREATE POLICY "Admins can manage library"
  ON public.library FOR ALL
  USING (auth.role() = 'authenticated' OR public.is_admin())
  WITH CHECK (auth.role() = 'authenticated' OR public.is_admin());

-- Seed initial curated M3U playlist repositories
INSERT INTO public.library (id, name, url, category, region, notes)
VALUES
  ('lib-astra-multi', 'Astra Multi-Channel Server', 'http://38.190.100.202:8000/playlist.m3u8', 'Multi-Category', 'International', '165+ live channels including Sports, Movies, News, and Kids'),
  ('lib-iptv-tz', 'IPTV-Org Tanzania (TZ)', 'https://iptv-org.github.io/iptv/countries/tz.m3u', 'Tanzania', 'Tanzania', 'Official IPTV-Org country feed for Tanzanian local channels'),
  ('lib-iptv-ke', 'IPTV-Org Kenya (KE)', 'https://iptv-org.github.io/iptv/countries/ke.m3u', 'East Africa', 'Kenya', 'East African Kenyan live TV streams'),
  ('lib-iptv-ug', 'IPTV-Org Uganda (UG)', 'https://iptv-org.github.io/iptv/countries/ug.m3u', 'East Africa', 'Uganda', 'East African Ugandan live TV streams'),
  ('lib-iptv-sports', 'IPTV-Org Global Sports', 'https://iptv-org.github.io/iptv/categories/sports.m3u', 'Sports', 'Global', 'Global sports & football channels playlist for finding backup sports feeds'),
  ('lib-iptv-movies', 'IPTV-Org Movies & Cinema', 'https://iptv-org.github.io/iptv/categories/movies.m3u', 'Movies', 'Global', 'Movie channels and 24/7 cinema streams'),
  ('lib-iptv-kids', 'IPTV-Org Animation & Kids', 'https://iptv-org.github.io/iptv/categories/animation.m3u', 'Cartoons', 'Global', 'Cartoons, anime, and family animation channels'),
  ('lib-iptv-doc', 'IPTV-Org Documentary & Nature', 'https://iptv-org.github.io/iptv/categories/documentary.m3u', 'Animals', 'Global', 'Wildlife, nature, science, and documentary channels'),
  ('lib-iptv-news', 'IPTV-Org World News', 'https://iptv-org.github.io/iptv/categories/news.m3u', 'News', 'Global', '24/7 international breaking news networks'),
  ('lib-iptv-music', 'IPTV-Org Music Channels', 'https://iptv-org.github.io/iptv/categories/music.m3u', 'Music', 'Global', 'Live music video and concert channels'),
  ('lib-freetv-global', 'Free-TV Global Curated M3U', 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8', 'Multi-Category', 'Global', 'Curated high-uptime free-to-air global TV channels')
ON CONFLICT (id) DO NOTHING;
