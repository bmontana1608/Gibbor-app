'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { 
  Bot, Zap, CheckCircle2, 
  ArrowLeft, Smartphone, ShieldCheck, Mail, Send,
  Settings, Clock, AlertCircle, Users, MessageCircle, RefreshCw, Server
} from 'lucide-react';
import { useTenant } from '@/lib/hooks/useTenant';

export default function AsistenteWhatsApp() {
  const router = useRouter();
  const [conectado, setConectado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [tokenInstancia, setTokenInstancia] = useState<string | null>(null);
  const [instanciaConfigurada, setInstanciaConfigurada] = useState(false);
  const { slug, basePath } = useTenant();

  useEffect(() => {
    if (slug && slug !== 'master') {
      verificarEstadoActual(slug);
    }
  }, [slug]);

  const verificarEstadoActual = async (slug: string) => {
    try {
      const res = await fetch(`/api/whatsapp/instance?slug=${slug}`);
      const data = await res.json();
      if (data.status === 'connected') {
        setConectado(true);
      } else if (data.status === 'qr') {
        setQrCode(data.qr);
      }
    } catch (e) {
      console.error("Error al verificar estado inicial:", e);
    }
  };

  // Función para generar QR REAL (Conexión con Evolution API)
  const generarQR = async () => {
    setCargando(true);
    setQrCode(null);
    
    try {
      if (!slug || slug === 'master') {
        console.error("DEBUG MCM: Slug no válido para WhatsApp:", slug);
        toast.error("No se pudo identificar el club. Asegúrate de estar en la URL correcta (ej: /tu-club/director)");
        return;
      }

      const res = await fetch(`/api/whatsapp/instance?slug=${slug}`);
      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.details || data.error || 'Unknown error';
        toast.error("Error en el servidor: " + errorMsg);
        return;
      }

      if (data.status === 'qr') {
        setQrCode(data.qr);
        toast.success("¡Código QR Generado!");
      } else if (data.status === 'connected') {
        setConectado(true);
        toast.success("¡Ya estás conectado!");
      }

    } catch (error: any) {
      toast.error("Error: " + error.message);
      console.error("Detalle del error:", error);
    } finally {
      setCargando(false);
    }
  };

  const handleDesvincular = async () => {
    if (!window.confirm("¿Estás seguro de que deseas desvincular este dispositivo de WhatsApp? Se detendrán los flujos de mensajería automática.")) return;
    
    setCargando(true);
    try {
      const res = await fetch(`/api/whatsapp/instance?slug=${slug}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setConectado(false);
        setQrCode(null);
        toast.success("Dispositivo desvinculado con éxito");
      } else {
        toast.error("Error al desvincular: " + (data.error || "Error desconocido"));
      }
    } catch (error: any) {
      toast.error("Error al desvincular: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  const [rawResponse, setRawResponse] = useState<string | null>(null);

  // Efecto para verificar si el usuario ya escaneó (Polling)
  useEffect(() => {
    let interval: any;
    if (qrCode && !conectado && slug) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/whatsapp/instance?slug=${slug}`);
          const data = await res.json();
          if (data.status === 'connected') {
            setConectado(true);
            setQrCode(null);
            toast.success('¡WhatsApp conectado exitosamente!');
            clearInterval(interval);
          } else if (data.status === 'qr' && data.qr) {
            // Actualizar el QR por si expiró y se generó uno nuevo
            setQrCode(data.qr);
          }
        } catch (e) {
          console.warn('Error en polling de vinculación:', e);
        }
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [qrCode, conectado, slug]);

  // Simulación de estados de automatización
  const [config, setConfig] = useState({
    bienvenida: true,
    recibos: true,
    recordatorios: true,
    notificar_comprobante: true
  });

  const toggleConfig = (key: keyof typeof config) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      
      {/* Botón Volver */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => router.back()} 
          className="text-slate-500 hover:text-brand flex items-center gap-2 transition-colors font-bold text-sm w-fit group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al Panel
        </button>
      </div>

      <div className="max-w-5xl mx-auto">
        
        {/* Banner de Presentación */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden mb-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand/10 rounded-full blur-3xl -ml-10 -mb-10"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-emerald-500/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-emerald-500/30 shrink-0 shadow-inner">
              <Bot className="w-12 h-12 md:w-16 md:h-16 text-emerald-400 animate-pulse" />
            </div>
            
            <div className="text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                  <Zap className="w-3 h-3 fill-current" /> Nuevo Módulo
                </span>
                <span className="bg-white/10 text-white/70 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-white/10">
                  v2.0 Beta
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight leading-tight">
                Asistente Virtual de <span className="text-emerald-400">WhatsApp</span>
              </h1>
              <p className="text-slate-400 max-w-xl text-sm md:text-base font-medium leading-relaxed">
                Automatiza tu cobranza y comunicación. Tu asistente trabaja las 24 horas enviando recibos, recordatorios y procesando pagos sin que muevas un solo dedo.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Configuración y Conexión */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Estado de la Conexión */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${conectado ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                    <Smartphone className={`w-6 h-6 ${conectado ? 'text-emerald-500' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Estado del Terminal</h3>
                    <p className="text-xs text-slate-500">{conectado ? 'Terminal conectado y transmitiendo' : 'Esperando vinculación de dispositivo'}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${conectado ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  <span className={`w-2 h-2 rounded-full ${conectado ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`}></span>
                  {conectado ? 'Online' : 'Offline'}
                </div>
              </div>
              
              {!conectado ? (
                <div className="p-8 flex flex-col items-center text-center">
                  <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 mb-6 group hover:border-emerald-300 transition-colors cursor-pointer">
                    <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center shadow-md relative group-hover:scale-105 transition-transform overflow-hidden">
                       {qrCode ? (
                         <img src={qrCode.includes('base64') ? qrCode : `data:image/png;base64,${qrCode}`} alt="WhatsApp QR" className="w-full h-full object-cover" />
                       ) : (
                         <>
                          <div className="grid grid-cols-5 gap-2 opacity-20">
                              {Array.from({length: 25}).map((_, i) => <div key={i} className="w-4 h-4 bg-slate-900"></div>)}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                              {cargando ? <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin" /> : <Zap className="w-12 h-12 text-slate-200 group-hover:text-emerald-500 transition-colors" />}
                          </div>
                         </>
                       )}
                    </div>
                  </div>
                  <h4 className="font-black text-slate-800 uppercase tracking-tight mb-2">
                    {qrCode ? '¡Código Listo! Escanea ahora' : 'Vincula tu cuenta'}
                  </h4>
                  <p className="text-sm text-slate-500 max-w-sm mb-6">
                    Abre WhatsApp en tu teléfono, toca Configuración y selecciona Dispositivos vinculados para escanear el código.
                  </p>
                  <div className="flex gap-4">
                    <button 
                      onClick={generarQR}
                      disabled={cargando}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-100 flex items-center gap-2"
                    >
                      {cargando ? 'Cargando Servidor...' : qrCode ? 'Generar Nuevo QR' : 'Generar Nuevo Token QR'}
                    </button>
                    {qrCode && (
                       <button 
                        onClick={() => setConectado(true)}
                        className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-50"
                       >
                         Confirmar Vinculación
                       </button>
                    )}
                  </div>

                  {rawResponse && !qrCode && (
                    <div className="mt-8 w-full max-w-lg">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Respuesta del Servidor (Debug):</p>
                      <pre className="bg-slate-900 text-[10px] text-emerald-400 p-4 rounded-xl overflow-x-auto text-left border border-slate-800 shadow-inner">
                        {rawResponse}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8">
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex gap-4">
                       <CheckCircle2 className="w-10 h-10 text-emerald-500 shrink-0" />
                       <div>
                          <h4 className="font-bold text-emerald-800">¡Conexión Exitosa!</h4>
                          <p className="text-sm text-emerald-600">La plataforma está gestionando los mensajes a través del servidor central.</p>
                       </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => router.push(`${basePath}/director/whatsapp`)}
                        className="bg-white border border-emerald-500 text-emerald-600 px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-50 transition-all flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" /> Ver Historial de Chats
                      </button>
                      <button 
                        onClick={handleDesvincular} 
                        disabled={cargando}
                        className="text-xs font-bold text-red-600 hover:bg-red-50 disabled:bg-slate-100 px-4 py-2 rounded-lg transition-colors border border-red-100"
                      >
                        {cargando ? 'Cargando...' : 'Desvincular'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Configuraciones de Automatización */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                 <Settings className="w-4 h-4" /> Configuración de Automatización
               </h3>
               
               <div className="space-y-6">
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${config.bienvenida ? 'bg-brand/10 text-brand' : 'bg-slate-50 text-slate-400'}`}>
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">Mensaje de Bienvenida</p>
                        <p className="text-xs text-slate-500">Enviar automáticamente al registrar un nuevo miembro.</p>
                      </div>
                    </div>
                    <button onClick={() => toggleConfig('bienvenida')} className={`w-14 h-7 rounded-full relative transition-colors ${config.bienvenida ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${config.bienvenida ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${config.recibos ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                        <Mail className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">Envío de Recibos</p>
                        <p className="text-xs text-slate-500">Enviar comprobante PDF al generar un cobro en la plataforma.</p>
                      </div>
                    </div>
                    <button onClick={() => toggleConfig('recibos')} className={`w-14 h-7 rounded-full relative transition-colors ${config.recibos ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${config.recibos ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${config.recordatorios ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">Recordatorios de Cobro</p>
                        <p className="text-xs text-slate-500">Notificar automáticamente el día de vencimiento de la mensualidad.</p>
                      </div>
                    </div>
                    <button onClick={() => toggleConfig('recordatorios')} className={`w-14 h-7 rounded-full relative transition-colors ${config.recordatorios ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${config.recordatorios ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>
               </div>
            </div>
          </div>

          {/* Columna Derecha: Vista Previa y Log */}
          <div className="space-y-8">
             <div className="bg-slate-900 rounded-[3rem] p-4 border-[8px] border-slate-800 shadow-2xl relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20"></div>
                <div className="bg-[#e5ddd5] h-[500px] rounded-[2rem] overflow-hidden flex flex-col relative">
                   <div className="bg-[#075e54] p-4 pt-8 text-white flex items-center gap-3">
                      <Bot className="w-8 h-8 p-1 bg-white/20 rounded-full" />
                      <div>
                         <p className="text-xs font-bold leading-none">Asistente Automático</p>
                         <p className="text-[10px] text-emerald-200">En línea</p>
                      </div>
                   </div>
                   
                   <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                      <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-sm max-w-[85%] relative">
                         <p className="text-xs text-slate-800">¡Hola Alex! ⚽️</p>
                         <p className="text-[11px] text-slate-600 mt-1">Te informamos que tu mensualidad de **Abril** ya está disponible.</p>
                         <div className="mt-3 bg-slate-50 border border-slate-100 p-2 rounded-lg flex items-center gap-2">
                             <div className="text-brand font-bold text-[10px]">PDF</div>
                             <p className="text-[10px] font-bold text-slate-500">Recibo_458.pdf</p>
                         </div>
                      </div>

                      <div className="bg-[#dcf8c6] self-end p-3 rounded-xl rounded-tr-none shadow-sm max-w-[85%] ml-auto relative">
                         <p className="text-xs text-slate-800">¿Cuál es mi saldo actual?</p>
                      </div>

                      <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-sm max-w-[85%] relative">
                         <p className="text-xs text-slate-800">Tu saldo al día de hoy es de **$0**. Estás al día con el club. ¡Gracias!</p>
                      </div>
                   </div>

                   <div className="p-3 bg-white flex items-center gap-2">
                      <div className="flex-1 h-8 bg-slate-100 rounded-full"></div>
                      <div className="w-8 h-8 bg-[#128c7e] rounded-full flex items-center justify-center">
                         <Send className="w-4 h-4 text-white" />
                      </div>
                   </div>
                </div>
             </div>

             <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                   <ShieldCheck className="w-6 h-6 text-emerald-600" />
                   <h3 className="font-bold text-emerald-900 leading-tight">Seguridad de Datos</h3>
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                  La plataforma no almacena conversaciones personales. Solo gestiona flujos automatizados de cobranza cumpliendo con la Ley de Protección de Datos.
                </p>
             </div>
          </div>

        </div>

      </div>
    </div>
  );
}
