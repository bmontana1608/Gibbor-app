'use client';

import { useEffect } from 'react';

export default function SWRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const currentPath = window.location.pathname;
      const tenantMatch = currentPath.match(/^\/([^\/]+)/);
      const currentTenant = tenantMatch ? tenantMatch[1] : null;

      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          // Si el scope del SW registrado no coincide con el tenant actual, lo eliminamos
          // Esto limpia residuos de "Gibbor" o "MCM" cuando entras a un club específico
          if (currentTenant && registration.scope && !registration.scope.includes(`/${currentTenant}/`)) {
            console.log('Unregistering old SW scope:', registration.scope);
            registration.unregister();
          }
        }
      });

      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(function(reg) {
          console.log('SW registrado correctamente');
        }).catch(function(err) {
          console.log('Error al registrar SW:', err);
        });
      });
    }
  }, []);

  return null;
}
