import { headers } from 'next/headers';
// Multi-tenant configuration and tenant resolution logic for Gibbor App
// Updated: 2024-05-14 to stabilize routing
import { createClient } from '@supabase/supabase-js';

// Cliente Admin para bypass de RLS en la detección de Tenant
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * UTILIDAD DE TENANT (FULL WHITE-LABEL POR SUBDOMINIO)
 * El login mostrará los colores de la escuela si entran desde su-escuela.midominio.com
 */
export async function getTenant(overrideSlug?: string | null) {
  const headersList = await headers();
  // El middleware inyecta 'x-tenant-slug' en todas las peticiones
  let slug = overrideSlug || headersList.get('x-tenant-slug');
  const host = headersList.get('host') || '';

  // Fallback: Si no hay slug explícito o por header, extraer del referer
  // Útil para llamadas fetch del lado del cliente hacia /api/tenant
  if (!slug) {
    const referer = headersList.get('referer');
    if (referer) {
      try {
        const url = new URL(referer);
        const pathParts = url.pathname.split('/').filter(Boolean);
        const reservedPaths = ['director', 'entrenador', 'futbolista', 'login', 'perfil', 'api', 'admin', 'master'];
        if (pathParts.length > 0 && !reservedPaths.includes(pathParts[0])) {
          slug = pathParts[0];
        }
      } catch (e) {
        // Ignorar
      }
    }
  }

  // Si por alguna razón sigue sin venir, inferimos por host
  if (!slug) {
    const parts = host.split('.');
    
    // CASO A: SUBDOMINIO (ej: warrior.lvh.me)
    if (parts.length > 2 && parts[0] !== 'www') {
      slug = parts[0] === 'portalgibbor' ? 'gibbor' : parts[0];
    } 
    // CASO B: RESCATE POR SESIÓN (Solo si es dominio principal o localhost sin slug en path)
    else {
      try {
        const { createClient } = await import('./supabase/server');
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: perfil } = await supabase
            .from('perfiles')
            .select('club_id, clubes(slug)')
            .eq('id', user.id)
            .single();
          
          if (perfil && (perfil.clubes as any)?.slug) {
            slug = (perfil.clubes as any).slug;
          }
        }
      } catch (e) {
        // Ignorar
      }
    }
  }

  // Quitamos el fallback forzado a 'gibbor' para permitir que el dominio raíz use 'master'

  // Branding Neutro y Profesional del SaaS Matriz (Master Club Manager)
  const saasMaster = {
    slug: 'master',
    config: {
      nombre: 'Master Club Manager (MCM)',
      color: '#10b981', // Verde MCM
      logo: '/logo_mcm.png'
    }
  };

  // Si estamos en la raíz o localhost sin slug, devolver MASTER por defecto en lugar de un club específico
  if (!slug || slug === 'localhost') {
    return { ...saasMaster, isMaster: true };
  }

  // De lo contrario, buscar el club por slug
  const { data: currentClub } = await supabaseAdmin
    .from('clubes')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!currentClub) {
    // Si el slug no existe, por seguridad mostramos Master
    return { ...saasMaster, isMaster: true };
  }

  return {
    id: currentClub.id,
    slug: currentClub.slug,
    isMaster: false,
    mp_access_token: currentClub.mp_access_token,
    mp_public_key: currentClub.mp_public_key,
    config: {
      nombre: currentClub.nombre,
      color: currentClub.color_primario || '#10b981',
      logo: currentClub.logo_url || '/logo_mcm.png'
    }
  };
}
