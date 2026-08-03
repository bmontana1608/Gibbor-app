'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * ManifestInjector — Inyecta el manifest correcto del tenant activo.
 *
 * El servidor puede cachear los metadatos incorrectamente en multi-tenant.
 * Este componente SIEMPRE lee la URL actual del cliente y construye
 * el <link rel="manifest"> correcto en tiempo real, sobreescribiendo
 * cualquier valor incorrecto que el servidor haya generado.
 */
export default function ManifestInjector() {
  const pathname = usePathname();

  useEffect(() => {
    // Extraer el slug del tenant de la URL actual
    // Formato esperado: /{tenant}/director, /{tenant}/futbolista, etc.
    const segments = pathname.split('/').filter(Boolean);
    const reservedPaths = ['director', 'entrenador', 'futbolista', 'login', 'perfil', 'api', 'admin', 'unete', 'suspendido'];

    let tenantSlug: string | null = null;

    // Si el primer segmento NO es una ruta reservada, es el tenant
    if (segments.length > 0 && !reservedPaths.includes(segments[0])) {
      tenantSlug = segments[0];
    }

    if (!tenantSlug) return;

    const manifestHref = `/${tenantSlug}/manifest.json`;

    // Eliminar cualquier <link rel="manifest"> existente (evita conflictos)
    const existingLinks = document.querySelectorAll('link[rel="manifest"]');
    existingLinks.forEach(link => link.remove());

    // Crear e inyectar el nuevo link con la identidad del club correcto
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestHref;
    document.head.appendChild(link);

    console.log(`[PWA] Manifest inyectado para tenant: ${tenantSlug} → ${manifestHref}`);
  }, [pathname]);

  return null;
}
