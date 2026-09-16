'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

/**
 * Hook inteligente para manejar la arquitectura multi-tenant de marca blanca.
 * Detecta automáticamente si el club se identifica por subdominio o por ruta.
 */
export function useTenant(initialTenantSlug?: string) {
  const pathname = usePathname();

  return useMemo(() => {
    // 1. Extraer el slug de la ruta si existe (ej: /gibbor/director -> gibbor)
    const pathParts = pathname.split('/').filter(Boolean);
    const reservedPaths = ['director', 'entrenador', 'futbolista', 'login', 'perfil', 'api', 'admin', 'master'];
    
    let slug = initialTenantSlug || '';
    
    if (pathParts.length > 0 && !reservedPaths.includes(pathParts[0])) {
      slug = pathParts[0];
    }

    // 2. Si no hay slug en la ruta, inferir por subdominio en el cliente
    if (!slug && typeof window !== 'undefined') {
      const host = window.location.host;
      const parts = host.split('.');
      if (parts.length > 2 && parts[0] !== 'www') {
        slug = parts[0] === 'portalgibbor' ? 'gibbor' : parts[0];
      }
    }

    // Fallback de seguridad
    if (!slug) slug = 'gibbor';

    // 3. Calcular basePath dinámico
    // Si estamos en un subdominio (ej: aguilas.gibbor.app), el basePath debe ser vacío.
    // Si estamos en el dominio principal con ruta (ej: gibbor.app/aguilas), el basePath debe ser /aguilas.
    const isSubdomain = typeof window !== 'undefined' && window.location.host.startsWith(`${slug}.`);
    const basePath = isSubdomain || slug === 'master' ? '' : `/${slug}`;

    return {
      slug,
      basePath,
      isSubdomain,
      // Helper para generar URLs internas del tenant de forma segura
      route: (path: string) => `${basePath}${path.startsWith('/') ? path : `/${path}`}`
    };
  }, [pathname, initialTenantSlug]);
}
