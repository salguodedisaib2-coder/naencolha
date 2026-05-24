
-- Page views tracking
CREATE TABLE IF NOT EXISTS public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  viewer_ip text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_page_views_profile ON public.page_views(profile_id);
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at ON public.page_views(viewed_at);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a page view"
  ON public.page_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Super admins read page views"
  ON public.page_views FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admin can manage free_photos and pack_photos
CREATE POLICY "Super admins manage free photos"
  ON public.free_photos FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins manage pack photos"
  ON public.pack_photos FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
