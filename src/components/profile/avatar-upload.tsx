import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAvatar } from '@/hooks/use-avatar';
import { Loader2, Upload, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface AvatarUploadProps {
  userId: string;
  avatarUrl?: string | null;
  onUploadComplete?: (urls: { avatarUrl: string; thumbnailUrl: string }) => void;
}

export function AvatarUpload({ userId, avatarUrl, onUploadComplete }: AvatarUploadProps) {
  const { uploadAvatar, uploading } = useAvatar();
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let objectUrl: string | null = null;

    try {
      // Show preview
      objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload file
      const { avatarUrl, thumbnailUrl } = await uploadAvatar(file, userId);
      
      if (avatarUrl && thumbnailUrl) {
        // Update profile
        const { error } = await supabase
          .from('profiles')
          .update({
            avatar_url: avatarUrl,
            avatar_thumb_url: thumbnailUrl
          })
          .eq('id', userId);

        if (error) throw error;

        onUploadComplete?.({ avatarUrl, thumbnailUrl });
        
        toast({
          title: 'Success',
          description: 'Profile picture updated successfully'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      // Clean up preview URL
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl(null);
      }
    }
  };

  return (
    <div className="relative">
      <Avatar className="h-24 w-24">
        <AvatarImage src={previewUrl || avatarUrl || undefined} />
        <AvatarFallback>
          <User className="h-12 w-12" />
        </AvatarFallback>
      </Avatar>
      
      <div className="absolute -bottom-2 -right-2">
        <label
          htmlFor="avatar-upload"
          className={`${
            uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          } bg-primary text-primary-foreground h-8 w-8 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity`}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </label>
        <input
          id="avatar-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>
    </div>
  );
}