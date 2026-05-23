ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_videos_is_featured ON public.videos(is_featured) WHERE is_featured = true;