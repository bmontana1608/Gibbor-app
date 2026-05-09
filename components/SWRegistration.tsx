'use client';

import { useEffect } from 'react';

export default function SWRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
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
