'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, RefreshCw, Plus, ClipboardList, Users, Shield, TrendingUp, 
  Search, Inbox, Eye, Edit, ClipboardCheck, X, Trash2, Clock, CalendarDays, 
  Target, GraduationCap
} from 'lucide-react';
import { toast } from 'sonner';

export default function GestionCategorias() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<any[]>([]);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [entrenadoresBD, setEntrenadoresBD] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  const [busqueda, setBusqueda] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('Todos');

  // Modal y Edición
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [grupoEditandoId, setGrupoEditandoId] = useState<string | null>(null);
  
  const estadoInicialFormulario = { nombre: '', deporte: 'Fútbol', descripcion: '', nivel: 'Principiante', edad_minima: 5, edad_maxima: 18, capacidad_maxima: 20, estado: 'Activo' };
  const [formData, setFormData] = useState<any>(estadoInicialFormulario);
  const [entrenadoresSeleccionados, setEntrenadoresSeleccionados] = useState<string[]>([]);
  const [horariosDinámicos, setHorariosDinámicos] = useState([{ dia: 'Lunes', inicio: '18:00', fin: '19:30' }]);

  const cargarDatos = async () => {
    setCargando(true);
    const { data: catData, error: catError } = await supabase.from('categorias').select('*').order('created_at', { ascending: true });
    
    if (catError) {
      toast.error('Error al cargar categorías: ' + catError.message);
    } else if (catData) setCategorias(catData);

    const { data: jugData } = await supabase.from('perfiles').select('grupos, estado_miembro').eq('rol', 'Futbolista');
    if (jugData) setJugadores(jugData);

    const { data: entData } = await supabase.from('perfiles').select('id, nombres, apellidos').or('rol.eq.Entrenador,rol.eq.Director');
    if (entData) setEntrenadoresBD(entData);

    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // --- ABRIR MODAL PARA EDITAR ---
  const abrirEditarGrupo = (grupo: any) => {
    setFormData({
      nombre: grupo.nombre || '', deporte: grupo.deporte || 'Fútbol', descripcion: grupo.descripcion || '',
      nivel: grupo.nivel || 'Principiante', edad_minima: grupo.edad_minima || 5, edad_maxima: grupo.edad_maxima || 18,
      capacidad_maxima: grupo.capacidad_maxima || 20, estado: grupo.estado || 'Activo'
    });

    setEntrenadoresSeleccionados(grupo.entrenadores ? grupo.entrenadores.split(', ') : []);

    if (grupo.horarios) {
      const horariosParseados = grupo.horarios.split(' | ').map((h: string) => {
        const [dia, horas] = h.split(' ');
        const [inicio, fin] = horas ? horas.split('-') : ['18:00', '19:30'];
        return { dia: dia || 'Lunes', inicio: inicio || '18:00', fin: fin || '19:30' };
      });
      setHorariosDinámicos(horariosParseados);
    } else {
      setHorariosDinámicos([{ dia: 'Lunes', inicio: '18:00', fin: '19:30' }]);
    }

    setGrupoEditandoId(grupo.id);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setGrupoEditandoId(null);
    setFormData(estadoInicialFormulario);
    setEntrenadoresSeleccionados([]);
    setHorariosDinámicos([{ dia: 'Lunes', inicio: '18:00', fin: '19:30' }]);
  };

  // --- MANEJADORES DEL FORMULARIO ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const toggleEntrenador = (nombreCompleto: string) => {
    setEntrenadoresSeleccionados(prev => prev.includes(nombreCompleto) ? prev.filter(e => e !== nombreCompleto) : [...prev, nombreCompleto]);
  };

  const actualizarHorario = (index: number, campo: string, valor: string) => {
    const nuevosHorarios = [...horariosDinámicos];
    nuevosHorarios[index] = { ...nuevosHorarios[index], [campo]: valor };
    setHorariosDinámicos(nuevosHorarios);
  };

  // --- GUARDAR (NUEVO O EDICIÓN) ---
  const handleGuardarGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    const toastId = toast.loading(grupoEditandoId ? "Actualizando categoría..." : "Creando categoría...");
    
    const entrenadoresString = entrenadoresSeleccionados.join(', ');
    const horariosString = horariosDinámicos.map(h => `${h.dia} ${h.inicio}-${h.fin}`).join(' | ');

    const datosFinales = { ...formData, entrenadores: entrenadoresString, horarios: horariosString };

    if (grupoEditandoId) {
      const { error } = await supabase.from('categorias').update(datosFinales).eq('id', grupoEditandoId);
      if (error) {
        toast.error("Error al actualizar: " + error.message, { id: toastId });
      } else { 
        toast.success("Categoría actualizada correctamente.", { id: toastId });
        cerrarModal(); 
        cargarDatos(); 
      }
    } else {
      const { error } = await supabase.from('categorias').insert([datosFinales]);
      if (error) {
        toast.error("Error al crear grupo: " + error.message, { id: toastId });
      } else { 
        toast.success("Nueva categoría creada exitosamente.", { id: toastId });
        cerrarModal(); 
        cargarDatos(); 
      }
    }
    setGuardando(false);
  };

  // --- CÁLCULOS ---
  let miembrosTotales = 0;
  const categoriasConMetricas = categorias.map(cat => {
    const alumnosEnEsteGrupo = jugadores.filter(j => j.grupos === cat.nombre && j.estado_miembro !== 'Pendiente' && j.estado_miembro !== 'Inactivo').length;
    miembrosTotales += alumnosEnEsteGrupo;
    const porcentaje = cat.capacidad_maxima > 0 ? Math.round((alumnosEnEsteGrupo / cat.capacidad_maxima) * 100) : 0;
    return { ...cat, inscritos: alumnosEnEsteGrupo, porcentaje };
  });

  const capacidadTotal = categorias.reduce((sum, cat) => sum + (cat.capacidad_maxima || 0), 0);
  const ocupacionPromedio = capacidadTotal > 0 ? Math.round((miembrosTotales / capacidadTotal) * 100) : 0;
  const gruposActivos = categorias.filter(c => c.estado === 'Activo').length;

  const categoriasFiltradas = categoriasConMetricas.filter(c => {
    const coincideBusqueda = c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (c.entrenadores && c.entrenadores.toLowerCase().includes(busqueda.toLowerCase()));
    const coincideNivel = filtroNivel === 'Todos' || c.nivel === filtroNivel;
    return coincideBusqueda && coincideNivel;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800 relative">
      
      {/* CABECERA Y KPIs */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="text-slate-500 hover:text-orange-600 font-bold text-sm mb-2 transition-colors flex items-center gap-1 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver
          </button>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Target className="w-6 h-6 text-orange-500" /> Grupos Deportivos
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona la estructura de entrenamiento de tu club</p>
        </div>
        <div className="flex gap-3">
          <button onClick={cargarDatos} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button onClick={() => { cerrarModal(); setMostrarModal(true); }} className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Crear Grupo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-between"><div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Grupos Activos</p><p className="text-3xl font-black text-slate-800">{cargando ? '-' : gruposActivos}</p></div><ClipboardList className="text-blue-500 w-8 h-8 opacity-80" /></div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-between"><div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Miembros Totales</p><p className="text-3xl font-black text-slate-800">{cargando ? '-' : miembrosTotales}</p></div><Users className="text-emerald-500 w-8 h-8 opacity-80" /></div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-between"><div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Capacidad Total</p><p className="text-3xl font-black text-slate-800">{cargando ? '-' : capacidadTotal}</p></div><Shield className="text-purple-500 w-8 h-8 opacity-80" /></div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-between relative overflow-hidden"><div className="absolute right-0 top-0 w-1.5 h-full bg-orange-500"></div><div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ocupación Media</p><p className="text-3xl font-black text-orange-600">{cargando ? '-' : `${ocupacionPromedio}%`}</p></div><TrendingUp className="text-orange-500 w-8 h-8 opacity-80" /></div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input type="text" placeholder="Buscar por grupo o cuerpo técnico..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-orange-500" />
        </div>
        <div className="md:w-48">
          <select value={filtroNivel} onChange={(e) => setFiltroNivel(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white font-medium text-slate-700 focus:ring-2 focus:ring-orange-500 cursor-pointer">
            <option value="Todos">Todos los niveles</option>
            <option value="Principiante">Principiante</option>
            <option value="Intermedio">Intermedio</option>
            <option value="Avanzado">Avanzado</option>
          </select>
        </div>
      </div>

      {/* TARJETAS */}
      {cargando ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden animate-pulse">
              <div className="p-6 flex-1">
                <div className="flex gap-2 mb-4">
                  <div className="h-6 w-16 bg-slate-200 rounded"></div>
                  <div className="h-6 w-16 bg-slate-200 rounded"></div>
                  <div className="h-6 w-20 bg-slate-200 rounded"></div>
                </div>
                <div className="h-6 w-32 bg-slate-200 rounded mb-6"></div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3"><div className="w-4 h-4 bg-slate-200 rounded-full"></div><div className="h-4 w-40 bg-slate-200 rounded"></div></div>
                  <div className="flex items-center gap-3"><div className="w-4 h-4 bg-slate-200 rounded-full"></div><div className="h-4 w-28 bg-slate-200 rounded"></div></div>
                  <div className="flex items-center gap-3"><div className="w-4 h-4 bg-slate-200 rounded-full"></div><div className="h-4 w-36 bg-slate-200 rounded"></div></div>
                </div>
                <div className="mt-8">
                  <div className="h-3 w-20 bg-slate-200 rounded mb-3"></div>
                  <div className="h-2 w-full bg-slate-200 rounded-full"></div>
                </div>
              </div>
              <div className="grid grid-cols-3 border-t border-slate-100 bg-slate-50 p-2">
                <div className="h-8 bg-slate-200 rounded mx-2"></div>
                <div className="h-8 bg-slate-200 rounded mx-2"></div>
                <div className="h-8 bg-slate-200 rounded mx-2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : categoriasFiltradas.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
          <Inbox className="w-16 h-16 text-slate-300 mb-4" />
          <p className="text-lg text-slate-800 font-bold mb-2">No tienes grupos configurados</p>
          <p className="text-sm text-slate-500 max-w-md mx-auto">Crea tu primer grupo deportivo para comenzar a gestionar la estructura, entrenamientos y capacidades de tu club.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {categoriasFiltradas.map((grupo) => (
            <div key={grupo.id} className={`bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md ${grupo.estado === 'Inactivo' ? 'opacity-70 grayscale hover:grayscale-0' : ''}`}>
              <div className="p-6 flex-1">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${grupo.estado === 'Activo' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-100 border-slate-200'}`}>{grupo.estado}</span>
                  <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 flex items-center gap-1"><Target className="w-3 h-3" /> {grupo.deporte}</span>
                  <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200">{grupo.nivel}</span>
                </div>
                <h2 className="text-xl font-black text-slate-800 mb-1 tracking-tight">{grupo.nombre}</h2>
                
                <div className="space-y-3 mt-5">
                  <div className="flex items-start gap-3 text-sm"><Users className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /><span className="text-slate-700 font-medium leading-tight">{grupo.entrenadores || 'Sin cuerpo técnico asignado'}</span></div>
                  <div className="flex items-center gap-3 text-sm"><GraduationCap className="w-4 h-4 text-slate-400 shrink-0" /><span className="text-slate-600 font-medium">{grupo.edad_minima} - {grupo.edad_maxima} años</span></div>
                  <div className="flex items-start gap-3 text-sm"><CalendarDays className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /><span className="text-slate-600 font-medium leading-tight whitespace-pre-wrap">{grupo.horarios?.replace(/ \| /g, '\n') || 'Horario no definido'}</span></div>
                </div>

                <div className="mt-8">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ocupación</p>
                    <p className="text-xs font-bold text-slate-700">{grupo.inscritos}/{grupo.capacidad_maxima} ocupados</p>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50"><div className={`h-2 rounded-full transition-all duration-1000 ${grupo.porcentaje >= 100 ? 'bg-red-500' : grupo.porcentaje > 80 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} style={{ width: `${Math.min(grupo.porcentaje, 100)}%` }}></div></div>
                </div>
              </div>

              {/* BOTONES FUNCIONALES */}
              <div className="grid grid-cols-3 border-t border-slate-100 bg-slate-50/50">
                <button onClick={() => router.push(`/director/categorias/${grupo.id}`)} className="py-3.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors border-r border-slate-100 flex items-center justify-center gap-1.5 focus:outline-none">
                  <Eye className="w-4 h-4" /> Ver Ficha
                </button>
                <button onClick={() => abrirEditarGrupo(grupo)} className="py-3.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-orange-600 transition-colors border-r border-slate-100 flex items-center justify-center gap-1.5 focus:outline-none">
                  <Edit className="w-4 h-4" /> Editar
                </button>
                <button onClick={() => router.push('/director/asistencia')} className="py-3.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-colors flex items-center justify-center gap-1.5 focus:outline-none">
                  <ClipboardCheck className="w-4 h-4" /> Asistencia
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL (CREAR Y EDITAR) */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {grupoEditandoId ? <Edit className="w-5 h-5 text-orange-500" /> : <Plus className="w-5 h-5 text-orange-500" />} 
                {grupoEditandoId ? 'Editar Grupo' : 'Nuevo Grupo'}
              </h2>
              <button onClick={cerrarModal} className="text-slate-400 hover:text-slate-600 font-bold p-1 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <form id="grupoForm" onSubmit={handleGuardarGrupo} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Grupo *</label><input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" placeholder="Ej: Élite Sub-15" /></div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Deporte *</label>
                    <select name="deporte" value={formData.deporte} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none text-sm bg-white cursor-pointer"><option value="Fútbol">Fútbol</option><option value="Futsal">Futsal</option></select>
                  </div>
                  <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">Descripción</label><textarea name="descripcion" value={formData.descripcion} onChange={handleChange} rows={2} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" placeholder="Detalles u objetivos de este grupo..."></textarea></div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-2">Cuerpo Técnico (Entrenadores) *</label>
                  <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                    {entrenadoresBD.length === 0 ? <p className="p-3 text-sm text-slate-500 font-medium">No hay entrenadores creados.</p> : entrenadoresBD.map(ent => {
                      const nombreCompleto = `${ent.nombres} ${ent.apellidos}`;
                      const seleccionado = entrenadoresSeleccionados.includes(nombreCompleto);
                      return (
                        <label key={ent.id} className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${seleccionado ? 'bg-orange-50/50' : 'hover:bg-slate-50'}`}>
                          <input type="checkbox" checked={seleccionado} onChange={() => toggleEntrenador(nombreCompleto)} className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500" />
                          <span className={`text-sm font-medium ${seleccionado ? 'text-slate-800' : 'text-slate-600'}`}>{nombreCompleto}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nivel Competitivo *</label>
                    <select name="nivel" value={formData.nivel} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none text-sm bg-white cursor-pointer"><option value="Principiante">Principiante</option><option value="Intermedio">Intermedio</option><option value="Avanzado">Avanzado</option></select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Estado Operativo</label>
                    <select name="estado" value={formData.estado} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none text-sm bg-white font-bold cursor-pointer"><option value="Activo" className="text-emerald-600">Activo</option><option value="Inactivo" className="text-slate-500">Inactivo</option></select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">Edad Mín.</label><input type="number" name="edad_minima" value={formData.edad_minima} onChange={handleChange} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-center" /></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">Edad Máx.</label><input type="number" name="edad_maxima" value={formData.edad_maxima} onChange={handleChange} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-center" /></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1">Cupo Máx.</label><input type="number" name="capacidad_maxima" value={formData.capacidad_maxima} onChange={handleChange} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-center" /></div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-2">Horarios de Entrenamiento *</label>
                  <div className="space-y-3 mb-3">
                    {horariosDinámicos.map((horario, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <select value={horario.dia} onChange={(e) => actualizarHorario(index, 'dia', e.target.value)} className="w-1/3 px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white outline-none cursor-pointer">
                          {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <div className="flex items-center w-2/3 gap-2">
                          <input type="time" value={horario.inicio} onChange={(e) => actualizarHorario(index, 'inicio', e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none" />
                          <span className="text-slate-400 font-bold">-</span>
                          <input type="time" value={horario.fin} onChange={(e) => actualizarHorario(index, 'fin', e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none" />
                        </div>
                        <button type="button" onClick={() => setHorariosDinámicos(prev => prev.filter((_, i) => i !== index))} className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setHorariosDinámicos(prev => [...prev, { dia: 'Lunes', inicio: '18:00', fin: '19:30' }])} className="text-sm font-bold text-orange-600 flex items-center gap-1 hover:text-orange-700 transition-colors p-1 -ml-1 rounded hover:bg-orange-50">
                    <Plus className="w-4 h-4" /> Agregar franja horaria
                  </button>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 bg-white flex justify-center gap-3 shrink-0 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
              <button type="button" onClick={cerrarModal} className="flex-1 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="submit" form="grupoForm" disabled={guardando} className="flex-1 py-3 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-500 shadow-sm disabled:opacity-50 transition-colors">
                {guardando ? 'Guardando...' : (grupoEditandoId ? 'Actualizar Grupo' : 'Guardar Grupo')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `@keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } } .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; } .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }`}} />
    </div>
  );
}