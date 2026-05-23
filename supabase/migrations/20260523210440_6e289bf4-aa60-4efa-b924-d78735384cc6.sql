
-- Add content type to videos table (video or photo pack)
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'video';

ALTER TABLE public.videos
  ADD CONSTRAINT videos_content_type_check
  CHECK (content_type IN ('video', 'photo_pack'));

-- Allow video_url to be empty for photo packs
ALTER TABLE public.videos ALTER COLUMN video_url DROP NOT NULL;

-- Pack photos table: photos that compose a photo pack content
CREATE TABLE IF NOT EXISTS public.pack_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  photo_url text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pack_photos_video ON public.pack_photos(video_id);

ALTER TABLE public.pack_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pack photos"
  ON public.pack_photos FOR SELECT
  USING (true);

CREATE POLICY "Creator manages own pack photos"
  ON public.pack_photos FOR ALL
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Reuse the existing free-photos bucket for pack photos (already public)
-- but pack covers will be censored client-side (blur + overlay)
