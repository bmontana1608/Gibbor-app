'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Send, Clock, Trash2, CheckCircle, XCircle, Loader2, CalendarClock, Phone, MessageSquare, RefreshCw } from 'lucide-react';

// Formatea una fecha en la hora LOCAL del navegador para el input datetime-local
// Evita el bug de UTC donde las 7am Colombia aparecen como 12pm
const toLocalDatetimeString = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function MensajesProgramadosView() {
  const [clubes, setClubes] = useState<any[]>([]);
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [telefono, setTelefono] = useState('');
  const [clubSeleccionado, setClubSeleccionado] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [modoEnvio, setModoEnvio] = useState<'ahora' | 'programado'>('programado');
  const [fechaHora, setFechaHora] = useState(() => {
    // Default: mañana a las 7:00 AM hora local (Colombia)
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    manana.setHours(7, 0, 0, 0);
    return toLocalDatetimeString(manana);
  });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setLoading(true);
    const { data: clubesData } = await supabase
      .from('clubes').select('id, nombre, slug').neq('estado', 'Eliminado').order('nombre');
    const { data: mensajesData } = await supabase
      .from('mensajes_cola')
      .select('*, clubes(nombre, slug)')
      .in('estado', ['Pendiente', 'Enviado', 'Error', 'Cancelado'])
      .not('programado_para', 'is', null)
      .order('programado_para', { ascending: false })
      .limit(50);
    if (clubesData) setClubes(clubesData);
    if (mensajesData) setMensajes(mensajesData);
    setLoading(false);
  };

  const handleClubChange = async (clubId: string) => {
    setClubSeleccionado(clubId);
    if (!clubId) { setTelefono(''); return; }
    const { data: director } = await supabase
      .from('perfiles').select('telefono').eq('club_id', clubId).eq('rol', 'Director').limit(1).single();
    if (director?.telefono) setTelefono(director.telefono);
  };

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telefono.trim() || !mensaje.trim() || !clubSeleccionado) {
      toast.error('Club, teléfono y mensaje son obligatorios'); return;
    }
    setEnviando(true);
    const toastId = toast.loading(modoEnvio === 'ahora' ? 'Enviando...' : 'Programando...');
    try {
      const programadoPara = modoEnvio === 'programado' ? new Date(fechaHora).toISOString() : null;
      const { error } = await supabase.from('mensajes_cola').insert([{
        club_id: clubSeleccionado,
        telefono_destino: telefono.replace(/\D/g, ''),
        mensaje: mensaje.trim(),
        estado: 'Pendiente',
        programado_para: programadoPara,
      }]);
      if (error) throw error;
      if (modoEnvio === 'ahora') {
        await fetch('/api/cron/whatsapp');
        toast.success('Mensaje enviado', { id: toastId });
      } else {
        const horaLocal = new Date(fechaHora).toLocaleString('es-CO', {
          weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
        });
        toast.success(`Mensaje programado para el ${horaLocal}`, { id: toastId });
      }
      setMensaje(''); setTelefono(''); setClubSeleccionado('');
      cargarDatos();
    } catch (err: any) {
      toast.error('Error: ' + err.message, { id: toastId });
    }
    setEnviando(false);
  };

  const cancelarMensaje = async (id: string) => {
    await supabase.from('mensajes_cola').update({ estado: 'Cancelado' }).eq('id', id);
    toast.success('Mensaje cancelado');
    cargarDatos();
  };

  const getEstadoBadge = (estado: string, programadoPara: string | null) => {
    if (estado === 'Enviado') return <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> Enviado</span>;
    if (estado === 'Error') return <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full"><XCircle className="w-3 h-3" /> Error</span>;
    if (estado === 'Cancelado') return <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Cancelado</span>;
    if (programadoPara && new Date(programadoPara) > new Date()) {
      return <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full"><Clock className="w-3 h-3 animate-pulse" /> Programado</span>;
    }
    return <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full"><Send className="w-3 h-3" /> En Cola</span>;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase italic flex items-center gap-2">
            <CalendarClock className="w-7 h-7 text-emerald-500" /> Mensajes Programados
          </h2>
          <p className="text-slate-500 text-sm mt-1">Programa mensajes de WhatsApp para enviarlos a la hora exacta que elijas.</p>
        </div>
        <button onClick={cargarDatos} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <form onSubmit={handleEnviar} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
        <h3 className="font-black text-slate-700 uppercase text-sm tracking-widest flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-500" /> Nuevo Mensaje
        </h3>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Club destinatario</label>
          <select value={clubSeleccionado} onChange={e => handleClubChange(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" required>
            <option value="">Seleccionar club...</option>
            {clubes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
            <Phone className="w-3 h-3 inline mr-1" /> Teléfono (con código de país)
          </label>
          <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
            placeholder="573001234567"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" required />
          <p className="text-xs text-slate-400 mt-1">Sin espacios ni guiones. Ej: 573001234567</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Mensaje</label>
          <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={4} maxLength={1000}
            placeholder="Hola! Te escribimos para confirmarte que tu soporte quedó resuelto..."
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" required />
          <p className="text-xs text-slate-400 mt-1 text-right">{mensaje.length}/1000</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">¿Cuándo enviarlo?</label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setModoEnvio('ahora')}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${modoEnvio === 'ahora' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              ⚡ Enviar Ahora
            </button>
            <button type="button" onClick={() => setModoEnvio('programado')}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${modoEnvio === 'programado' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              📅 Programar
            </button>
          </div>
        </div>

        {modoEnvio === 'programado' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <label className="block text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">
              <Clock className="w-3 h-3 inline mr-1" /> Fecha y hora de envío
            </label>
            <input type="datetime-local" value={fechaHora} onChange={e => setFechaHora(e.target.value)}
              min={toLocalDatetimeString(new Date())}
              className="w-full border border-amber-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              required={modoEnvio === 'programado'} />
            <p className="text-xs text-amber-600 mt-2">El cron revisa cada minuto — el envío puede tardar hasta 60 segundos después de la hora programada.</p>
          </div>
        )}

        <button type="submit" disabled={enviando}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50">
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : modoEnvio === 'ahora' ? <Send className="w-4 h-4" /> : <CalendarClock className="w-4 h-4" />}
          {enviando ? 'Procesando...' : modoEnvio === 'ahora' ? 'Enviar Ahora' : 'Programar Mensaje'}
        </button>
      </form>

      <div>
        <h3 className="font-black text-slate-700 uppercase text-sm tracking-widest mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" /> Historial
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : mensajes.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
            <CalendarClock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Sin mensajes programados aún</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mensajes.map(m => (
              <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {getEstadoBadge(m.estado, m.programado_para)}
                    <span className="text-xs text-slate-500 font-bold">{m.clubes?.nombre}</span>
                    <span className="text-xs text-slate-400">· {m.telefono_destino}</span>
                  </div>
                  <p className="text-sm text-slate-700 line-clamp-2">{m.mensaje}</p>
                  {m.programado_para && (
                    <p className="text-xs text-amber-600 font-bold mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(m.programado_para).toLocaleString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                {m.estado === 'Pendiente' && (
                  <button onClick={() => cancelarMensaje(m.id)}
                    className="text-red-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors flex-shrink-0" title="Cancelar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
