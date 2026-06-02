'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  ClipboardCheck, ChevronRight, Save, Loader2,
  ArrowLeft, Search, Plus, Users, Star,
  History, TrendingUp, CheckCircle2, XCircle,
  Clock, AlertCircle, Zap, Trophy, BarChart3,
  CalendarDays, UserCheck, Activity, X
} from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '@/lib/hooks/useTenant';
import { syncCategoriasInteligentes } from '@/lib/syncCategorias';

type Vista = 'categorias' | 'asistencia' | 'historial';

// Componente de Estrellas / Nota 1-10
function SelectorNota({ valor, onChange }: { valor: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5,6,7,8,9,10].map(n => (
        <button
          key={n}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="w-5 h-5 flex items-center justify-center transition-transform hover:scale-125 focus:outline-none"
          title={`Nota ${n}`}
        >
          <div className={`w-3 h-3 rounded-sm rotate-45 transition-colors ${
            n <= (hover || valor)
              ? n <= 4 ? 'bg-rose-400'
              : n <= 7 ? 'bg-amber-400'
              : 'bg-emerald-400'
              : 'bg-slate-200 dark:bg-slate-700'
          }`} />
        </button>
      ))}
      {valor > 0 && (
        <span className={`ml-2 text-xs font-black ${
          valor <= 4 ? 'text-rose-500' : valor <= 7 ? 'text-amber-500' : 'text-emerald-500'
        }`}>{valor}</span>
      )}
    </div>
  );
}

