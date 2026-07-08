'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTenant } from '@/lib/hooks/useTenant';
import { Calculator, Plus, Trash2, Users, MessageSquare, Copy, CheckCircle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface ConceptoCosto {
  id: string;
  nombre: string;
  valor: number;
}

const CONCEPTOS_SUGERIDOS = [
  'Arbitraje',
  'Inscripción al Torneo',
  'Alquiler de Cancha',
  'Transporte / Flota',
  'Hidratación',
  'Balones',
  'Otro',
];

export default function CalculadoraCostos() {
  const { slug: tenantSlug } = useTenant();
  const [categorias, setCategorias] = useState<any[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState(false);

  const [conceptos, setConceptos] = useState<ConceptoCosto[]>([
    { id: '1', nombre: 'Arbitraje', valor: 0 },
  ]);

  // Cargar convocatorias usando el endpoint admin (evita restricciones RLS)
  useEffect(() => {
    async function cargar() {
      if (!tenantSlug) return;

      try {
        const res = await fetch(`/api/director/convocatorias?slug=${tenantSlug}`);
        if (!res.ok) throw new Error('Error al cargar convocatorias');
        const eventos: any[] = await res.json();

        const eventosConConteo = eventos
          .map((ev: any) => ({
            ...ev,
            jugadores: ev.convocatorias?.length || 0,
            label: `${ev.titulo} (${new Date(ev.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })})`
          }))
          .filter((ev: any) => ev.jugadores > 0);

        setCategorias(eventosConConteo);
        if (eventosConConteo.length > 0) setCategoriaSeleccionada(eventosConConteo[0]);
      } catch (err) {
        console.error('Error cargando convocatorias:', err);
      }
      setCargando(false);
    }
    cargar();
  }, [tenantSlug]);

  const totalGeneral = useMemo(
    () => conceptos.reduce((acc, c) => acc + (c.valor || 0), 0),
    [conceptos]
  );

  const cantidadJugadores = categoriaSeleccionada?.jugadores || 0;
  const costoPorJugador = cantidadJugadores > 0 ? totalGeneral / cantidadJugadores : 0;

  const agregarConcepto = () => {
    setConceptos(prev => [...prev, { id: Date.now().toString(), nombre: '', valor: 0 }]);
  };

  const eliminarConcepto = (id: string) => {
    if (conceptos.length === 1) return toast.error('Debe haber al menos un concepto.');
    setConceptos(prev => prev.filter(c => c.id !== id));
  };

  const actualizarConcepto = (id: string, campo: 'nombre' | 'valor', valor: string | number) => {
    setConceptos(prev =>
      prev.map(c => (c.id === id ? { ...c, [campo]: valor } : c))
    );
  };

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const generarMensaje = () => {
    if (!categoriaSeleccionada) return '';
    const desglose = conceptos
      .filter(c => c.valor > 0)
      .map(c => `   • ${c.nombre}: ${formatCOP(c.valor)}`)
      .join('\n');

    return `⚽ *APORTES EVENTO: ${(categoriaSeleccionada.titulo || categoriaSeleccionada.nombre || '').toUpperCase()}*\n\nEstimada familia, compartimos el resumen de costos para el próximo evento:\n\n${desglose}\n\n💰 *Total del evento:* ${formatCOP(totalGeneral)}\n👥 *Jugadores convocados:* ${cantidadJugadores}\n\n✅ *Aporte por jugador: ${formatCOP(Math.ceil(costoPorJugador))}*\n\nAgradecemos su puntual colaboración. ¡Los esperamos! 💪🔥`;
  };

  const copiarMensaje = () => {
    const msg = generarMensaje();
    navigator.clipboard.writeText(msg).then(() => {
      setCopiado(true);
      toast.success('Mensaje copiado al portapapeles');
      setTimeout(() => setCopiado(false), 3000);
    });
  };

  const abrirWhatsApp = () => {
    const msg = generarMensaje();
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (cargando) return (
    <div className="p-8 text-center text-slate-400 animate-pulse">Cargando calculadora...</div>
  );

  if (categorias.length === 0) return (
    <div className="p-8 md:p-16 text-center max-w-xl mx-auto">
      <Calculator className="w-12 h-12 text-slate-200 mx-auto mb-4" />
      <h2 className="text-xl font-black text-slate-700 mb-2">Sin convocatorias disponibles</h2>
      <p className="text-slate-500 font-medium">Para usar la calculadora necesitas al menos una convocatoria aprobada o pendiente con jugadores asignados.</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-3">
            <Calculator className="w-8 h-8 text-brand" />
            Calculadora de Costos
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Divide los gastos del evento entre los jugadores de la lista de convocados.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Panel Izquierdo: Categoría + Conceptos */}
        <div className="lg:col-span-3 space-y-6">

          {/* Selector de Categoría */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand" /> Lista de Convocados (Evento)
            </h2>
            <div className="relative">
              <select
                value={categoriaSeleccionada?.id || ''}
                onChange={e => {
                  const cat = categorias.find(c => c.id === e.target.value);
                  setCategoriaSeleccionada(cat || null);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 appearance-none outline-none focus:ring-2 focus:ring-brand pr-10 cursor-pointer"
              >
                {categorias.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.label || ev.titulo} — {ev.jugadores} convocados
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {categoriaSeleccionada && (
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-500 font-medium">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span><span className="font-black text-slate-700">{cantidadJugadores}</span> jugadores en la lista de este evento</span>
              </div>
            )}
          </div>

          {/* Conceptos de Costo */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calculator className="w-4 h-4 text-brand" /> Conceptos del Costo
              </h2>
              <button
                onClick={agregarConcepto}
                className="bg-brand/10 hover:bg-brand/20 text-brand font-black text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar ítem
              </button>
            </div>

            <div className="space-y-3">
              {conceptos.map((concepto, idx) => (
                <div key={concepto.id} className="flex items-center gap-3 group">
                  <div className="flex-1 flex gap-3">
                    {/* Nombre del concepto */}
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={concepto.nombre}
                        onChange={e => actualizarConcepto(concepto.id, 'nombre', e.target.value)}
                        placeholder="Ej: Arbitraje"
                        list={`sugeridos-${concepto.id}`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand transition-all"
                      />
                      <datalist id={`sugeridos-${concepto.id}`}>
                        {CONCEPTOS_SUGERIDOS.map(s => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </div>

                    {/* Valor */}
                    <div className="w-44 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">$</span>
                      <input
                        type="number"
                        value={concepto.valor || ''}
                        onChange={e => actualizarConcepto(concepto.id, 'valor', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        min={0}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand transition-all text-right"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => eliminarConcepto(concepto.id)}
                    className="text-slate-200 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Subtotales por concepto */}
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
              {conceptos.filter(c => c.valor > 0).map(c => (
                <div key={c.id} className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">{c.nombre || 'Sin nombre'}</span>
                  <span className="text-slate-700 font-bold">{formatCOP(c.valor)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel Derecho: Resultado */}
        <div className="lg:col-span-2 space-y-6">

          {/* Tarjeta de Resultado */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl text-white sticky top-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Calculator className="w-3.5 h-3.5" /> Resumen del Cálculo
            </p>

            <div className="space-y-4 mb-6">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Total General</p>
                <p className="text-3xl font-black text-white">{formatCOP(totalGeneral)}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Jugadores</p>
                  <p className="text-2xl font-black text-white">{cantidadJugadores}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Conceptos</p>
                  <p className="text-2xl font-black text-white">{conceptos.filter(c => c.valor > 0).length}</p>
                </div>
              </div>
            </div>

            {/* Costo por jugador (el resultado principal) */}
            <div className="bg-brand rounded-2xl p-5 shadow-lg shadow-brand/30 text-center mb-6">
              <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-2">APORTE POR JUGADOR</p>
              <p className="text-4xl font-black text-white leading-none">
                {formatCOP(Math.ceil(costoPorJugador))}
              </p>
              {cantidadJugadores === 0 && (
                <p className="text-white/60 text-xs mt-2 font-medium">Sin jugadores en la lista</p>
              )}
            </div>

            {/* Desglose por concepto */}
            {conceptos.filter(c => c.valor > 0).length > 1 && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6 space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Desglose por concepto/jugador</p>
                {conceptos.filter(c => c.valor > 0).map(c => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium text-xs">{c.nombre}</span>
                    <span className="text-white font-bold text-xs">{formatCOP(Math.ceil(c.valor / (cantidadJugadores || 1)))}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Botones de Acción */}
            <div className="space-y-3">
              <button
                onClick={copiarMensaje}
                disabled={totalGeneral === 0 || cantidadJugadores === 0}
                className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
              >
                {copiado ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiado ? '¡Copiado!' : 'Copiar Mensaje'}
              </button>

              <button
                onClick={abrirWhatsApp}
                disabled={totalGeneral === 0 || cantidadJugadores === 0}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/30"
              >
                <MessageSquare className="w-4 h-4" />
                Enviar por WhatsApp
              </button>
            </div>
          </div>

          {/* Vista previa del mensaje */}
          {totalGeneral > 0 && cantidadJugadores > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Vista Previa del Mensaje</p>
              <div className="bg-[#dcf8c6] rounded-xl p-4 text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed text-xs border border-green-100 shadow-inner">
                {generarMensaje()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
