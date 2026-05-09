'use client';

import { useEffect } from 'react';

export default function SWRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Registrar el Service Worker en el scope raíz (/).
    // Esto es suficiente para que Chrome considere la PWA instalable:
    // el SW en scope "/" controla TODAS las rutas incluyendo /aguilas-negras/*.
    // El scope del MANIFEST (/aguilas-negras/) define la "app" instalada.
    // El SW no necesita coincidir exactamente con el scope del manifest.
    window.addEventListener('load', function () {
      navigator.serviceWorker
        .register('/sw.js')
        .then(function (reg) {
          console.log('[PWA] Service Worker registrado. Scope:', reg.scope);
        })
        .catch(function (err) {
          console.error('[PWA] Error registrando Service Worker:', err);
        });
    });
  }, []);

  return null;
}
