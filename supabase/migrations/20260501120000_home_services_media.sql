-- Add media support to services (Home page "Nossos Serviços")
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS video_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Public storage bucket for home service media (images & videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('home-services', 'home-services', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read on this bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read home-services'
  ) THEN
    CREATE POLICY "Public read home-services"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'home-services');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public upload home-services'
  ) THEN
    CREATE POLICY "Public upload home-services"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'home-services');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public update home-services'
  ) THEN
    CREATE POLICY "Public update home-services"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'home-services');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public delete home-services'
  ) THEN
    CREATE POLICY "Public delete home-services"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'home-services');
  END IF;
END $$;
