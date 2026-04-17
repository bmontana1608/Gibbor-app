'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // No mostrar el prompt si el usuario viene de una invitación para no distraer en el registro
    if (typeof window !== 'undefined' && window.location.search.includes('invite=true')) {
      return;
    }

    // Escuchar el evento de instalación del navegador
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Mostrar el banner después de unos segundos
      const timer = setTimeout(() => {
        // Solo mostrar si no se ha instalado antes en esta sesión
        const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
        if (!dismissed) {
          setIsVisible(true);
        }
      }, 3000);

      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('Usuario aceptó instalar la PWA');
    }
    
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const dismissPrompt = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-3xl p-5 backdrop-blur-xl bg-opacity-95 flex items-center gap-4 relative overflow-hidden group">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-orange-500/20 transition-all"></div>
        
        <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
          <Smartphone className="text-white w-8 h-8" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-black text-sm tracking-tight leading-none mb-1 text-left">Instalar Gibbor App</h3>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest text-left">Acceso directo en tu pantalla</p>
        </div>

        <div className="flex flex-col gap-2">
           <button 
             onClick={handleInstall}
             className="bg-white text-slate-900 font-black text-xs px-4 py-2.5 rounded-xl hover:bg-orange-50 transition-all flex items-center gap-2"
           >
             <Download className="w-3.5 h-3.5" /> INSTALAR
           </button>
           <button 
             onClick={dismissPrompt}
             className="text-slate-500 text-[10px] font-bold hover:text-white uppercase tracking-tighter transition-colors"
           >
             Quizás luego
           </button>
        </div>

        <button 
          onClick={dismissPrompt}
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
