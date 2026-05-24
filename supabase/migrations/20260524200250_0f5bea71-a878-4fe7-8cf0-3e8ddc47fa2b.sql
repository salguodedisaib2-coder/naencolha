CREATE TABLE public.pack_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  video_url text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_pack_videos_video_id ON public.pack_videos(video_id);
CREATE INDEX idx_pack_videos_creator_id ON public.pack_videos(creator_id);

ALTER TABLE public.pack_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pack videos"
ON public.pack_videos FOR SELECT
TO public
USING (true);

CREATE POLICY "Creator manages own pack videos"
ON public.pack_videos FOR ALL
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Super admins manage pack videos"
ON public.pack_videos FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));