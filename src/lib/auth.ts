import { createContext, useContext } from 'react';

export type UserRole = 'player' | 'admin' | 'sponsor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profile?: {
    username: string;
    full_name: string;
    avatar_url: string | null;
    rating: number;
  };
}

export interface SignUpData {
  email: string;
  password: string;
  username: string;
  fullName: string;
}

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ error?: Error }>;
  signUp: (data: SignUpData) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper function to determine user role
export async function getUserRole(email: string): Promise<UserRole> {
  // TODO: Implement role lookup from database
  // For now, use email domain for demo
  if (email.includes('admin')) return 'admin';
  if (email.includes('sponsor')) return 'sponsor';
  return 'player';
}

   const updateUserState = async (authUser: any, redirectToDashboard = true) => {
     try {
       const { data: profile } = await supabase
         .from('profiles')
         .select('username, full_name, avatar_url, rating')
         .eq('id', authUser.id)
         .single();

       if (!profile) {
         throw new Error('Profile not found');
       }

       const role = await getUserRole(authUser.email);
       const userData: User = {
         id: authUser.id,
         email: authUser.email,
         name: profile.full_name || profile.username,
         role,
         profile,
       };

       setUser(userData);
       localStorage.setItem('user', JSON.stringify(userData));
       
       toast({
         title: "¡Bienvenido!",
         description: "Has iniciado sesión exitosamente.",
       });
       
      if (redirectToDashboard && role) {
        navigate(DASHBOARD_ROUTES[role]);
      }
     } catch (error) {
       console.error('Error updating user state:', error);
       toast({
         title: "Error",
         description: "No se pudo cargar el perfil del usuario",
         variant: "destructive",
       });
       await logout();
     }
   };