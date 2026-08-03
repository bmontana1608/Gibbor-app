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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <button 
          onClick={cerrarFlyer}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
        >
          <X size={18} />
        </button>

        {flyer.imagen_url && (
          <img src={flyer.imagen_url} alt={flyer.titulo} className="w-full h-auto max-h-[70vh] object-contain bg-slate-100" />
        )}

        <div className="p-6 bg-white">
          <h2 className="text-xl font-black text-slate-800 tracking-tight mb-2">{flyer.titulo}</h2>
          
          <div className="flex gap-3 mt-4">
            <button onClick={cerrarFlyer} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
              Cerrar
            </button>
            {flyer.link_url && (
              <a 
                href={flyer.link_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={cerrarFlyer}
                className="flex-1 px-4 py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand/90 transition-colors flex items-center justify-center gap-2"
              >
                Ver más <ExternalLink size={16} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
