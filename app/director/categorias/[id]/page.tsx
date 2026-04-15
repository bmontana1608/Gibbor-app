'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DetalleCategoria() {
  const params = useParams();
  const router = useRouter();
  
  const [categoria, setCategoria] = useState<any>(null);
  const [miembros, setMiembros] = useState<any[]>([]);
  const [entrenadoresBD, setEntrenadoresBD] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  const [pestañaActiva, setPestañaActiva] = useState<'General' | 'Miembros' | 'Horarios'>('General');

  // --- ESTADOS PARA EL MODAL DE EDICIÓN ---
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [entrenadoresSeleccionados, setEntrenadoresSeleccionados] = useState<string[]>([]);
  const [horariosDinámicos, setHorariosDinámicos] = useState<any[]>([]);

  const cargarDetalle = async () => {
    if (!params?.id) return;

    const { data: catData, error: catError } = await supabase.from('categorias').select('*').eq('id', params.id).maybeSingle();
    if (catError || !catData) { setCargando(false); return; }
    setCategoria(catData);

    const { data: memData } = await supabase.from('perfiles').select('*').eq('rol', 'Futbolista').eq('grupos', catData.nombre).neq('estado_miembro', 'Pendiente').order('nombres', { ascending: true });
    if (memData) setMiembros(memData);
    
    const { data: entData } = await supabase.from('perfiles').select('id, nombres, apellidos').or('rol.eq.Entrenador,rol.eq.Director');
    if (entData) setEntrenadoresBD(entData);

    setCargando(false);
  };

  useEffect(() => {
    cargarDetalle();
  }, [params]);

  // --- LÓGICA DE EDICIÓN ---
  const abrirEditarGrupo = () => {
    setFormData({
      nombre: categoria.nombre || '', deporte: categoria.deporte || 'Fútbol', descripcion: categoria.descripcion || '',
      nivel: categoria.nivel || 'Principiante', edad_minima: categoria.edad_minima || 5, edad_maxima: categoria.edad_maxima || 18,
      capacidad_maxima: categoria.capacidad_maxima || 20, estado: categoria.estado || 'Activo'
    });

    setEntrenadoresSeleccionados(categoria.entrenadores ? categoria.entrenadores.split(', ') : []);

    if (categoria.horarios) {
      const horariosParseados = categoria.horarios.split(' | ').map((h: string) => {
        const [dia, horas] = h.trim().split(' ');
        const [inicio, fin] = horas && horas.includes('-') ? horas.split('-') : ['18:00', '19:30'];
        return { dia: dia || 'Lunes', inicio: inicio || '18:00', fin: fin || '19:30' };
      });
      setHorariosDinámicos(horariosParseados);
    } else {
      setHorariosDinámicos([{ dia: 'Lunes', inicio: '18:00', fin: '19:30' }]);
    }
    setMostrarModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const toggleEntrenador = (nombreCompleto: string) => {
    setEntrenadoresSeleccionados(prev => prev.includes(nombreCompleto) ? prev.filter(e => e !== nombreCompleto) : [...prev, nombreCompleto]);
  };

  const actualizarHorario = (index: number, campo: string, valor: string) => {
    const nuevos = [...horariosDinámicos];
    nuevos[index] = { ...nuevos[index], [campo]: valor };
    setHorariosDinámicos(nuevos);
  };

  const handleGuardarGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    
    const entrenadoresString = entrenadoresSeleccionados.join(', ');
    const horariosString = horariosDinámicos.map(h => `${h.dia} ${h.inicio}-${h.fin}`).join(' | ');

    const datosFinales = { ...formData, entrenadores: entrenadoresString, horarios: horariosString };

    const { error } = await supabase.from('categorias').update(datosFinales).eq('id', categoria.id);
    
    if (error) {
      alert("Error al actualizar: " + error.message);
    } else {
      setMostrarModal(false);
      cargarDetalle(); // Recargamos para ver los cambios de inmediato
    }
    setGuardando(false);
  };

  if (cargando) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">⏳ Cargando información del grupo...</div>;
  if (!categoria) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-red-500 font-medium">❌ Grupo no encontrado.</div>;

  const porcentajeOcupacion = categoria.capacidad_maxima > 0 ? Math.min(Math.round((miembros.length / categoria.capacidad_maxima) * 100), 100) : 0;
  
  // Limpiamos el array de horarios para evitar espacios en blanco extraños
  const horariosArray = categoria.horarios ? categoria.horarios.split(' | ').filter((h: string) => h.trim() !== '') : [];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800 relative">
      
      {/* 1. CABECERA Y NAVEGACIÓN */}
      <button onClick={() => router.back()} className="mb-6 text-slate-500 hover:text-orange-600 flex items-center gap-2 transition-colors font-bold text-sm w-fit group">
        <span className="group-hover:-translate-x-1 transition-transform">←</span> Volver a Grupos
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6 relative">
        <div className={`absolute top-0 left-0 w-1.5 h-full ${categoria.estado === 'Activo' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
        
        <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${categoria.estado === 'Activo' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-100 border-slate-200'}`}>
                {categoria.estado}
              </span>
              <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200">
                {categoria.deporte} • {categoria.nivel}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{categoria.nombre}</h1>
            <p className="text-sm text-slate-500 mt-1">{categoria.descripcion || 'Sin descripción asignada.'}</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={() => router.push('/director/asistencia')} className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2">
              <span>📋</span> Entrenar
            </button>
            {/* BOTÓN CONECTADO AL MODAL */}
            <button onClick={abrirEditarGrupo} className="flex-1 md:flex-none bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2">
              <span>✏️</span> Editar Grupo
            </button>
          </div>
        </div>

        {/* MENÚ DE PESTAÑAS */}
        <div className="flex px-6 border-t border-slate-100 bg-slate-50/50 overflow-x-auto custom-scrollbar">
          <button onClick={() => setPestañaActiva('General')} className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${pestañaActiva === 'General' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            Vista General
          </button>
          <button onClick={() => setPestañaActiva('Miembros')} className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${pestañaActiva === 'Miembros' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            Miembros <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{miembros.length}</span>
          </button>
          <button onClick={() => setPestañaActiva('Horarios')} className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${pestañaActiva === 'Horarios' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            Horarios
          </button>
        </div>
      </div>

      {/* 2. CONTENIDO DE LAS PESTAÑAS */}

      {/* --- PESTAÑA: VISTA GENERAL --- */}
      {pestañaActiva === 'General' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wider border-b border-slate-100 pb-4">
                <span className="text-blue-500">📊</span> Detalles del Grupo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Deporte</p><p className="text-slate-800 font-bold">{categoria.deporte}</p></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nivel de Habilidad</p><p className="text-slate-800 font-bold">{categoria.nivel}</p></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Rango de Edad</p><p className="text-slate-800 font-bold">{categoria.edad_minima} a {categoria.edad_maxima} años</p></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Estado Actual</p><p className="text-emerald-600 font-bold">{categoria.estado}</p></div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wider border-b border-slate-100 pb-4">
                <span className="text-orange-500">👨‍🏫</span> Entrenadores Asignados
              </h3>
              {categoria.entrenadores ? (
                <div className="flex flex-col gap-3">
                  {categoria.entrenadores.split(', ').map((ent: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">{ent.charAt(0).toUpperCase()}</div>
                      <p className="font-bold text-slate-700">{ent}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic">No hay entrenadores asignados a este grupo.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wider border-b border-slate-100 pb-4">
                <span className="text-emerald-500">👥</span> Ocupación y Capacidad
              </h3>
              <div className="flex justify-between items-end mb-2">
                <span className="text-3xl font-black text-slate-800">{miembros.length}</span>
                <span className="text-slate-500 font-medium mb-1">/ {categoria.capacidad_maxima} cupos</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden">
                <div className={`h-3 rounded-full transition-all duration-1000 ${porcentajeOcupacion >= 100 ? 'bg-red-500' : porcentajeOcupacion > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${porcentajeOcupacion}%` }}></div>
              </div>
              <p className="text-xs text-slate-500 text-center font-medium">El grupo está al {porcentajeOcupacion}% de su capacidad máxima.</p>
            </div>
          </div>
        </div>
      )}

      {/* --- PESTAÑA: MIEMBROS --- */}
      {pestañaActiva === 'Miembros' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800">Listado de Jugadores ({miembros.length})</h3>
            <button onClick={() => router.push('/director/miembros/nuevo')} className="text-sm font-bold text-orange-600 hover:text-orange-700">+ Añadir Jugador</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">Jugador</th><th className="p-4 text-center">Estado</th><th className="p-4 text-center">Pago</th><th className="p-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {miembros.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">No hay jugadores en esta categoría.</td></tr>
                ) : (
                  miembros.map(jugador => {
                    const esInactivo = jugador.estado_miembro === 'Inactivo';
                    const esAlDia = (jugador.estado_pago || '').toLowerCase() === 'al día';
                    return (
                      <tr key={jugador.id} className={`hover:bg-slate-50 transition-colors ${esInactivo ? 'opacity-60 grayscale' : ''}`}>
                        <td className="p-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">{jugador.nombres.charAt(0)}</div>
                          <div><p className="font-bold text-slate-800">{jugador.nombres} {jugador.apellidos}</p><p className="text-xs text-slate-400">{jugador.telefono || 'Sin teléfono'}</p></div>
                        </td>
                        <td className="p-4 text-center"><span className={`px-2 py-1 rounded-[4px] text-[10px] font-bold uppercase border ${esInactivo ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{jugador.estado_miembro || 'Activo'}</span></td>
                        <td className="p-4 text-center"><span className={`px-2 py-1 rounded-[4px] text-[10px] font-bold uppercase border ${esAlDia ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{esAlDia ? 'Al día' : 'Pendiente'}</span></td>
                        <td className="p-4 text-right"><button onClick={() => router.push(`/director/miembros/${jugador.id}`)} className="text-xs font-bold text-slate-600 hover:text-orange-600 border border-slate-200 px-3 py-1.5 rounded-lg">Ver Ficha</button></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- PESTAÑA: HORARIOS --- */}
      {pestañaActiva === 'Horarios' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8 animate-fade-in">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
              <span className="text-purple-500">🕒</span> Programación de Entrenamientos
            </h3>
            <button onClick={abrirEditarGrupo} className="text-sm font-bold text-orange-600 hover:text-orange-700 border border-orange-200 bg-orange-50 px-3 py-1.5 rounded-lg">
              ✏️ Modificar
            </button>
          </div>

          {horariosArray.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-slate-300 rounded-xl bg-slate-50">
              <span className="text-3xl mb-3 block opacity-50">📅</span>
              <p className="text-slate-600 font-bold mb-1">No hay horarios configurados</p>
              <p className="text-slate-400 text-sm mb-4">Aún no has definido qué días entrena esta categoría.</p>
              <button onClick={abrirEditarGrupo} className="text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 px-5 py-2 rounded-lg transition-colors">Configurar horarios ahora</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {horariosArray.map((horario: string, index: number) => {
                const partes = horario.trim().split(' ');
                const dia = partes[0] || 'Día';
                const horas = partes[1] || '--:--';
                return (
                  <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center text-center hover:border-orange-300 hover:shadow-sm transition-all relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-200 group-hover:bg-orange-400 transition-colors"></div>
                    <span className="text-xl font-black text-slate-800 mb-2">{dia}</span>
                    <span className="text-sm font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 shadow-sm">
                      {horas}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL DE EDICIÓN (REUTILIZADO) */}
      {/* ========================================== */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">✏️ Editar Grupo</h2>
              <button onClick={() => setMostrarModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl leading-none">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <form id="editarGrupoForm" onSubmit={handleGuardarGrupo} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Grupo *</label><input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" /></div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Deporte *</label>
                    <select name="deporte" value={formData.deporte} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none text-sm bg-white"><option value="Fútbol">Fútbol</option><option value="Futsal">Futsal</option></select>
                  </div>
                  <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">Descripción</label><textarea name="descripcion" value={formData.descripcion} onChange={handleChange} rows={2} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"></textarea></div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-2">Entrenadores *</label>
                  <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                    {entrenadoresBD.length === 0 ? <p className="p-3 text-sm text-slate-500">No hay entrenadores.</p> : entrenadoresBD.map(ent => {
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nivel *</label>
                    <select name="nivel" value={formData.nivel} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none text-sm bg-white"><option value="Principiante">Principiante</option><option value="Intermedio">Intermedio</option><option value="Avanzado">Avanzado</option></select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Estado</label>
                    <select name="estado" value={formData.estado} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none text-sm bg-white font-bold"><option value="Activo" className="text-emerald-600">Activo</option><option value="Inactivo" className="text-slate-500">Inactivo</option></select>
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
                        <select value={horario.dia} onChange={(e) => actualizarHorario(index, 'dia', e.target.value)} className="w-1/3 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none">
                          {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <input type="time" value={horario.inicio} onChange={(e) => actualizarHorario(index, 'inicio', e.target.value)} className="w-1/3 px-2 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
                        <span className="text-slate-400 font-bold">-</span>
                        <input type="time" value={horario.fin} onChange={(e) => actualizarHorario(index, 'fin', e.target.value)} className="w-1/3 px-2 py-2 border border-slate-300 rounded-lg text-sm outline-none" />
                        <button type="button" onClick={() => setHorariosDinámicos(prev => prev.filter((_, i) => i !== index))} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">🗑️</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setHorariosDinámicos(prev => [...prev, { dia: 'Lunes', inicio: '18:00', fin: '19:30' }])} className="text-sm font-bold text-orange-600 flex items-center gap-1 hover:text-orange-700"><span>+</span> Agregar horario</button>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 bg-white flex justify-center gap-3 shrink-0 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
              <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button type="submit" form="editarGrupoForm" disabled={guardando} className="flex-1 py-3 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-500 shadow-sm disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Actualizar Grupo'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}} />

    </div>
  );
}