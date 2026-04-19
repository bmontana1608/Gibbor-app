'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Megaphone, Send, History, Smartphone, Bell, Loader2, Sparkles, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function PaginaComunicados() {
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [totalSubscribers, setTotalSubscribers] = useState(0);

  useEffect(() => {
    verificarSuscripcion();
    contarSuscritos();
  }, []);

  const verificarSuscripcion = async () => {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      }
    }
  };

  const contarSuscritos = async () => {
    const { count } = await supabase.from('push_subscriptions').select('*', { count: 'exact', head: true });
    setTotalSubscribers(count || 0);
  };

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

  const suscribirDispositivo = async () => {
    const toastId = toast.loading("Configurando notificaciones...");
    try {
      if (!('serviceWorker' in navigator)) return toast.error("Tu navegador no soporta notificaciones", { id: toastId });

      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js');
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return toast.error("Permiso denegado", { id: toastId });

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      });

      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription: sub })
      });

      if (res.ok) {
        toast.success("¡Notificaciones activadas en este dispositivo! 🎉", { id: toastId });
        setIsSubscribed(true);
        contarSuscritos();
      } else {
        throw new Error("Error en el servidor");
      }
    } catch (err: any) {
      toast.error("Error: " + err.message, { id: toastId });
    }
  };

  const enviarAlerta = async () => {
    if (!titulo || !mensaje) return toast.error("Completa el mensaje");
    if (totalSubscribers === 0) return toast.error("No hay usuarios suscritos todavía");

    setEnviando(true);
    const toastId = toast.loading("Enviando alerta a todos los dispositivos...");

    try {
      const res = await fetch('/api/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify({ titulo, mensaje })
      });

      if (res.ok) {
        toast.success("¡Comunicado enviado con éxito! 🚀", { id: toastId });
        setTitulo('');
        setMensaje('');
      } else {
        toast.error("Fallo al enviar comunicado", { id: toastId });
      }
    } catch (err) {
      toast.error("Error de red", { id: toastId });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans transition-colors">
      
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3 italic tracking-tighter uppercase">
              <Megaphone className="text-orange-500 w-9 h-9" /> Centro de Comunicados
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">Envía alertas instantáneas a todos los celulares de la academia.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                {totalSubscribers} Dispositivos Activos
              </p>
            </div>
          </div>
        </div>

        {/* BANNER DE ACTIVACIÓN (Para el usuario actual) */}
        {!isSubscribed && (
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-[2rem] p-6 text-white shadow-xl shadow-orange-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                   <Bell className="w-8 h-8" />
                </div>
                <div>
                   <h3 className="text-lg font-black uppercase italic tracking-tight">Activa tus propias alertas</h3>
                   <p className="text-sm text-orange-50">Suscríbete en este navegador para recibir las pruebas que envíes.</p>
                </div>
             </div>
             <button 
              onClick={suscribirDispositivo}
              className="bg-white text-orange-600 px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:scale-105 transition-all"
             >
                Habilitar Notificaciones
             </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* EDITOR DE COMUNICADO */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-600">
                  <Send className="w-5 h-5" />
               </div>
               <h2 className="text-xl font-bold text-slate-800 dark:text-white">Redactar Alerta</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Título de la Notificación</label>
                <input 
                  type="text" 
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Cambio de Horario ⚠️"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Mensaje (Breve y Urgente)</label>
                <textarea 
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Ej: El entrenamiento de hoy se traslada a las 4:00 PM en la Cancha Principal..."
                  rows={4}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-medium transition-all"
                />
              </div>

              <div className="pt-4">
                <button 
                  onClick={enviarAlerta}
                  disabled={enviando || !titulo || !mensaje || totalSubscribers === 0}
                  className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:bg-slate-200 dark:disabled:bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all"
                >
                  {enviando ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                  {enviando ? 'Enviando Alertas...' : 'Lanzar Comunicado'}
                </button>
              </div>
            </div>
          </div>

          {/* VISTA PREVIA Y ESTADÍSTICAS */}
          <div className="space-y-8">
            
            {/* SIMULADOR DE MÓVIL */}
            <div className="bg-slate-800 rounded-[3rem] p-4 border-8 border-slate-900 shadow-2xl relative overflow-hidden aspect-[9/16] max-w-[280px] mx-auto group">
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-12 h-4 bg-slate-900 rounded-full z-10"></div>
                <div className="mt-20 px-4">
                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl shadow-black/20 animate-bounce duration-[2000ms]">
                        <div className="flex items-center gap-2 mb-2">
                           <img src="/logo.png" className="w-4 h-4 rounded-full" />
                           <span className="text-[8px] font-bold text-slate-500">Gibbor App • Ahora</span>
                        </div>
                        <h4 className="text-xs font-black text-slate-800 truncate">{titulo || 'Título del Comunicado'}</h4>
                        <p className="text-[10px] text-slate-600 mt-1 line-clamp-2">{mensaje || 'Aquí aparecerá tu mensaje de alerta como una notificación real...'}</p>
                    </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 space-y-4">
               <div className="flex items-center gap-3 text-orange-500">
                  <Info className="w-5 h-5" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Las notificaciones llegan incluso si el usuario no tiene la app abierta en ese momento.</p>
               </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
