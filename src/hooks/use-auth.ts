import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';

export function useSignUp() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const signUp = async ({
    email,
    password,
    username,
    fullName,
  }: {
    email: string;
    password: string;
    username: string;
    fullName: string;
  }) => {
    try {
      setLoading(true);
      
      // Sign up with shorter timeout
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.toLowerCase(),
            full_name: fullName,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user data returned');

      // Create profile with upsert to handle race conditions
      const { error: profileError } = await supabase 
        .from('profiles')
        .upsert({
          id: data.user.id,
          username: username.toLowerCase(),
          full_name: fullName,
          rating: 1000
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (profileError) throw profileError;

      toast({
        title: "Cuenta Creada",
        description: "Tu cuenta ha sido creada exitosamente.",
      });

      // Sign in automatically after successful sign up
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      if (!signInData.user) throw new Error('No user data returned from sign in');
      
      return data;
    } catch (error: any) {
      console.error('Sign up error:', error);
      let errorMessage = 'Error al crear la cuenta';
      
      if (error.message?.includes('already registered')) {
        errorMessage = 'Este correo ya está registrado';
      } else if (error.message?.includes('username already exists')) {
        errorMessage = 'Este nombre de usuario ya está en uso';
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    signUp,
    loading,
  };
}