// Badge de porcentaje de asistencia histórica
function BadgeAsistencia({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-[9px] font-bold text-slate-300">Sin datos</span>;
  const color = pct >= 75 ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
              : pct >= 50 ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10'
              : 'text-rose-500 bg-rose-50 dark:bg-rose-500/10';
  return (
    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${color}`}>
      {pct}% asist.
    </span>
  );
}

export default function AsistenciaEntrenador() {
  const router = useRouter();
  const { slug: tenantSlug } = useTenant();

  // Estado general
  const [vista, setVista] = useState<Vista>('categorias');
  const [perfil, setPerfil] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Categorías
  const [categorias, setCategorias] = useState<any[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<any>(null);

  // Jugadores y asistencia
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [asistencia, setAsistencia] = useState<Record<string, string>>({});
  const [notas, setNotas] = useState<Record<string, number>>({});          // nota 1-10 por sesión
  const [historialPct, setHistorialPct] = useState<Record<string, number | null>>({}); // % asistencia
  const [busqueda, setBusqueda] = useState('');

  // Sesión activa
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [fechaSesion, setFechaSesion] = useState('');

  // Resumen post-sesión
  const [resumen, setResumen] = useState<any>(null);

  // Historial de sesiones
  const [historialSesiones, setHistorialSesiones] = useState<any[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [sesionDetalle, setSesionDetalle] = useState<any>(null);

  // ── INICIALIZACIÓN ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function inicializar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: usuario } = await supabase.from('perfiles').select('*').eq('id', session.user.id).single();
      if (usuario) {
        setPerfil(usuario);
        
        // Sincronización transparente de edades y categorías en segundo plano
        if (usuario.club_id) {
          syncCategoriasInteligentes(usuario.club_id).catch(console.error);
        }

        try {
          const res = await fetch(`/api/categorias?slug=${tenantSlug}&entrenador_id=${usuario.id}`);
          const cats = await res.json();
          if (Array.isArray(cats)) setCategorias(cats);
        } catch (err) {
          toast.error('Error al cargar categorías');
        }
      }
      setCargando(false);
    }
    inicializar();
  }, [tenantSlug]);

  // ── SELECCIONAR CATEGORÍA → crear sesión automáticamente ───────────────────
  const seleccionarCategoria = async (cat: any) => {
    setCargando(true);
    setCategoriaSeleccionada(cat);

    const hoy = new Date().toISOString().split('T')[0];
    const horaActual = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
    setFechaSesion(hoy);

    // Crear sesión del día automáticamente
    const nuevaSesion = {
      titulo: `Entrenamiento ${cat.nombre} — ${hoy}`,
      tipo: 'Entrenamiento',
      fecha: hoy,
      hora: horaActual,
      categoria_id: cat.nombre,
      club_id: perfil?.club_id,
    };

    let eventoId: string | null = null;
    try {
      const { data: ev } = await supabase.from('eventos').insert([nuevaSesion]).select().single();
      if (ev) eventoId = ev.id;
    } catch (_) { /* evento_id opcional */ }

    setSesionId(eventoId);

    // Cargar alumnos activos de la categoría
    // Usamos .like para poder atrapar aquellos que tienen el sufijo |MANUAL (ej. Alpha|MANUAL)
    const { data: jugs } = await supabase
      .from('perfiles')
      .select('id, nombres, apellidos, grupos, foto_url, tipo_plan')
      .eq('rol', 'Futbolista')
      .eq('club_id', perfil.club_id)
      .like('grupos', `${cat.nombre}%`)
      .neq('estado_miembro', 'Inactivo');

    if (jugs) {
      setAlumnos(jugs);

      // Estado inicial: todos "Presente"
      const inicial: Record<string, string> = {};
      const notasInic: Record<string, number> = {};
      jugs.forEach(j => { inicial[j.id] = 'Presente'; notasInic[j.id] = 0; });
      setAsistencia(inicial);
      setNotas(notasInic);

      // Calcular % asistencia histórica (últimos 30 días)
      const hace30 = new Date();
      hace30.setDate(hace30.getDate() - 30);
      const desde = hace30.toISOString().split('T')[0];

      const { data: histData } = await supabase
        .from('asistencias')
        .select('jugador_id, estado')
        .in('jugador_id', jugs.map(j => j.id))
        .eq('club_id', perfil.club_id)
        .gte('fecha', desde);

      const pcts: Record<string, number | null> = {};
      jugs.forEach(j => {
        const registros = (histData || []).filter(r => r.jugador_id === j.id);
        if (registros.length === 0) { pcts[j.id] = null; return; }
        const presentes = registros.filter(r => r.estado === 'Presente').length;
        pcts[j.id] = Math.round((presentes / registros.length) * 100);
      });
      setHistorialPct(pcts);
    }

    setCargando(false);
    setVista('asistencia');
  };

  // ── MARCAR ESTADO DE ASISTENCIA ────────────────────────────────────────────
  const marcarEstado = (id: string, estado: string) => {
    setAsistencia(prev => ({ ...prev, [id]: estado }));
    // Si se marca como Ausente o Excusa, resetear nota
    if (estado !== 'Presente') setNotas(prev => ({ ...prev, [id]: 0 }));
  };

  // ── GUARDAR ASISTENCIA ─────────────────────────────────────────────────────
  const guardarAsistencia = async () => {
    setGuardando(true);
    const toastId = toast.loading('Guardando sesión...');

    const registros = alumnos.map(a => ({
      jugador_id: a.id,
      grupo: categoriaSeleccionada.nombre,
      estado: asistencia[a.id] || 'Ausente',
      nota_rendimiento: asistencia[a.id] === 'Presente' && notas[a.id] > 0 ? notas[a.id] : null,
      fecha: fechaSesion,
      evento_id: sesionId,
      registrado_por: `${perfil.nombres} ${perfil.apellidos}`,
      club_id: perfil?.club_id,
    }));

    // Intentar con todos los campos
    let { error } = await supabase.from('asistencias').insert(registros);

    // Fallback sin nota_rendimiento ni evento_id si la columna no existe
    if (error && (error.message.includes('nota_rendimiento') || error.message.includes('column'))) {
      const registrosBase = registros.map(({ nota_rendimiento, evento_id, ...r }) => r);
      const res2 = await supabase.from('asistencias').insert(registrosBase);
      error = res2.error;
    }

    if (error && error.message.includes('evento_id')) {
      const registrosSinEvento = registros.map(({ evento_id, nota_rendimiento, ...r }) => r);
      const res3 = await supabase.from('asistencias').insert(registrosSinEvento);
      error = res3.error;
    }

    if (error) {
      toast.error(`Error: ${error.message}`, { id: toastId });
      setGuardando(false);
      return;
    }

    toast.success('¡Sesión guardada!', { id: toastId });

    // Calcular resumen
    const presentes = Object.values(asistencia).filter(e => e === 'Presente').length;
    const ausentes = Object.values(asistencia).filter(e => e === 'Ausente').length;
    const excusas = Object.values(asistencia).filter(e => e === 'Excusa').length;
    const notasValidas = alumnos
      .filter(a => asistencia[a.id] === 'Presente' && notas[a.id] > 0)
      .map(a => notas[a.id]);
    const notaPromedio = notasValidas.length > 0
      ? (notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length).toFixed(1)
      : null;

    setResumen({
      categoria: categoriaSeleccionada.nombre,
      fecha: fechaSesion,
      total: alumnos.length,
      presentes, ausentes, excusas,
      pctAsistencia: Math.round((presentes / alumnos.length) * 100),
      notaPromedio,
      calificados: notasValidas.length,
    });

    setGuardando(false);
  };

  // ── HISTORIAL DE SESIONES ──────────────────────────────────────────────────
  const cargarHistorial = async (cat?: any) => {
    if (!perfil) return;
    setCargandoHistorial(true);
    const grupoBuscar = cat?.nombre || categoriaSeleccionada?.nombre;

    // Obtener fechas únicas de sesiones para este grupo
    const { data } = await supabase
      .from('asistencias')
      .select('fecha, estado, jugador_id, nota_rendimiento, grupo')
      .eq('club_id', perfil.club_id)
      .like('grupo', `${grupoBuscar}%`)
      .order('fecha', { ascending: false });

    if (!data) { setHistorialSesiones([]); setCargandoHistorial(false); return; }

    // Agrupar por fecha
    const fechas = [...new Set(data.map(r => r.fecha))].slice(0, 15);
    const sesiones = fechas.map(fecha => {
      const registrosDia = data.filter(r => r.fecha === fecha);
      const presentes = registrosDia.filter(r => r.estado === 'Presente').length;
      const total = registrosDia.length;
      const notasArr = registrosDia
        .filter(r => r.nota_rendimiento && r.nota_rendimiento > 0)
        .map(r => Number(r.nota_rendimiento));
      const notaProm = notasArr.length > 0
        ? (notasArr.reduce((a, b) => a + b, 0) / notasArr.length).toFixed(1)
        : null;
      return { fecha, presentes, total, pct: Math.round((presentes / total) * 100), notaProm, registros: registrosDia };
    });

    setHistorialSesiones(sesiones);
    setCargandoHistorial(false);
  };

  const verHistorial = async (cat: any) => {
    setCategoriaSeleccionada(cat);
    setVista('historial');
    await cargarHistorial(cat);
  };

  // ── FILTRO DE BÚSQUEDA ─────────────────────────────────────────────────────
  const filtrados = useMemo(() =>
    alumnos.filter(a => `${a.nombres} ${a.apellidos}`.toLowerCase().includes(busqueda.toLowerCase())),
    [alumnos, busqueda]
  );

  const presentes = useMemo(() => Object.values(asistencia).filter(e => e === 'Presente').length, [asistencia]);
  const ausentes = useMemo(() => Object.values(asistencia).filter(e => e === 'Ausente').length, [asistencia]);
  const excusas = useMemo(() => Object.values(asistencia).filter(e => e === 'Excusa').length, [asistencia]);

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (cargando && vista === 'categorias') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-brand" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Cargando panel...</p>
        </div>
      </div>
    );
  }

  // ── MODAL RESUMEN POST-SESIÓN ──────────────────────────────────────────────
  if (resumen) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-500">
          
          {/* Icono de éxito */}
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">¡Sesión Guardada!</h2>
            <p className="text-slate-400 text-sm mt-1 font-medium">
              {resumen.categoria} · {resumen.fecha.split('-').reverse().join('/')}
            </p>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-4">
              <p className="text-2xl font-black text-emerald-600">{resumen.presentes}</p>
              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wider mt-1">Presentes</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-500/10 rounded-2xl p-4">
              <p className="text-2xl font-black text-rose-600">{resumen.ausentes}</p>
              <p className="text-[9px] font-black text-rose-500 uppercase tracking-wider mt-1">Ausentes</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4">
              <p className="text-2xl font-black text-amber-600">{resumen.excusas}</p>
              <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider mt-1">Excusas</p>
            </div>
          </div>

          {/* Barra de asistencia */}
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
              <span>Asistencia</span>
              <span className={`font-black ${resumen.pctAsistencia >= 75 ? 'text-emerald-500' : resumen.pctAsistencia >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                {resumen.pctAsistencia}%
              </span>
            </div>
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${resumen.pctAsistencia >= 75 ? 'bg-emerald-500' : resumen.pctAsistencia >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${resumen.pctAsistencia}%` }}
              />
            </div>
          </div>

          {/* Nota promedio */}
          {resumen.notaPromedio && (
            <div className="bg-brand/5 border border-brand/10 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-brand" />
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">Nota Promedio</span>
              </div>
              <span className="text-2xl font-black text-brand">{resumen.notaPromedio}<span className="text-sm text-slate-400">/10</span></span>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setResumen(null); setVista('categorias'); setCategoriaSeleccionada(null); setBusqueda(''); }}
              className="flex-1 bg-slate-900 dark:bg-brand text-white font-black py-4 rounded-2xl hover:scale-[1.02] transition-all uppercase text-xs tracking-widest"
            >
              Nueva Sesión
            </button>
            <button
              onClick={() => { setResumen(null); verHistorial(categoriaSeleccionada); }}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black py-4 rounded-2xl hover:scale-[1.02] transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"
            >
              <History className="w-4 h-4" /> Historial
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER PRINCIPAL ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans">

      {/* ── HEADER ── */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center gap-3">
          {vista !== 'categorias' && (
            <button
              onClick={() => { setVista('categorias'); setCategoriaSeleccionada(null); setBusqueda(''); setSesionDetalle(null); }}
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-brand transition-all shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter flex items-center gap-2">
              <ClipboardCheck className="w-7 h-7 text-brand" />
              {vista === 'categorias' && 'Control de Asistencia'}
              {vista === 'asistencia' && `Pasando Lista · ${categoriaSeleccionada?.nombre}`}
              {vista === 'historial' && `Historial · ${categoriaSeleccionada?.nombre}`}
            </h1>
            <p className="text-slate-400 text-xs font-bold mt-0.5">
              {vista === 'categorias' && 'Selecciona una categoría para comenzar'}
              {vista === 'asistencia' && `${new Date(fechaSesion + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}`}
              {vista === 'historial' && 'Últimas 15 sesiones registradas'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">

        {/* ══════════════════════════════════════════════════
            VISTA 1: SELECCIÓN DE CATEGORÍA
        ══════════════════════════════════════════════════ */}
        {vista === 'categorias' && (
          <div>
            {cargando ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
            ) : categorias.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 font-bold">No tienes categorías asignadas</p>
                <p className="text-slate-300 text-sm mt-1">Pide al director que te asigne categorías</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {categorias.map(cat => (
                  <div key={cat.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    
                    {/* Acción principal: pasar lista */}
                    <button
                      onClick={() => seleccionarCategoria(cat)}
                      className="w-full p-7 text-left"
                    >
                      <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center text-brand font-black text-2xl mb-4 shadow-inner border border-brand/5 group-hover:bg-brand group-hover:text-white transition-colors">
                        {cat.nombre.charAt(0)}
                      </div>
                      <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter">{cat.nombre}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{cat.nivel || 'Nivel Formativo'}</p>
                      {cat.horarios && (
                        <p className="text-xs text-slate-400 font-medium mt-3 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {cat.horarios}
                        </p>
                      )}
                    </button>

                    {/* Botón de historial */}
                    <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 flex items-center justify-between">
                      <button
                        onClick={() => verHistorial(cat)}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-brand transition-colors"
                      >
                        <History className="w-3.5 h-3.5" /> Ver historial
                      </button>
                      <button
                        onClick={() => seleccionarCategoria(cat)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-brand/90 transition-colors"
                      >
                        <Zap className="w-3 h-3" /> Pasar Lista
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            VISTA 2: LISTADO DE ASISTENCIA
        ══════════════════════════════════════════════════ */}
        {vista === 'asistencia' && (
          <div className="space-y-4">

            {/* Mini-métricas en tiempo real */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{presentes}</p>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wider">Presentes</p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{ausentes}</p>
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-wider">Ausentes</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{excusas}</p>
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider">Excusas</p>
              </div>
            </div>

            {/* Barra de progreso de asistencia */}
            {alumnos.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>Asistencia en tiempo real</span>
                  <span className="font-black text-slate-800 dark:text-white">{Math.round((presentes / alumnos.length) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(presentes / alumnos.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Lista de jugadores */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
              
              {/* Header de lista */}
              <div className="p-5 md:p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar jugador..."
                      value={busqueda}
                      onChange={e => setBusqueda(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 whitespace-nowrap">
                    <Users className="w-3.5 h-3.5" /> {filtrados.length} jugadores
                  </div>
                </div>
              </div>

              {/* Filas de jugadores */}
              {cargando ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
              ) : filtrados.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-bold italic">No se encontraron jugadores</div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filtrados.map((alumno) => {
                    const estado = asistencia[alumno.id] || 'Presente';
                    const nota = notas[alumno.id] || 0;
                    const pct = historialPct[alumno.id];
                    return (
                      <div key={alumno.id} className={`p-4 md:p-5 transition-colors ${
                        estado === 'Presente' ? 'bg-white dark:bg-slate-900'
                        : estado === 'Ausente' ? 'bg-rose-50/50 dark:bg-rose-500/5'
                        : 'bg-amber-50/50 dark:bg-amber-500/5'
                      }`}>
                        
                        {/* Fila principal */}
                        <div className="flex items-center gap-3 mb-3">
                          {/* Avatar */}
                          <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border-2 transition-colors ${
                            estado === 'Presente' ? 'border-emerald-300 dark:border-emerald-500/50'
                            : estado === 'Ausente' ? 'border-rose-300 dark:border-rose-500/50'
                            : 'border-amber-300 dark:border-amber-500/50'
                          }`}>
                            {alumno.foto_url ? (
                              <img src={alumno.foto_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-black text-slate-400 text-base uppercase">{alumno.nombres.charAt(0)}</span>
                            )}
                          </div>

                          {/* Nombre + badge */}
                          <div className="flex-1 min-w-0">
                            <p className={`font-black uppercase italic text-sm truncate ${
                              estado === 'Presente' ? 'text-slate-800 dark:text-white'
                              : estado === 'Ausente' ? 'text-rose-400'
                              : 'text-amber-500'
                            }`}>
                              {alumno.nombres} {alumno.apellidos}
                            </p>
                            <BadgeAsistencia pct={pct} />
                          </div>

                          {/* Botones de asistencia */}
                          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                            <button
                              onClick={() => marcarEstado(alumno.id, 'Presente')}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                estado === 'Presente'
                                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                  : 'text-slate-400 hover:text-emerald-500'
                              }`}
                            >✓</button>
                            <button
                              onClick={() => marcarEstado(alumno.id, 'Ausente')}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                estado === 'Ausente'
                                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                                  : 'text-slate-400 hover:text-rose-500'
                              }`}
                            >✗</button>
                            <button
                              onClick={() => marcarEstado(alumno.id, 'Excusa')}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                estado === 'Excusa'
                                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                                  : 'text-slate-400 hover:text-amber-500'
                              }`}
                            >E</button>
                          </div>
                        </div>

                        {/* Nota de rendimiento — solo si está Presente */}
                        {estado === 'Presente' && (
                          <div className="flex items-center gap-3 pl-14">
                            <Star className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                            <SelectorNota
                              valor={nota}
                              onChange={n => setNotas(prev => ({ ...prev, [alumno.id]: n }))}
                            />
                            {nota === 0 && (
                              <span className="text-[9px] text-slate-300 font-bold italic">Califica el desempeño</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer de la lista */}
              <div className="p-5 md:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <button
                  onClick={guardarAsistencia}
                  disabled={guardando || alumnos.length === 0}
                  className="w-full bg-slate-900 dark:bg-brand text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {guardando ? 'Guardando sesión...' : `Finalizar y guardar sesión (${presentes}/${alumnos.length})`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            VISTA 3: HISTORIAL DE SESIONES
        ══════════════════════════════════════════════════ */}
        {vista === 'historial' && (
          <div className="space-y-4">
            {cargandoHistorial ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
            ) : historialSesiones.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 font-bold">No hay sesiones registradas aún</p>
                <p className="text-slate-300 text-sm mt-1">Las sesiones aparecerán aquí después de guardar la primera asistencia</p>
              </div>
            ) : (
              <>
                {/* Resumen general */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{historialSesiones.length}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1">Sesiones</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-emerald-500">
                      {Math.round(historialSesiones.reduce((a, s) => a + s.pct, 0) / historialSesiones.length)}%
                    </p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1">Asist. Media</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-brand">
                      {(() => {
                        const ns = historialSesiones.filter(s => s.notaProm).map(s => parseFloat(s.notaProm));
                        return ns.length > 0 ? (ns.reduce((a, b) => a + b, 0) / ns.length).toFixed(1) : '—';
                      })()}
                    </p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1">Nota Media</p>
                  </div>
                </div>

                {/* Lista de sesiones */}
                <div className="space-y-3">
                  {historialSesiones.map((sesion, idx) => (
                    <div key={idx}>
                      <button
                        onClick={() => setSesionDetalle(sesionDetalle?.fecha === sesion.fecha ? null : sesion)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 text-left hover:border-brand/30 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-4">
                          {/* Icono */}
                          <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center ${
                            sesion.pct >= 75 ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600'
                            : sesion.pct >= 50 ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600'
                            : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600'
                          }`}>
                            <ClipboardCheck className="w-6 h-6" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-800 dark:text-white text-sm">
                              {new Date(sesion.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                              })}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`text-[10px] font-black ${
                                sesion.pct >= 75 ? 'text-emerald-500' : sesion.pct >= 50 ? 'text-amber-500' : 'text-rose-500'
                              }`}>
                                {sesion.presentes}/{sesion.total} presentes ({sesion.pct}%)
                              </span>
                              {sesion.notaProm && (
                                <span className="flex items-center gap-1 text-[10px] font-black text-brand">
                                  <Star className="w-3 h-3" /> Nota: {sesion.notaProm}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Barra */}
                          <div className="hidden md:flex items-center gap-3 w-32">
                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${sesion.pct >= 75 ? 'bg-emerald-500' : sesion.pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${sesion.pct}%` }}
                              />
                            </div>
                          </div>

                          <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${sesionDetalle?.fecha === sesion.fecha ? 'rotate-90' : ''}`} />
                        </div>
                      </button>

                      {/* Detalle expandible */}
                      {sesionDetalle?.fecha === sesion.fecha && (
                        <div className="mt-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Detalle de Asistencia</p>
                          {sesion.registros.map((r: any, ri: number) => (
                            <div key={ri} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                {/* Aquí no tenemos el nombre, solo jugador_id */}
                                Jugador #{ri + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                {r.nota_rendimiento && (
                                  <span className="text-[10px] font-black text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                                    ⭐ {r.nota_rendimiento}
                                  </span>
                                )}
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  r.estado === 'Presente' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                                  : r.estado === 'Ausente' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                                  : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                                }`}>
                                  {r.estado}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Botón: nueva sesión */}
            <button
              onClick={() => seleccionarCategoria(categoriaSeleccionada)}
              className="w-full bg-slate-900 dark:bg-brand text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-xl mt-4"
            >
              <Zap className="w-4 h-4" /> Pasar Lista Ahora
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
