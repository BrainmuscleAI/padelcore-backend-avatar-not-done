import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const isMockMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!
    );

// Helper to check response errors
export function checkError<T>(
  response: { data: T | null; error: Error | null }
): T {
  if (response.error) {
    throw response.error;
  }
  if (!response.data) {
    throw new Error('No data returned from Supabase');
  }
  return response.data;
}

// Export mock status for UI feedback
export const isSupabaseMock = isMockMode;