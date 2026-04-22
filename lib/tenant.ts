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
  let slug = headersList.get('x-tenant-slug');

  // 🔥 SOLUCIÓN CRÍTICA: API Routes evaden proxy.ts.
  // Si no viene la cabecera del slug, la inferimos manualmente del Host.
  if (!slug) {
    const host = headersList.get('host') || '';
    const parts = host.split('.');
    
    // Mapeo especial para Producción en Vercel
    if (host.includes('portalgibbor.vercel.app')) {
      slug = 'gibbor';
    } else {
      slug = parts.length > 2 && parts[0] !== 'www' ? parts[0] : 'master';
    }
  }

  // Branding Neutro y Profesional del SaaS Matriz
  const saasMaster = {
    slug: 'master',
    config: {
      nombre: 'ClubFlow SaaS',
      color: '#1e293b', // Azul oscuro corporativo neutro
      logo: 'https://i.postimg.cc/QMcTbgWz/clubflow-logo.png' // Icono ficticio corporativo temporal
    }
  };

  // Si intentan acceder al dominio general sin subdominio
  if (!slug || slug === 'master' || slug === 'localhost') {
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
