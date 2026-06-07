'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@/lib/hooks/useTenant';
import { supabase } from '@/lib/supabase';
import { Megaphone, MessageCircle, Send, CheckCircle2, Clock, AlertCircle, RefreshCw, XCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function ComunicacionMasiva() {
  const { slug } = useTenant();
  const [tenant, setTenant] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Form state
  const [audiencia, setAudiencia] = useState('Todos');
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [metodos, setMetodos] = useState<string[]>(['whatsapp', 'inapp']);
  const [enviando, setEnviando] = useState(false);

  // Status state
  const [cola, setCola] = useState<any>({ pendientes: 0, enviados: 0, errores: 0 });

  useEffect(() => {
    async function init() {
      const res = await fetch(`/api/tenant?slug=${slug}`);
      const t = await res.json();
      setTenant(t);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: p } = await supabase.from('perfiles').select('*').eq('id', session.user.id).single();
        setPerfil(p);
      }

      const { data: cats } = await supabase.from('categorias').select('nombre').eq('club_id', t.id).eq('estado', 'Activo');
      if (cats) setCategorias(cats);

      await fetchStatusQueue(t.id);
      setCargando(false);
    }
    if (slug) init();
  }, [slug]);

  const fetchStatusQueue = async (club_id: string) => {
    const { data } = await supabase
      .from('mensajes_cola')
      .select('estado')
      .eq('club_id', club_id);
    
    if (data) {
      const pendientes = data.filter(d => d.estado === 'Pendiente').length;
      const enviados = data.filter(d => d.estado === 'Enviado').length;
      const errores = data.filter(d => d.estado === 'Error').length;
      setCola({ pendientes, enviados, errores });
    }
  };

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (metodos.length === 0) return toast.error('Selecciona al menos un método de envío');
    if (metodos.includes('inapp') && !titulo) return toast.error('El título es obligatorio para el Tablón de Anuncios');
    if (!mensaje) return toast.error('El mensaje no puede estar vacío');
    if (!window.confirm(`¿Estás seguro de encolar este mensaje para ${audiencia}?`)) return;

    setEnviando(true);
    const toastId = toast.loading('Procesando destinatarios...');

    try {
      const res = await fetch('/api/comunicacion/encolar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          club_id: tenant.id,
          creador_id: perfil.id,
          audiencia,
          titulo,
          mensaje,
          metodos
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error desconocido');

      toast.success(`Mensaje procesado. ${data.resumen.whatsapp_encolados} encolados en WA. ${data.resumen.inapp_creados} publicados In-App.`, { id: toastId });
      setMensaje('');
      setTitulo('');
      await fetchStatusQueue(tenant.id);
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setEnviando(false);
    }
  };

  const toggleMetodo = (m: string) => {
    if (metodos.includes(m)) setMetodos(metodos.filter(x => x !== m));
    else setMetodos([...metodos, m]);
  };

  if (cargando) return <div className="p-10 text-center text-slate-500">Cargando panel de comunicación...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tighter">
            <Megaphone className="text-brand" />
            Central de Comunicación
          </h1>
          <p className="text-slate-500 font-medium mt-2">Envía anuncios a la plataforma y programa mensajes masivos por WhatsApp sin riesgo de baneo.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Panel Izquierdo: Formulario de Envío */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-lg font-black uppercase tracking-widest text-slate-800 dark:text-white mb-6 border-b pb-4 border-slate-100 dark:border-slate-800">Redactar Comunicado</h2>
              
              <form onSubmit={handleEnviar} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Público Objetivo (Audiencia)</label>
                    <select 
                      value={audiencia} 
                      onChange={(e) => setAudiencia(e.target.value)}
                      className="text-brand outline-none"
                    >
                      <option value="Todos">Todos los Miembros Activos</option>
                      <option value="Deudores">Solo Alumnos con Pagos Pendientes</option>
                      <optgroup label="Por Categoría">
                        {categorias.map(c => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Métodos de Envío</label>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => toggleMetodo('inapp')}
                        className={`flex-1 py-3 px-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border-2 transition-all ${metodos.includes('inapp') ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-500 dark:text-indigo-300' : 'bg-white border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'}`}
                      >
                        <AlertCircle className="w-4 h-4" /> Tablón In-App
                      </button>
                      <button 
                        type="button" 
                        onClick={() => toggleMetodo('whatsapp')}
                        className={`flex-1 py-3 px-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border-2 transition-all ${metodos.includes('whatsapp') ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-500 dark:text-emerald-300' : 'bg-white border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'}`}
                      >
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </button>
                    </div>
                  </div>
                </div>

                {metodos.includes('inapp') && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Título del Comunicado (Solo para Tablón)</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Suspensión de entrenamientos por lluvia"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      className="text-brand outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mensaje Principal</label>
                  <textarea 
                    rows={6}
                    placeholder="Escribe el cuerpo del mensaje aquí..."
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    className="text-brand outline-none resize-none"
                  ></textarea>
                  {metodos.includes('whatsapp') && (
                    <p className="text-[10px] text-slate-400 mt-2 italic">* Los mensajes de WhatsApp se encolarán y enviarán progresivamente para proteger tu número de bloqueos por SPAM.</p>
                  )}
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={enviando}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50"
                  >
                    {enviando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {enviando ? 'Encolando...' : 'Programar Envío masivo'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Panel Derecho: Estado de la Cola WA */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[2rem] p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 opacity-10 rounded-full blur-3xl"></div>
              
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Cola de WhatsApp
                </h3>
                <button onClick={() => fetchStatusQueue(tenant.id)} className="p-2 hover:bg-slate-800 rounded-lg transition-all" title="Actualizar">
                  <RefreshCw className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 relative z-10 mb-6">
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Pendientes</p>
                  <p className="text-3xl font-black text-amber-400">{cola.pendientes}</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Enviados</p>
                  <p className="text-3xl font-black text-emerald-400">{cola.enviados}</p>
                </div>
              </div>

              <div className="bg-slate-800/30 p-4 rounded-2xl border border-red-500/20 relative z-10 flex items-center justify-between">
                 <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase">Errores de Envío</span>
                 </div>
                 <span className="font-black">{cola.errores}</span>
              </div>

              <div className="mt-6 text-[10px] text-slate-400 font-medium">
                El despachador automático revisa esta cola cada 1 minuto y envía pequeños lotes para evitar que Meta banee tu cuenta.
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Users className="text-brand" /> Consejos de Envío</h3>
              <ul className="space-y-3 text-xs text-slate-500 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-brand mt-0.5">•</span>
                  <span>Usa el filtro <strong>"Solo Deudores"</strong> en los últimos días del mes para cobrar amablemente.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand mt-0.5">•</span>
                  <span>Si se cancela un entreno de emergencia, usa siempre ambos métodos (In-App y WhatsApp).</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
