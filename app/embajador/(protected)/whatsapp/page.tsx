'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { 
  Bot, CheckCircle2, 
  ArrowLeft, Smartphone, RefreshCw, MessageCircle
} from 'lucide-react';

export default function EmbajadorWhatsApp() {
  const router = useRouter();
  const [conectado, setConectado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: embajador } = await supabase
          .from('embajadores')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (embajador) {
          const embajadorSlug = `embajador-${embajador.id}`;
          setSlug(embajadorSlug);
          verificarEstadoActual(embajadorSlug);
        }
      }
    };
    init();
  }, []);

  const verificarEstadoActual = async (instanceSlug: string) => {
    try {
      const res = await fetch(`/api/whatsapp/instance?slug=${instanceSlug}`);
      const data = await res.json();
      if (data.status === 'connected') {
        setConectado(true);
      } else if (data.status === 'qr') {
        setQrCode(data.qr);
      }
    } catch (e) {
      console.error('Error al verificar estado inicial:', e);
    }
  };

  const generarQR = async () => {
    if (!slug) return;
    setCargando(true);
    setQrCode(null);
    try {
      const res = await fetch(`/api/whatsapp/instance?slug=${slug}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al conectar con Evolution');
      if (data.status === 'connected') {
        setConectado(true);
        toast.success('¡Tu WhatsApp ya está conectado!');
      } else if (data.qr) {
        setQrCode(data.qr);
        toast.success('Escanea este código con tu WhatsApp');
      }
    } catch (e: any) {
      toast.error(e.message || 'No se pudo generar el QR');
    } finally {
      setCargando(false);
    }
  };

  const desconectar = async () => {
    if (!slug) return;
    if (!window.confirm('¿Seguro que quieres desconectar tu número?')) return;
    setCargando(true);
    try {
      const res = await fetch(`/api/whatsapp/instance?slug=${slug}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setConectado(false);
        setQrCode(null);
        toast.success('WhatsApp desconectado');
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast.error(e.message || 'Error al desconectar');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (qrCode && !conectado && slug) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/whatsapp/instance?slug=${slug}`);
          const data = await res.json();
          if (data.status === 'connected') {
            setConectado(true);
            toast.success('¡Dispositivo vinculado con éxito!');
            clearInterval(interval);
          }
        } catch {}
      }, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [qrCode, conectado, slug]);

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.back()}
          className="text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-4 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Smartphone className="w-8 h-8 text-emerald-500" />
          Conectar WhatsApp
        </h1>
        <p className="text-slate-500 mt-2 text-lg">
          Vincula tu número personal para chatear con prospectos y clubes directamente desde el CRM.
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />

          {conectado ? (
            <div className="py-8">
              <div className="mx-auto w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">WhatsApp Conectado</h2>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                Tu número está vinculado al servidor CRM. Ya puedes enviar y recibir mensajes de prospectos.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => router.push('/embajador/chat')}
                  className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-emerald-600 transition-all flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" /> Ir al Chat CRM
                </button>
                <button
                  onClick={desconectar}
                  disabled={cargando}
                  className="bg-white border border-rose-200 text-rose-600 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-50 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
                  Desvincular Número
                </button>
              </div>
            </div>
          ) : qrCode ? (
            <div className="py-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block mb-6 shadow-sm">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
                Esperando conexión...
              </h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                Abre WhatsApp en tu celular → Dispositivos Vinculados → Vincular un dispositivo → Escanea este código.
              </p>
            </div>
          ) : (
            <div className="py-10">
              <div className="mx-auto w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
                <Smartphone className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Vincular Dispositivo</h2>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                Al conectar tu WhatsApp, el CRM usará tu número para enviar mensajes. Tu celular debe mantenerse encendido.
              </p>
              <button
                onClick={generarQR}
                disabled={cargando}
                className="bg-slate-900 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 hover:-translate-y-0.5 transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {cargando ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                {cargando ? 'Conectando...' : 'Generar Código QR'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
