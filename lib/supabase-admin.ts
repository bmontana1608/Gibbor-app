import { createClient } from '@supabase/supabase-js';

// Este cliente SOLO se debe usar en el servidor (API Routes)
// porque utiliza la SERVICE_ROLE_KEY, que tiene acceso total.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
