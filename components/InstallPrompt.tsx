'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
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
  const [clubData, setClubData] = useState<{ nombre: string; logo_url: string | null; color_primario: string } | null>(null);

  const tenantSlug = getTenantSlugFromPath(pathname);

  // Cargar datos del club DIRECTAMENTE desde el manifest dinámico
  // Así evitamos depender de /api/tenant que puede tener problemas de caché
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
        // Fallback silencioso — no bloquear la experiencia
      });
  }, [tenantSlug]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('invite=true')) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Mostrar el banner solo después de que tengamos datos del club (mín. 2s)
      // Esto evita que el banner aparezca con datos genéricos
      const timer = setTimeout(() => {
        const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
        if (!dismissed) {
          setIsVisible(true);
        }
      }, 2500);

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

  // No mostrar si: no hay prompt, no es visible, o no tenemos aún los datos del club correcto o no estamos en el cliente
  if (!mounted || !isVisible || !deferredPrompt) return null;

  const brandName = clubData?.nombre || tenantSlug?.toUpperCase() || 'Tu Club';
  const brandLogo = clubData?.logo_url || '/logo.png';
  const brandColor = clubData?.color_primario || '#06b6d4';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-3xl p-5 backdrop-blur-xl bg-opacity-95 flex items-center gap-4 relative overflow-hidden group">
        {/* Glow dinámico del club */}
        <div
          className="absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mr-10 -mt-10 opacity-20 group-hover:opacity-40 transition-all"
          style={{ backgroundColor: brandColor }}
        />

        {/* Logo del club */}
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

        <div className="flex flex-col gap-2">
          <button
            onClick={handleInstall}
            style={{ backgroundColor: brandColor }}
            className="text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 hover:opacity-90"
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
