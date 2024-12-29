import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';
import { compressImage } from '@/lib/image-utils';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const THUMBNAIL_SIZE = 150; // pixels

export function useAvatar() {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const validateFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a JPG, PNG, or WebP image.');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File too large. Maximum size is 5MB.');
    }
  };

  const uploadAvatar = async (file: File, userId: string): Promise<{ avatarUrl: string | null, thumbnailUrl: string | null }> => {
    try {
      validateFile(file);
      setUploading(true);

      // Ensure bucket exists before upload
      const { data: buckets } = await supabase.storage.listBuckets();
      const avatarsBucket = buckets?.find(b => b.id === 'avatars');
      
      if (!avatarsBucket) {
        throw new Error('Avatar storage not configured');
      }

      // Generate unique filenames
      const timestamp = Date.now();
      const originalPath = `${userId}/avatar-${timestamp}-original.${file.name.split('.').pop()}`;
      const thumbnailPath = `${userId}/avatar-${timestamp}-thumb.${file.name.split('.').pop()}`;

      // Delete old files first
      try {
        const { data: oldFiles } = await supabase.storage
          .from('avatars')
          .list(userId);
        
        if (oldFiles?.length > 0) {
          await supabase.storage
            .from('avatars')
            .remove(oldFiles.map(f => `${userId}/${f.name}`));
        }
      } catch (error) {
        console.warn('Failed to clean up old avatars:', error);
      }

      // Compress original image
      const compressedFile = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8
      });

      // Create thumbnail
      const thumbnailFile = await compressImage(file, {
        maxWidth: THUMBNAIL_SIZE,
        maxHeight: THUMBNAIL_SIZE,
        quality: 0.7
      });

      // Upload new files
      const originalUpload = await supabase.storage
          .from('avatars')
          .upload(originalPath, compressedFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type
          });

      if (originalUpload.error) throw originalUpload.error;

      const thumbnailUpload = await supabase.storage
          .from('avatars')
          .upload(thumbnailPath, thumbnailFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type
          });

      if (thumbnailUpload.error) throw thumbnailUpload.error;

      // Get public URLs
      const { data: originalUrl } = supabase.storage
        .from('avatars')
        .getPublicUrl(originalPath);

      const { data: thumbnailUrl } = supabase.storage
        .from('avatars')
        .getPublicUrl(thumbnailPath);

      return {
        avatarUrl: originalUrl.publicUrl,
        thumbnailUrl: thumbnailUrl.publicUrl
      };
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: 'Error al subir imagen',
        description: 'No se pudo subir la imagen. Por favor intenta de nuevo más tarde.',
        variant: 'destructive'
      });
      return { avatarUrl: null, thumbnailUrl: null };
    } finally {
      setUploading(false);
      // Clean up any object URLs
      URL.revokeObjectURL(file.name);
    }
  };

  return {
    uploadAvatar,
    uploading
  };
}