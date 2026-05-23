ALTER TABLE public.video_vouchers
  ADD CONSTRAINT video_vouchers_video_id_fkey
  FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;

ALTER TABLE public.video_vouchers
  ADD CONSTRAINT video_vouchers_creator_id_fkey
  FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;