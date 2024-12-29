/*
  # Fix Avatar Storage System

  1. Changes
    - Creates avatars bucket with public access
    - Updates storage policies
    - Adds error handling for bucket operations

  2. Security
    - Enables RLS for storage objects
    - Restricts uploads to user's own folder
    - Makes avatars publicly readable
*/

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create avatars bucket with retries
DO $$
DECLARE
  max_attempts INTEGER := 3;
  current_attempt INTEGER := 0;
  success BOOLEAN := FALSE;
BEGIN
  WHILE current_attempt < max_attempts AND NOT success LOOP
    BEGIN
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'avatars',
        'avatars',
        true,
        5242880, -- 5MB limit
        ARRAY['image/jpeg', 'image/png', 'image/webp']
      )
      ON CONFLICT (id) DO UPDATE
      SET 
        public = true,
        file_size_limit = 5242880,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];
      
      success := TRUE;
    EXCEPTION WHEN OTHERS THEN
      current_attempt := current_attempt + 1;
      IF current_attempt = max_attempts THEN
        RAISE EXCEPTION 'Failed to create avatars bucket after % attempts', max_attempts;
      END IF;
      PERFORM pg_sleep(1); -- Wait 1 second before retry
    END;
  END LOOP;
END $$;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Avatar files are publicly accessible" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore errors if policies don't exist
END $$;

-- Create new storage policies
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Avatar files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Update profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS avatar_thumb_url TEXT;