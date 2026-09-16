'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, ExternalLink } from 'lucide-react';

interface GlobalAdPopupProps {
  tenant: any;
  profile: any;
}

export default function GlobalAdPopup({ tenant, profile }: GlobalAdPopupProps) {
  const [flyer, setFlyer] = useState<any>(null);

  useEffect(() => {
    // Si no es director o no hay tenant, ignorar
    if (profile?.rol?.toLowerCase() !== 'director') return;
    verificarFlyer();
  }, [tenant]);

  const verificarFlyer = async () => {
    try {
      // Buscar flyers activos, que sean globales o coincidan con el pais/ciudad del tenant
      const { data: flyersActivos } = await supabase
        .from('anuncios_flyers')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (!flyersActivos || flyersActivos.length === 0) return;

      // Filtrar el que aplique para este club (Pais/Ciudad coinciden o son null)
      const clubPais = tenant?.pais || 'Colombia'; // Default
      const clubCiudad = tenant?.ciudad || 'Bogota';

      const flyerApto = flyersActivos.find(f => {
        const paisMatch = !f.pais || f.pais.toLowerCase() === clubPais.toLowerCase();
        const ciudadMatch = !f.ciudad || f.ciudad.toLowerCase() === clubCiudad.toLowerCase();
        return paisMatch && ciudadMatch;
      });

      if (!flyerApto) return;

      // Verificar en localStorage si ya lo vió
      const storageKey = `last_seen_flyer_${flyerApto.id}`;
      const lastSeenStr = localStorage.getItem(storageKey);
      
      if (lastSeenStr) {
        const lastSeen = parseInt(lastSeenStr, 10);
        const hoursPassed = (Date.now() - lastSeen) / (1000 * 60 * 60);
        if (hoursPassed < (flyerApto.frecuencia_horas || 24)) {
          return; // Aun no ha pasado el tiempo
        }
      }

      // Si llegamos aqui, debemos mostrarlo
      setFlyer(flyerApto);
    } catch (e) {
      console.error('Error buscando flyer:', e);
    }
  };

  const cerrarFlyer = () => {
    if (flyer) {
      localStorage.setItem(`last_seen_flyer_${flyer.id}`, Date.now().toString());
    }
    setFlyer(null);
  };

  if (!flyer) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="relative inline-flex max-w-lg max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* Botón X flotante en la esquina */}
        <button 
          onClick={cerrarFlyer}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-black hover:bg-slate-800 border-2 border-white rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105"
        >
          <X size={16} strokeWidth={3} />
        </button>

        {flyer.link_url ? (
          <a 
            href={flyer.link_url} 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={cerrarFlyer}
            className="block w-full h-full cursor-pointer"
          >
            <img 
              src={flyer.imagen_url} 
              alt={flyer.titulo || 'Promoción'} 
              className="w-full h-full object-contain rounded-xl shadow-2xl" 
            />
          </a>
        ) : (
          <img 
            src={flyer.imagen_url} 
            alt={flyer.titulo || 'Promoción'} 
            className="w-full h-full object-contain rounded-xl shadow-2xl" 
          />
        )}
      </div>
    </div>
  );
}
