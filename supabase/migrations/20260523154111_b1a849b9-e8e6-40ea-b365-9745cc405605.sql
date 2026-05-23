CREATE TABLE public.video_vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  customer_label TEXT,
  amount_paid NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  use_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_video_vouchers_creator ON public.video_vouchers(creator_id);
CREATE INDEX idx_video_vouchers_video ON public.video_vouchers(video_id);
CREATE INDEX idx_video_vouchers_code ON public.video_vouchers(code);

ALTER TABLE public.video_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator manages own vouchers"
ON public.video_vouchers
FOR ALL
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Super admins manage all vouchers"
ON public.video_vouchers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));