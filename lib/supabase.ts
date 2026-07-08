import { createBrowserClient } from '@supabase/ssr'

// Este cliente detecta si está en el navegador y maneja las cookies automáticamente.
// Es el reemplazo seguro del cliente anterior para mantener la sesión sincronizada con el Proxy.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)