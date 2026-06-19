'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useTenant } from '@/lib/hooks/useTenant';
import {
  Trophy, Plus, Calendar, ChevronLeft, CheckCircle2,
  Circle, X, Loader2, Coins, Flame, Users
} from 'lucide-react';

type EventoDeportivo = {
  id: string;
  nombre: string;
  tipo: string;
  fecha: string;
  monto_sugerido: number;
  descripcion: string | null;
  categorias_destino?: string[];
  convocatorias?: any[];
  total_pagado?: number;
  total_alumnos?: number;
  total_pagaron?: number;
};

type AporteAlumno = {
  id: string | null;
  perfil_id: string;
  nombre: string;
  apellidos: string;
  categoria: string;
  pagado: boolean;
  monto: number;
  fecha_pago: string | null;
};

const TIPOS_EVENTO = ['Partido Amistoso', 'Torneo', 'Cancha', 'Arbitraje', 'Viaje', 'Concentración', 'Otro'];

const TIPO_COLORS: Record<string, string> = {
  'Partido Amistoso': 'bg-green-50 text-green-700 border-green-200',
  'Torneo': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Cancha': 'bg-blue-50 text-blue-700 border-blue-200',
  'Arbitraje': 'bg-purple-50 text-purple-700 border-purple-200',
  'Viaje': 'bg-brand/10 text-orange-700 border-brand/40',
  'Concentración': 'bg-red-50 text-red-700 border-red-200',
  'Otro': 'bg-slate-50 text-slate-600 border-slate-200',
};

