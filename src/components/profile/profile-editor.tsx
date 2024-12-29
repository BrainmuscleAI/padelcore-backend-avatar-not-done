import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth';
import { useProfileUpload } from '@/hooks/use-profile-upload';
import { Loader2, Upload, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const profileSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Username must start with a letter and can only contain letters, numbers, and underscores'),
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(50, 'Full name must be less than 50 characters'),
  email: z.string()
    .email('Invalid email address'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileEditor() {
  const { user } = useAuth();
  const { uploadAvatar, uploading: uploadingAvatar } = useProfileUpload();
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.profile?.username || '',
      fullName: user?.profile?.full_name || '',
      email: user?.email || '',
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const avatarUrl = await uploadAvatar(file, user.id);
    if (avatarUrl) {
      // Update profile with new avatar URL
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update avatar',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Avatar updated successfully',
        });
      }
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    try {
      setSaving(true);

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: data.username.toLowerCase(),
          full_name: data.fullName,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update email if changed
      if (data.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: data.email,
        });

        if (emailError) throw emailError;
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      if (error.message.includes('username')) {
        setError('username', {
          message: 'Username already taken',
        });
      } else if (error.message.includes('email')) {
        setError('email', {
          message: 'Email already in use',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update profile',
          variant: 'destructive',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex justify-center">
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user.profile?.avatar_url || undefined} />
            <AvatarFallback>
              <User className="h-12 w-12" />
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-2 -right-2">
            <label
              htmlFor="avatar-upload"
              className={`${
                uploadingAvatar ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } bg-primary text-primary-foreground h-8 w-8 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity`}
            >
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploadingAvatar}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            {...register('username')}
            className={errors.username ? 'border-red-500' : ''}
          />
          {errors.username && (
            <p className="text-sm text-red-500">{errors.username.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            {...register('fullName')}
            className={errors.fullName ? 'border-red-500' : ''}
          />
          {errors.fullName && (
            <p className="text-sm text-red-500">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Changes'
        )}
      </Button>
    </form>
  );
}