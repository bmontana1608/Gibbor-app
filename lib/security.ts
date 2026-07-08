import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Valida que el usuario tenga una sesión activa y devuelve su perfil.
 * Es la primera línea de defensa para cualquier API de MCM.
 */
export async function validateSession() {
  const { data: { session } } = await supabaseAdmin.auth.getSession();
  
  if (!session) return null;

  const { data: perfil } = await supabaseAdmin
    .from('perfiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return perfil;
}

/**
 * Asegura que el usuario solo pueda acceder a datos de SU propio club.
 * Previene el 'Cross-Tenant Data Leakage'.
 */
export function validateTenantAccess(userPerfil: any, targetClubId: string) {
  if (userPerfil.rol === 'SuperAdmin') return true; // El SuperAdmin es global
  return userPerfil.club_id === targetClubId;
}