export default function AportesPage() {
  const { route, slug: tenantSlug } = useTenant();
  const [clubId, setClubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<EventoDeportivo[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [perfilesClub, setPerfilesClub] = useState<any[]>([]);

  // Vista detalle
  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoDeportivo | null>(null);
  const [aportes, setAportes] = useState<AporteAlumno[]>([]);
  const [loadingAportes, setLoadingAportes] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modal crear evento
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'Partido Amistoso',
    fecha: new Date().toISOString().split('T')[0],
    monto_sugerido: '',
    descripcion: '',
    categorias_seleccionadas: [] as string[],
  });

  // --- Obtener club_id desde tenant ---
  const fetchClubId = useCallback(async () => {
    if (!tenantSlug) return null;
    try {
      const res = await fetch(`/api/tenant?slug=${tenantSlug}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      setClubId(data.id);
      return data.id;
    } catch { return null; }
  }, [tenantSlug]);

  // --- Cargar eventos del club ---
  const fetchEventos = useCallback(async (cId?: string) => {
    setLoading(true);
    const id = cId || clubId;
    if (!id) return;

    // Obtener todos los perfiles activos para saber la cantidad de alumnos por categoría
    const { data: perfilesData } = await supabase
      .from('perfiles')
      .select('id, grupos')
      .eq('club_id', id)
      .not('rol', 'in', '("Director","Entrenador")')
      .eq('estado_miembro', 'Activo');
      
    const perfilesActivos = perfilesData || [];
    setPerfilesClub(perfilesActivos);

    // Extraer categorías únicas
    const cats = Array.from(new Set(perfilesActivos.map(p => p.grupos || 'Sin categoría'))).filter(Boolean).sort();
    setCategorias(cats as string[]);

    const { data, error } = await supabase
      .from('eventos_deportivos')
      .select(`id, nombre, tipo, fecha, monto_sugerido, descripcion, categorias_destino, aportes_eventos(id, pagado, monto, perfil_id)`)
      .eq('club_id', id)
      .order('fecha', { ascending: false });

    if (error) { toast.error('Error cargando eventos'); setLoading(false); return; }

    const enriched: EventoDeportivo[] = (data || []).map((ev: any) => {
      const apList: any[] = ev.aportes_eventos || [];
      const pagaron = apList.filter((a: any) => a.pagado);
      
      let totalEsperado = 0;
      if (ev.convocatorias && ev.convocatorias.length > 0) {
        totalEsperado = ev.convocatorias.length;
      } else if (ev.categorias_destino && ev.categorias_destino.length > 0) {
        totalEsperado = perfilesActivos.filter(p => ev.categorias_destino.includes(p.grupos || 'Sin categoría')).length;
      } else {
        totalEsperado = perfilesActivos.length;
      }

      return {
        id: ev.id,
        nombre: ev.nombre,
        tipo: ev.tipo,
        fecha: ev.fecha,
        monto_sugerido: ev.monto_sugerido,
        descripcion: ev.descripcion,
        categorias_destino: ev.categorias_destino,
        convocatorias: ev.convocatorias,
        total_alumnos: totalEsperado,
        total_pagaron: pagaron.length,
        total_pagado: pagaron.reduce((s: number, a: any) => s + (parseFloat(a.monto) || 0), 0),
      };
    });

    setEventos(enriched);
    setLoading(false);
  }, [clubId, supabase]);

  useEffect(() => {
    fetchClubId().then((id) => { if (id) fetchEventos(id); });
  }, [tenantSlug]);

  // --- Cargar aportes de un evento ---
  const abrirEvento = async (evento: EventoDeportivo) => {
    setEventoSeleccionado(evento);
    setLoadingAportes(true);

    const id = clubId;
    if (!id) return;

    // Todos los miembros activos del club (excluye directores y entrenadores)
    const { data: perfiles } = await supabase
      .from('perfiles')
      .select('id, nombres, apellidos, grupos')
      .eq('club_id', id)
      .not('rol', 'in', '("Director","Entrenador")')
      .eq('estado_miembro', 'Activo')
      .order('nombres', { ascending: true });

    // Aportes ya registrados para este evento
    const { data: aportesExistentes } = await supabase
      .from('aportes_eventos')
      .select('id, perfil_id, pagado, monto, fecha_pago')
      .eq('evento_id', evento.id);

    const aportesMap: Record<string, any> = {};
    (aportesExistentes || []).forEach((a: any) => { aportesMap[a.perfil_id] = a; });

    let perfilesFiltrados = perfiles || [];

    if (evento.convocatorias && evento.convocatorias.length > 0) {
      // Filtrar SOLO a los convocados
      const idsConvocados = evento.convocatorias.map((c: any) => c.jugador_id);
      perfilesFiltrados = perfilesFiltrados.filter((p: any) => idsConvocados.includes(p.id));
    } else if (evento.categorias_destino && evento.categorias_destino.length > 0) {
      // Filtrar por categorías destino seleccionadas
      perfilesFiltrados = perfilesFiltrados.filter((p: any) => evento.categorias_destino!.includes(p.grupos || 'Sin categoría'));
    }

    const lista: AporteAlumno[] = perfilesFiltrados.map((p: any) => {
      const ap = aportesMap[p.id];
      return {
        id: ap?.id || null,
        perfil_id: p.id,
        nombre: p.nombres,
        apellidos: p.apellidos,
        categoria: p.grupos || 'Sin categoría',
        pagado: ap?.pagado || false,
        monto: ap?.monto ?? (evento.monto_sugerido || 0),
        fecha_pago: ap?.fecha_pago || null,
      };
    });

    setAportes(lista);
    setLoadingAportes(false);
  };

  // --- Marcar / desmarcar aporte ---
  const toggleAporte = async (alumno: AporteAlumno) => {
    if (!eventoSeleccionado || !clubId) return;
    setUpdatingId(alumno.perfil_id);

    const nuevoPagado = !alumno.pagado;
    const hoy = new Date().toISOString().split('T')[0];

    if (alumno.id) {
      await supabase.from('aportes_eventos').update({
        pagado: nuevoPagado,
        fecha_pago: nuevoPagado ? hoy : null,
      }).eq('id', alumno.id);
    } else {
      await supabase.from('aportes_eventos').insert({
        club_id: clubId,
        evento_id: eventoSeleccionado.id,
        perfil_id: alumno.perfil_id,
        monto: alumno.monto,
        pagado: nuevoPagado,
        fecha_pago: nuevoPagado ? hoy : null,
      });
    }

    setAportes(prev => prev.map(a =>
      a.perfil_id === alumno.perfil_id
        ? { ...a, pagado: nuevoPagado, id: a.id || 'pending', fecha_pago: nuevoPagado ? hoy : null }
        : a
    ));
    setUpdatingId(null);
  };

  // --- Crear evento ---
  const handleCrearEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId) return;
    setSaving(true);

    const { error } = await supabase.from('eventos_deportivos').insert({
      club_id: clubId,
      nombre: form.nombre,
      tipo: form.tipo,
      fecha: form.fecha,
      monto_sugerido: parseFloat(form.monto_sugerido) || 0,
      descripcion: form.descripcion || null,
      categorias_destino: form.categorias_seleccionadas.length > 0 ? form.categorias_seleccionadas : null,
    });

    if (error) {
      toast.error('Error al crear el evento: ' + error.message);
    } else {
      toast.success('¡Evento creado exitosamente!');
      setShowModal(false);
      setForm({ nombre: '', tipo: 'Partido Amistoso', fecha: new Date().toISOString().split('T')[0], monto_sugerido: '', descripcion: '', categorias_seleccionadas: [] });
      fetchEventos();
    }
    setSaving(false);
  };

  // --- Eliminar evento ---
  const eliminarEvento = async (id: string) => {
    if (!window.confirm('¿Eliminar este evento y todos sus registros de aportes? Esta acción no se puede deshacer.')) return;
    const toastId = toast.loading('Eliminando evento...');
    const { error } = await supabase.from('eventos_deportivos').delete().eq('id', id);
    if (error) { toast.error('Error: ' + error.message, { id: toastId }); return; }
    toast.success('Evento eliminado', { id: toastId });
    setEventos(prev => prev.filter(ev => ev.id !== id));
  };

  const getInitials = (nombres: string, apellidos: string) => {
    const n = nombres?.trim()[0] || '';
    const a = apellidos?.trim()[0] || '';
    return `${n}${a}`.toUpperCase() || 'NA';
  };

  // ===================== VISTA DETALLE DE EVENTO =====================
  if (eventoSeleccionado) {
    const pagaron = aportes.filter(a => a.pagado);
    const totalRecaudado = pagaron.reduce((s, a) => s + (a.monto || 0), 0);
    const pct = aportes.length > 0 ? Math.round((pagaron.length / aportes.length) * 100) : 0;

    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => { setEventoSeleccionado(null); fetchEventos(); }}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-sm font-bold transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" /> Volver a Eventos
          </button>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-2xl font-black text-slate-800">{eventoSeleccionado.nombre}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TIPO_COLORS[eventoSeleccionado.tipo] || TIPO_COLORS['Otro']}`}>
                  {eventoSeleccionado.tipo}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(eventoSeleccionado.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              {eventoSeleccionado.descripcion && (
                <p className="text-sm text-slate-500 mt-1">{eventoSeleccionado.descripcion}</p>
              )}
            </div>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm border-l-4 border-l-emerald-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Recaudado</p>
            <h3 className="text-xl font-black text-emerald-600">${totalRecaudado.toLocaleString('es-CO')}</h3>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm border-l-4 border-l-blue-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto / Alumno</p>
            <h3 className="text-xl font-black text-slate-800">${(eventoSeleccionado.monto_sugerido || 0).toLocaleString('es-CO')}</h3>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm border-l-4 border-l-indigo-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pagaron</p>
            <h3 className="text-xl font-black text-indigo-600">{pagaron.length} <span className="text-sm text-slate-400 font-medium">/ {aportes.length}</span></h3>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm border-l-4 border-l-rose-400">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pendientes</p>
            <h3 className="text-xl font-black text-rose-500">{aportes.length - pagaron.length}</h3>
          </div>
        </div>

        {/* Barra de progreso */}
        {aportes.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm mb-6">
            <div className="flex justify-between text-xs text-slate-500 mb-2 font-bold">
              <span>Progreso de cobro</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Tabla de alumnos */}
        {loadingAportes ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8 text-brand" /></div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" /> Registro de Aportes ({aportes.length} miembros)
              </h4>
              <p className="text-[11px] text-slate-400">Toca cada fila para marcar el pago</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                    <th className="p-4 md:px-6">Miembro</th>
                    <th className="p-4 md:px-6">Categoría</th>
                    <th className="p-4 md:px-6">Monto</th>
                    <th className="p-4 md:px-6">Estado</th>
                    <th className="p-4 md:px-6 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aportes.map(a => (
                    <tr key={a.perfil_id} className={`hover:bg-slate-50/60 transition-colors ${a.pagado ? 'bg-emerald-50/20' : ''}`}>
                      <td className="p-4 md:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600 border border-slate-200 flex-shrink-0">
                            {getInitials(a.nombre, a.apellidos)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 uppercase">{a.nombre} {a.apellidos}</p>
                            {a.fecha_pago && (
                              <p className="text-[10px] text-slate-400">{new Date(a.fecha_pago + 'T12:00:00').toLocaleDateString('es-CO')}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 md:px-6">
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{a.categoria}</span>
                      </td>
                      <td className="p-4 md:px-6 font-black text-slate-700">${a.monto.toLocaleString('es-CO')}</td>
                      <td className="p-4 md:px-6">
                        {a.pagado ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Pagó
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-200">
                            <Circle className="w-3 h-3" /> Pendiente
                          </span>
                        )}
                      </td>
                      <td className="p-4 md:px-6 text-right">
                        <button
                          onClick={() => toggleAporte(a)}
                          disabled={updatingId === a.perfil_id}
                          className={`text-xs font-bold py-1.5 px-3 rounded-lg border transition-all disabled:opacity-50 ${
                            a.pagado
                              ? 'border-red-200 text-red-500 hover:bg-red-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 bg-emerald-50/50'
                          }`}
                        >
                          {updatingId === a.perfil_id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : a.pagado ? 'Desmarcar' : '✓ Pagó'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {aportes.length === 0 && (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">No hay miembros activos en el club.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===================== VISTA LISTA DE EVENTOS =====================
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Coins className="text-amber-500 w-7 h-7" /> Aportes por Evento
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Partidos, torneos, canchas y más. <strong>No afecta las mensualidades.</strong>
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-100 transition-all"
        >
          <Plus className="w-4 h-4" /> Crear Evento
        </button>
      </div>

      {/* Banner informativo */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-800 mb-6">
        <Flame className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-black uppercase tracking-wide">Flujo de caja separado</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Los aportes aquí registrados <strong>NO modifican el estado de mensualidades</strong> de los jugadores y <strong>NO aparecen en el flujo de Cobranza</strong>.
          </p>
        </div>
      </div>

      {/* Grid de eventos */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-amber-500" /></div>
      ) : eventos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-20 text-center">
          <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-bold text-lg">No hay eventos creados</p>
          <p className="text-slate-400 text-sm mt-1">Crea tu primer evento para registrar aportes de canchas, arbitraje o torneos</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-6 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg shadow-amber-100 transition-all"
          >
            + Crear Primer Evento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {eventos.map(ev => {
            const pct = (ev.total_alumnos || 0) > 0
              ? Math.round(((ev.total_pagaron || 0) / ev.total_alumnos!) * 100) : 0;
            return (
              <div key={ev.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-200 transition-all group">
                <button
                  onClick={() => abrirEvento(ev)}
                  className="w-full p-5 text-left"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TIPO_COLORS[ev.tipo] || TIPO_COLORS['Otro']}`}>
                      {ev.tipo}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-800 text-lg leading-tight group-hover:text-amber-600 transition-colors mb-1">
                    {ev.nombre}
                  </h3>
                  {ev.descripcion && (
                    <p className="text-xs text-slate-400 mb-3 truncate">{ev.descripcion}</p>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-center mt-3 pt-3 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Recaudado</p>
                      <p className="text-sm font-black text-emerald-600">${(ev.total_pagado || 0).toLocaleString('es-CO')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Pagaron</p>
                      <p className="text-sm font-black text-indigo-600">{ev.total_pagaron || 0}/{ev.total_alumnos || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Por alumno</p>
                      <p className="text-sm font-black text-slate-700">${(ev.monto_sugerido || 0).toLocaleString('es-CO')}</p>
                    </div>
                  </div>
                  {(ev.total_alumnos || 0) > 0 && (
                    <div className="mt-3">
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 text-right">{pct}% cobrado</p>
                    </div>
                  )}
                </button>
                <div className="px-5 pb-4 flex justify-end">
                  <button
                    onClick={() => eliminarEvento(ev.id)}
                    className="text-[11px] font-bold text-slate-300 hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear Evento */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-amber-500 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Nuevo Evento</h3>
                <p className="text-xs opacity-80 mt-0.5">Partido, torneo, cancha o cualquier actividad</p>
              </div>
              <button onClick={() => setShowModal(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCrearEvento} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre del Evento *</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej. Partido vs Estrella FC"
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  >
                    {TIPOS_EVENTO.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={form.fecha}
                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto sugerido por alumno ($)</label>
                <input
                  type="number"
                  min="0"
                  value={form.monto_sugerido}
                  onChange={e => setForm(f => ({ ...f, monto_sugerido: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dirigido a (Categorías)</label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.categorias_seleccionadas.length === 0}
                      onChange={() => setForm(f => ({ ...f, categorias_seleccionadas: [] }))}
                      className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                    />
                    Todas las categorías
                  </label>
                  {categorias.map(cat => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600">
                      <input
                        type="checkbox"
                        checked={form.categorias_seleccionadas.includes(cat)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setForm(f => ({
                            ...f,
                            categorias_seleccionadas: isChecked
                              ? [...f.categorias_seleccionadas, cat]
                              : f.categorias_seleccionadas.filter(c => c !== cat)
                          }));
                        }}
                        className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                      />
                      {cat}
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Si seleccionas "Todas", se aplicará a todos los alumnos del club.</p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Descripción (opcional)</label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Cancha en Club X, árbitro incluido, concentración..."
                  rows={2}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-black disabled:opacity-50 shadow-lg shadow-amber-100"
                >
                  {saving ? 'Creando...' : 'Crear Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
