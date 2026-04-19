'use client';

import { useState, useEffect } from 'react';
import { Bell, X, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PushPermissionBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 1. Verificar si el navegador soporta notificaciones y service workers
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      return;
    }

    // 2. Si el permiso ya está otorgado, no mostrar el banner
    if (Notification.permission === 'granted') {
      setIsVisible(false);
      return;
    }

    // 3. Si el permiso no es 'granted', mostrar el banner después de un pequeño delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const habilitarNotificaciones = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
        });

        const res = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          body: JSON.stringify({ subscription: sub })
        });

        if (res.ok) {
          toast.success("¡Excelente! Ahora recibirás alertas en tiempo real.");
          setIsVisible(false); // Ocultar banner permanentemente
        }
      } else {
        toast.error("Permiso denegado. No recibirás alertas.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al configurar las notificaciones.");
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 left-4 right-4 z-[100] md:left-auto md:right-8 md:w-96 animate-in slide-in-from-top-10 duration-500">
      <div className="bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 rounded-[2rem] p-5 shadow-2xl relative overflow-hidden group">
        
        {/* Efecto de fondo sutil */}
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 blur-2xl rounded-full group-hover:bg-orange-500/20 transition-all duration-500"></div>
        
        <div className="flex gap-4 relative z-10">
          <div className="bg-orange-500/20 p-3 rounded-2xl flex-shrink-0">
            <Bell className="w-6 h-6 text-orange-500 animate-bounce" />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-white text-xs font-black uppercase tracking-widest italic flex items-center gap-2">
                <Zap className="w-3 h-3 text-amber-400" /> Alertas Gibbor
              </h4>
              <button 
                onClick={() => setIsVisible(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-slate-300 text-[11px] font-medium leading-relaxed mb-4">
              ¿Quieres recibir alertas de cambios en entrenamientos y noticias urgentes al celular?
            </p>

            <button
              onClick={habilitarNotificaciones}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Sí, Activar Notificaciones <ShieldCheck className="w-3.5 h-3.5" /></>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
