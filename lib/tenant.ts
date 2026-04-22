import { headers } from 'next/headers';
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
export async function getTenant() {
  const headersList = await headers();
  // El middleware inyecta 'x-tenant-slug' en todas las peticiones
  let slug = headersList.get('x-tenant-slug');
  const host = headersList.get('host') || '';

  // Si por alguna razón no viene (ej: llamadas directas internas), inferimos
  if (!slug) {
    const parts = host.split('.');
    
    if (parts.length > 2 && parts[0] !== 'www') {
      slug = parts[0];
    } else {
      slug = 'master'; // Dominio principal limpio
    }
  }

  // Branding Neutro y Profesional del SaaS Matriz (NexClub)
  const saasMaster = {
    slug: 'master',
    config: {
      nombre: 'NexClub SaaS Management',
      color: '#EA580C',
      logo: 'https://cdn-icons-png.flaticon.com/512/1162/1162815.png'
    }
  };

  // Si estamos en la raíz o localhost sin slug, devolver GIBBOR por defecto
  if (!slug || slug === 'localhost') {
    const { data: defaultClub } = await supabaseAdmin
      .from('clubes')
      .select('*')
      .eq('slug', 'gibbor')
      .single();

    if (defaultClub) {
      return {
        id: defaultClub.id,
        slug: defaultClub.slug,
        isMaster: false,
        config: {
          nombre: defaultClub.nombre,
          color: defaultClub.color_primario || '#ea580c',
          logo: defaultClub.logo_url || '/logo.png'
        }
      };
    }
  }

  // Si el slug es explícitamente 'master', mostrar NexClub
  if (slug === 'master') {
    return saasMaster;
  }

  // Buscar el Club real por subdominio
  const { data: club, error } = await supabaseAdmin
    .from('clubes')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !club) {
    return saasMaster; // Subdominio fantasma, regresamos branding genérico
  }
  
  return {
    id: club.id,
    slug: club.slug,
    isMaster: false,
    config: {
      nombre: club.nombre,
      color: club.color_primario || '#ea580c',
      logo: club.logo_url || '/logo.png'
    }
  };
}
