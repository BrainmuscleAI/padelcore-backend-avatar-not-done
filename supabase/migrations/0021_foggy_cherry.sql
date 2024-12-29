-- Enable storage if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update profiles table with new avatar fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS avatar_thumb_url TEXT;

-- Create storage trigger function
CREATE OR REPLACE FUNCTION handle_avatar_delete() 
RETURNS trigger AS $$
BEGIN
  -- Delete old avatar files when profile is deleted
  PERFORM storage.delete_object('avatars', OLD.id || '/*');
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for avatar cleanup
DROP TRIGGER IF EXISTS on_profile_delete ON profiles;
CREATE TRIGGER on_profile_delete
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_avatar_delete();

-- Update RLS policies for avatar storage
CREATE POLICY "Users can upload their own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Avatar files are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');