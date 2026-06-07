'use client';

import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { usePathname } from 'next/navigation';

const RESERVED = ['director', 'entrenador', 'futbolista', 'login', 'perfil', 'api', 'admin', 'unete', 'suspendido'];

function getTenantSlugFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && !RESERVED.includes(segments[0])) {
    return segments[0];
  }
  return null;
}

export default function InstallPrompt() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [clubData, setClubData] = useState<{ nombre: string; logo_url: string | null; color_primario: string } | null>(null);

  const tenantSlug = getTenantSlugFromPath(pathname);

  // Cargar datos del club DIRECTAMENTE desde el manifest dinámico
  useEffect(() => {
    if (!tenantSlug) return;

    fetch(`/${tenantSlug}/manifest.json`)
      .then(res => res.json())
      .then(manifest => {
        if (manifest?.name && manifest.name !== 'Club Deportivo') {
          setClubData({
            nombre: manifest.name,
            logo_url: manifest.icons?.[0]?.src || null,
            color_primario: manifest.theme_color || '#06b6d4',
          });
        }
      })
      .catch(() => {
        // Fallback silencioso
      });
  }, [tenantSlug]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.search.includes('invite=true')) return;

    // Detectar iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;

    // Ver si fue descartado
    const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');

    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      if (!dismissed) {
        setTimeout(() => setIsVisible(true), 2500);
      }
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);

      if (!dismissed) {
        setTimeout(() => setIsVisible(true), 2500);
      }
    };

    // Revisar si el evento ya fue capturado globalmente (si se agregó script en <head>)
    if ((window as any).deferredPWAEvent) {
       handler((window as any).deferredPWAEvent);
    }

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      // En iOS no se puede instalar por código, el banner instruirá al usuario
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('[PWA] Usuario instaló la app');
    }
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const dismissPrompt = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // No mostrar si no es visible o si no es instalable (ni iOS ni Android con prompt)
  if (!mounted || !isVisible || (!deferredPrompt && !isIOS)) return null;

  const brandName = clubData?.nombre || tenantSlug?.toUpperCase() || 'Tu Club';
  const brandLogo = clubData?.logo_url || '/logo.png';
  const brandColor = clubData?.color_primario || '#06b6d4';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-3xl p-5 backdrop-blur-xl bg-opacity-95 flex flex-col gap-4 relative overflow-hidden group">
        <div
          className="absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mr-10 -mt-10 opacity-20 group-hover:opacity-40 transition-all"
          style={{ backgroundColor: brandColor }}
        />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-black/20 overflow-hidden bg-white">
            <img
              src={brandLogo}
              alt={brandName}
              className="w-10 h-10 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white font-black text-sm tracking-tight leading-none mb-1 text-left">
              Instalar {brandName}
            </h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest text-left">
              Acceso directo en tu pantalla
            </p>
          </div>

          {isIOS ? null : (
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={handleInstall}
                style={{ backgroundColor: brandColor }}
                className="text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 hover:opacity-90"
              >
                <Download className="w-3.5 h-3.5" /> INSTALAR
              </button>
            </div>
          )}
        </div>

        {/* Instrucciones especiales para iOS (iPhone/iPad) */}
        {isIOS && (
          <div className="bg-white/10 rounded-xl p-3 mt-1 flex flex-col gap-2 relative z-10">
            <p className="text-[11px] text-white font-semibold">Para instalar en tu iPhone:</p>
            <div className="flex items-center gap-2 text-[10px] text-slate-300">
              1. Toca <Share className="w-3 h-3 inline-block mx-0.5 text-blue-400" /> (Compartir) en la barra inferior.
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-300">
              2. Selecciona <strong className="text-white">"Agregar a inicio"</strong>
            </div>
          </div>
        )}

        <button
          onClick={dismissPrompt}
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors z-20"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
