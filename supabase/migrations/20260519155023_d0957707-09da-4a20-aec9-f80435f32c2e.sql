
-- Fix function search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- Restrict public bucket SELECT policies to specific object access (no listing)
DROP POLICY "Public read avatars" ON storage.objects;
DROP POLICY "Public read covers" ON storage.objects;
DROP POLICY "Public read free-photos" ON storage.objects;
DROP POLICY "Public read thumbnails" ON storage.objects;

-- Public read is still possible via the storage public URL (the storage API
-- handles those without consulting RLS). These policies allow authenticated
-- listings only for files the user owns, so anonymous LIST requests cannot
-- enumerate other creators' uploads.
CREATE POLICY "Owners list avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners list covers" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners list free-photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'free-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners list thumbnails" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);
