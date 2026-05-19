
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'creator', 'customer');

CREATE TYPE public.service_category AS ENUM (
  'gerais', 'especiais',
  'aparencia_etnia', 'aparencia_cabelo', 'aparencia_estatura',
  'aparencia_corpo', 'aparencia_seios', 'aparencia_pubis',
  'atendimento', 'contato', 'lugar'
);

CREATE TYPE public.purchase_status AS ENUM ('pending', 'paid', 'expired');

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Super admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  bio TEXT,
  cover_photo_url TEXT,
  avatar_url TEXT,
  whatsapp TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_active ON public.profiles(is_active) WHERE is_active = true;

CREATE POLICY "Anyone can view active profiles" ON public.profiles
  FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Super admins manage profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: on signup create profile + creator role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'creator');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SERVICES CATALOG ============
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  category public.service_category NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (label, category)
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Super admins manage services" ON public.services
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Seed services
INSERT INTO public.services (label, category, sort_order) VALUES
  ('Beijos na boca','gerais',1),('Ejaculação corpo','gerais',2),('Facial','gerais',3),
  ('Fantasias e disfarces','gerais',4),('Massagem erótica','gerais',5),('Namoradinha','gerais',6),
  ('Oral até o final','gerais',7),('Oral com camisinha','gerais',8),('Oral sem camisinha','gerais',9),
  ('PSE','gerais',10),('Sexo anal','gerais',11),
  ('Beijo negro','especiais',1),('Chuva dourada','especiais',2),('Fetichismo','especiais',3),
  ('Garganta profunda','especiais',4),('Sado duro','especiais',5),('Sado suave','especiais',6),
  ('Squirting','especiais',7),('Strap on','especiais',8),
  ('Brancas','aparencia_etnia',1),('Latinas','aparencia_etnia',2),('Mulatas','aparencia_etnia',3),
  ('Negras','aparencia_etnia',4),('Orientais','aparencia_etnia',5),
  ('Morenas','aparencia_cabelo',1),('Loiras','aparencia_cabelo',2),('Ruivas','aparencia_cabelo',3),
  ('Altas','aparencia_estatura',1),('Mignon','aparencia_estatura',2),
  ('Gordinhas','aparencia_corpo',1),('Magras','aparencia_corpo',2),
  ('Peitosas','aparencia_seios',1),('Seios naturais','aparencia_seios',2),
  ('Peludas','aparencia_pubis',1),('Púbis depilado','aparencia_pubis',2),
  ('Homens','atendimento',1),('Mulheres','atendimento',2),('Casais','atendimento',3),('Deficientes físicos','atendimento',4),
  ('Ligação','contato',1),('WhatsApp','contato',2),('Telegram','contato',3),
  ('A domicílio','lugar',1),('Clube de Swing','lugar',2),('Com local','lugar',3),
  ('Despedidas solteiro','lugar',4),('Festas e eventos','lugar',5),('Hotel','lugar',6),
  ('Jantar romântico','lugar',7),('Viagens','lugar',8);

-- ============ CREATOR_SERVICES ============
CREATE TABLE public.creator_services (
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (creator_id, service_id)
);
ALTER TABLE public.creator_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view creator services" ON public.creator_services FOR SELECT USING (true);
CREATE POLICY "Creator manages own services" ON public.creator_services
  FOR ALL TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- ============ FREE PHOTOS ============
CREATE TABLE public.free_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.free_photos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_free_photos_creator ON public.free_photos(creator_id, order_index);
CREATE POLICY "Anyone can view free photos" ON public.free_photos FOR SELECT USING (true);
CREATE POLICY "Creator manages own photos" ON public.free_photos
  FOR ALL TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- ============ VIDEOS ============
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT NOT NULL,
  price_brl NUMERIC(10,2) NOT NULL CHECK (price_brl >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  purchase_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_videos_creator ON public.videos(creator_id);
CREATE POLICY "Anyone can view active videos" ON public.videos FOR SELECT USING (is_active = true);
CREATE POLICY "Creator manages own videos" ON public.videos
  FOR ALL TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Super admins view all videos" ON public.videos
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage customers" ON public.customers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============ PURCHASES ============
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE RESTRICT,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount_paid NUMERIC(10,2) NOT NULL,
  pix_transaction_id TEXT,
  status public.purchase_status NOT NULL DEFAULT 'pending',
  download_token UUID UNIQUE,
  download_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_purchases_creator ON public.purchases(creator_id);
CREATE INDEX idx_purchases_video ON public.purchases(video_id);
CREATE INDEX idx_purchases_status ON public.purchases(status);
CREATE POLICY "Creator views own purchases" ON public.purchases
  FOR SELECT TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "Super admins manage purchases" ON public.purchases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars','avatars',true),
  ('covers','covers',true),
  ('free-photos','free-photos',true),
  ('thumbnails','thumbnails',true),
  ('videos','videos',false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read for public buckets, creator-only writes scoped by user id prefix
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Public read covers" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "Public read free-photos" ON storage.objects FOR SELECT USING (bucket_id = 'free-photos');
CREATE POLICY "Public read thumbnails" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');

CREATE POLICY "Authenticated upload avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Authenticated update avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Authenticated delete avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated upload covers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Authenticated update covers" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Authenticated delete covers" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated upload free-photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'free-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Authenticated delete free-photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'free-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated upload thumbnails" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Authenticated delete thumbnails" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated upload videos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Authenticated delete videos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Creator reads own videos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
