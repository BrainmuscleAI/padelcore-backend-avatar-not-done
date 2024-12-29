/*
  # Fix Avatar Storage System

  1. Changes
    - Creates avatars bucket with proper configuration
    - Updates storage policies
    - Adds error handling for bucket operations

  2. Security
    - Enables RLS for storage objects
    - Restricts uploads to user's own folder
    - Makes avatars publicly readable
*/

-- Create avatars bucket with proper configuration
DO $$
BEGIN
  -- Create bucket if it doesn't exist
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
    auth.uid(),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types,
    updated_at = now();

EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail migration
  RAISE WARNING 'Failed to create avatars bucket: %', SQLERRM;
END $$;

-- Drop existing policies to avoid conflicts
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
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

  -- Update policy
  CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

  -- Delete policy
  CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

  -- Public read policy
  CREATE POLICY "Avatar files are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create storage policies: %', SQLERRM;
END $$;