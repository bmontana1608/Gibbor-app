import { getTenant } from '@/lib/tenant';
import LoginForm from '@/components/LoginForm';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PÁGINA DE INICIO (SERVER COMPONENT)
 * Si el usuario ya está logueado, lo mandamos a su club correspondiente.
 */
export default async function LoginPage() {
  const tenant = await getTenant();
  
  // 1. Revisar si hay una sesión activa de forma segura en el servidor
  const cookieStore = await cookies();
  const supabaseToken = cookieStore.get('sb-dgsibtuzqzuyeudbgnaq-auth-token');

  if (supabaseToken) {
    // Intentar obtener el usuario y su club
    // Nota: Usamos admin para leer el perfil rápido sin esperar a que el cliente se hidrate
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${JSON.parse(supabaseToken.value).access_token}` } } }
      );

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: perfil } = await supabaseAdmin
          .from('perfiles')
          .select('rol, club_id, clubes(slug)')
          .eq('id', user.id)
          .single();

        if (perfil) {
          const clubSlug = (perfil.clubes as any)?.slug;
          const rol = perfil.rol?.toLowerCase();

          if (perfil.rol === 'SuperAdmin') {
            redirect('/admin');
          } else if (clubSlug) {
            // Ejemplo: /gibbor/futbolista o /gibbor/director
            redirect(`/${clubSlug}/${rol === 'director' ? 'director' : rol === 'entrenador' ? 'entrenador' : 'futbolista'}`);
          }
        }
      }
    } catch (e) {
      console.log("No active session found or invalid token");
    }
  }

  return <LoginForm tenant={tenant} />;
}