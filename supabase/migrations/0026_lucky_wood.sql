/*
  # Fix Avatar Storage System

  1. Changes
    - Creates avatars bucket with proper configuration
    - Sets up RLS policies for secure access
    - Adds file size and type restrictions

  2. Security
    - Enables RLS for storage
    - Restricts uploads to authenticated users
    - Makes avatars publicly readable
*/

-- Create avatars bucket with proper configuration
DO $$
BEGIN
  -- Drop existing bucket to ensure clean state
  BEGIN
    DELETE FROM storage.buckets WHERE id = 'avatars';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Create bucket with proper configuration
  INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    owner,
    created_at,
    updated_at
  )
  VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp'],
    NULL, -- Allow system-level ownership
    now(),
    now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create avatars bucket: %', SQLERRM;
END $$;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Avatar files are publicly accessible" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Create storage policies
DO $$
BEGIN
  -- Upload policy
  CREATE POLICY "Users can upload their own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

  -- Update policy
  CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

  -- Delete policy
  CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

  -- Public read policy
  CREATE POLICY "Avatar files are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create storage policies: %', SQLERRM;
END $$;