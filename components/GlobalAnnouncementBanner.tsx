'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Megaphone, AlertTriangle, Info, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function GlobalAnnouncementBanner() {
  const [anuncio, setAnuncio] = useState<any>(null);
  const [closed, setClosed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Only fetch if not closed in this session
    if (closed) return;

    const fetchAnuncio = async () => {
      // Intentar obtener el anuncio activo
      const { data, error } = await supabase
        .from('anuncios_globales')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!error && data) {
        // Verificar si el usuario ya lo cerró (guardado en localStorage con el ID del anuncio)
        const dismissed = localStorage.getItem(`dismissed_announcement_${data.id}`);
        if (!dismissed) {
          setAnuncio(data);
        }
      }
    };

    // No queremos interrumpir al usuario durante el login
    if (!pathname.includes('/login') && !pathname.includes('/admin')) {
       fetchAnuncio();
    }
  }, [pathname, closed]);

  if (!anuncio || closed) return null;

  const handleClose = () => {
    localStorage.setItem(`dismissed_announcement_${anuncio.id}`, 'true');
    setClosed(true);
  };

  const isUrgente = anuncio.tipo === 'Urgente';
  const isWarning = anuncio.tipo === 'Warning';

  return (
    <div className={`relative z-50 animate-in slide-in-from-top-full duration-500 shadow-md ${
      isUrgente ? 'bg-gradient-to-r from-red-600 to-rose-500' :
      isWarning ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
      'bg-gradient-to-r from-blue-600 to-indigo-600'
    }`}>
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="w-0 flex-1 flex items-center gap-3">
            <span className="flex p-2 rounded-lg bg-white/20 shrink-0">
              {isUrgente || isWarning ? <AlertTriangle className="h-5 w-5 text-white" aria-hidden="true" /> : <Megaphone className="h-5 w-5 text-white" aria-hidden="true" />}
            </span>
            <p className="font-medium text-white flex flex-col md:flex-row md:items-start gap-1 md:gap-3">
              <span className="font-black tracking-widest uppercase text-[10px] bg-black/20 px-2 py-0.5 rounded-md w-max mt-1">
                 MCM Oficial
              </span>
              <span className="hidden md:inline font-bold mt-0.5">{anuncio.titulo}:</span>
              <span className="text-sm text-white/90 leading-relaxed">{anuncio.mensaje}</span>
            </p>
          </div>
          <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-3">
            <button
              type="button"
              onClick={handleClose}
              className="-mr-1 flex p-2 rounded-xl hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white sm:-mr-2 transition-colors"
            >
              <span className="sr-only">Cerrar</span>
              <X className="h-5 w-5 text-white" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
