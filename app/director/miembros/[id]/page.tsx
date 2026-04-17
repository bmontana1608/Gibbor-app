'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Edit, Save, Trash2, Pause, Play, FileText, Trophy, Hospital, Users, Phone, Loader, AlertCircle, Wallet, Star, Zap, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function FichaDelJugador() {
  const params = useParams();
  const router = useRouter();
  
  const [jugador, setJugador] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  
  // Estados para el Modo Edición
  const [edicion, setEdicion] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);

  useEffect(() => {
    async function cargarJugador() {
      if (!params?.id || params.id === 'nuevo') {
        setCargando(false);
        return;
      }

      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', params.id)
        .maybeSingle(); 

      if (error) {
        toast.error('Error al cargar datos: ' + error.message);
      } else if (data) {
        setJugador(data);
        setFormData(data); 
      }
      
      const { data: categoriasBD } = await supabase.from('categorias').select('nombre').eq('estado', 'Activo');
      if (categoriasBD) setCategorias(categoriasBD);

      const { data: planesBD } = await supabase.from('planes').select('nombre, precio_base').order('precio_base', { ascending: true });
      if (planesBD) setPlanes(planesBD);

      // Cargar Historial de Pagos del Jugador
      const { data: pagosBD } = await supabase
        .from('pagos_ingresos')
        .select('*')
        .eq('jugador_id', params.id)
        .order('fecha', { ascending: false });
      
      if (pagosBD) setPagos(pagosBD);

      setCargando(false);
    }
    cargarJugador();
  }, [params]);

  // --- ACCIONES DE ADMINISTRADOR ---

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    const toastId = toast.loading("Guardando actualizaciones...");

    const { error } = await supabase
      .from('perfiles')
      .update(formData)
      .eq('id', jugador.id);

    if (error) {
      toast.error("Error al actualizar: " + error.message, { id: toastId });
    } else {
      setJugador(formData); 
      setEdicion(false);    
      toast.success("Datos actualizados correctamente.", { id: toastId });
    }
    setGuardando(false);
  };

  const cambiarEstado = async (nuevoEstado: string) => {
    const accion = nuevoEstado === 'Inactivo' ? 'pausar la membresía de' : 'reactivar a';
    if (!window.confirm(`¿Estás seguro de ${accion} ${jugador.nombres}?`)) return;

    const toastId = toast.loading("Procesando cambio de estado...");

    const { error } = await supabase
      .from('perfiles')
      .update({ estado_miembro: nuevoEstado })
      .eq('id', jugador.id);

    if (!error) {
      setJugador({ ...jugador, estado_miembro: nuevoEstado });
      toast.success(`Jugador marcado como ${nuevoEstado}`, { id: toastId });
    } else {
      toast.error("Error al cambiar estado: " + error.message, { id: toastId });
    }
  };

  const eliminarJugador = async () => {
    if (!window.confirm(`¡ADVERTENCIA!\n\nEstás a punto de ELIMINAR a ${jugador.nombres} ${jugador.apellidos} para siempre.\n¿Deseas continuar?`)) return;

    const toastId = toast.loading("Eliminando cuenta del jugador...");

    const { error } = await supabase
      .from('perfiles')
      .delete()
      .eq('id', jugador.id);

    if (!error) {
      toast.success("Jugador eliminado exitosamente.", { id: toastId });
      router.push('/director/miembros');
    } else {
      toast.error("Error al eliminar: " + error.message, { id: toastId });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setSubiendoFoto(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `avatares/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('fotos').upload(filePath, file);
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('fotos').getPublicUrl(filePath);
      setFormData({ ...formData, foto_url: data.publicUrl });
      toast.success('Foto subida. No olvides pulsar Guardar Cambios.');
    } catch (error: any) {
      toast.error('GIBBOR ADMIN: Debes crear un Storage Bucket llamado "fotos" y hacerlo público en Supabase.', { duration: 10000 });
    } finally {
      setSubiendoFoto(false);
    }
  };

  if (cargando) return (
    <div className="min-h-screen bg-slate-50 flex flex-col gap-4 items-center justify-center text-slate-500 font-medium">
      <Loader className="w-8 h-8 animate-spin text-orange-500" />
      <p>Cargando expediente del jugador...</p>
    </div>
  );
  if (!jugador) return (
    <div className="min-h-screen bg-slate-50 flex flex-col gap-4 items-center justify-center text-red-500 font-medium">
      <AlertCircle className="w-10 h-10" />
      <p>Jugador no encontrado en la base de datos.</p>
    </div>
  );

  const estadoMiembro = jugador.estado_miembro || 'Activo';
  const esAlDia = (jugador.estado_pago || '').trim().toLowerCase() === 'al día';

  // ==========================================
  // VISTA 1: MODO EDICIÓN (Formulario)
  // ==========================================
  if (edicion) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Edit className="w-6 h-6 text-orange-500" /> Editando a {jugador.nombres}
            </h1>
            <button onClick={() => setEdicion(false)} className="text-slate-500 hover:text-slate-700 font-bold text-sm transition-colors">
              ✕ Cancelar Edición
            </button>
          </div>

          <form onSubmit={handleGuardarEdicion} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-8">
            
            {/* Básicos */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-4 border-b pb-2">Datos Básicos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Nombres</label><input type="text" name="nombres" value={formData.nombres || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm" required/></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Apellidos</label><input type="text" name="apellidos" value={formData.apellidos || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm" required/></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Documento</label><input type="text" name="documento_identidad" value={formData.documento_identidad || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"/></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Fecha de Nacimiento</label><input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"/></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Teléfono</label><input type="text" name="telefono" value={formData.telefono || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"/></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Email</label><input type="email" name="email_contacto" value={formData.email_contacto || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"/></div>
                <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Dirección de Residencia</label><input type="text" name="direccion" value={formData.direccion || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"/></div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Foto de Perfil</label>
                  <div className="flex gap-4 items-center">
                    <label className="relative cursor-pointer bg-slate-100 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 text-slate-600 hover:text-orange-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm">
                       {subiendoFoto ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                       {subiendoFoto ? "Subiendo..." : "Subir Foto Directo"}
                       <input type="file" accept="image/*" onChange={handleSubirFoto} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={subiendoFoto} />
                    </label>
                    <input type="text" name="foto_url" value={formData.foto_url || ''} onChange={handleChange} placeholder="O pega el link aquí..." className="flex-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"/>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Sube desde tu PC/Móvil o pega un enlace público de internet.</p>
                </div>
              </div>
            </div>

            {/* Club */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-4 border-b pb-2">Datos del Club y Rol</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Rol en el Sistema</label>
                  <select name="rol" value={formData.rol || 'Futbolista'} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white cursor-pointer font-bold text-orange-600">
                    <option value="Futbolista">Futbolista</option>
                    <option value="Entrenador">Entrenador</option>
                    <option value="Director">Director</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Categoría / Grupo</label>
                  <select name="grupos" value={formData.grupos || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white cursor-pointer">
                    <option value="">Sin categoría / Sin asignar</option>
                    {categorias.map(cat => (
                      <option key={cat.nombre} value={cat.nombre}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Posición</label><input type="text" name="posicion" value={formData.posicion || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"/></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Dorsal</label><input type="text" name="dorsal" value={formData.dorsal || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"/></div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Plan Financiero</label>
                  <select name="tipo_plan" value={formData.tipo_plan || 'Regular'} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white cursor-pointer">
                    {planes.map(p => (
                      <option key={p.nombre} value={p.nombre}>{p.nombre} (${Number(p.precio_base).toLocaleString('es-CO')})</option>
                    ))}
                    {planes.length === 0 && <option value="Regular">Regular</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Estado de Pago</label>
                  <select name="estado_pago" value={formData.estado_pago || 'Pendiente'} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white cursor-pointer">
                    <option value="Al día">Al día</option><option value="Pendiente">Pendiente</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Acudiente */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-4 border-b pb-2">Datos del Acudiente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Nombre del Acudiente</label><input type="text" name="acudiente_nombre" value={formData.acudiente_nombre || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"/></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Identificación del Acudiente</label><input type="text" name="acudiente_identificacion" value={formData.acudiente_identificacion || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"/></div>
              </div>
            </div>

            {/* Médico y Emergencias */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-4 border-b pb-2">Médico y Emergencias</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Sangre</label>
                  <select name="tipo_sangre" value={formData.tipo_sangre || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white">
                    <option value="">Seleccionar...</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                  </select>
                </div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">EPS / Seguro</label><input type="text" name="eps" value={formData.eps || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"/></div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Talla Uniforme</label>
                  <select name="talla_uniforme" value={formData.talla_uniforme || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white">
                    <option value="">Seleccionar...</option><option>6</option><option>8</option><option>10</option><option>12</option><option>14</option><option>16</option><option>S</option><option>M</option><option>L</option><option>XL</option>
                  </select>
                </div>
                <div className="md:col-span-3"><label className="block text-xs font-bold text-slate-500 mb-1">Patologías / Alergias</label><textarea name="patologias" value={formData.patologias || ''} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"></textarea></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Contacto Emergencia (Nombre)</label><input type="text" name="emergencia_nombre" value={formData.emergencia_nombre || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"/></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">Contacto Emergencia (Teléfono)</label><input type="text" name="emergencia_telefono" value={formData.emergencia_telefono || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"/></div>
              </div>
            </div>

            {/* Guardar */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setEdicion(false)} className="px-6 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={guardando} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-sm disabled:opacity-50 transition-colors">
                <Save className="w-4 h-4" /> {guardando ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }


  // ==========================================
  // VISTA 2: PERFIL NORMAL (Solo Lectura)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      
      <button onClick={() => router.back()} className="mb-6 text-slate-500 hover:text-orange-600 flex items-center gap-2 transition-colors font-bold text-sm w-fit group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al Directorio
      </button>

      {/* CABECERA Y BOTONERA DE ACCIÓN */}
      <div className="bg-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm border border-slate-200 mb-8 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-1.5 h-full ${estadoMiembro === 'Activo' ? 'bg-emerald-500' : estadoMiembro === 'Inactivo' ? 'bg-slate-400' : 'bg-amber-500'}`}></div>
        
        <div className="flex items-center gap-5 relative z-10">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-sm shrink-0 border font-black overflow-hidden ${estadoMiembro === 'Inactivo' ? 'bg-slate-100 border-slate-200 opacity-50 text-slate-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
            {jugador.foto_url ? (
              <img src={jugador.foto_url} alt={jugador.nombres} className="w-full h-full object-cover" />
            ) : (
              jugador.nombres ? jugador.nombres.charAt(0).toUpperCase() : '?'
            )}
          </div>
          <div>
            <h1 className={`text-2xl md:text-3xl font-black tracking-tight ${estadoMiembro === 'Inactivo' ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}`}>
              {jugador.nombres} {jugador.apellidos}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                estadoMiembro === 'Activo' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                estadoMiembro === 'Inactivo' ? 'bg-slate-100 text-slate-500 border-slate-200' : 
                'bg-amber-100 text-amber-700 border-amber-200'
              }`}>
                {estadoMiembro}
              </span>
              <span className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                {jugador.rol || 'Futbolista'}
              </span>
              <span className="text-slate-500 text-xs font-medium border-l border-slate-200 pl-2">
                {jugador.grupos || 'Sin Categoría'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 sm:ml-auto">
          {/* Tarjeta de Puntos Gibbor */}
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[120px] shadow-sm">
             <Trophy className="w-5 h-5 text-orange-500 mb-1" />
             <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Gibbor Points</p>
             <p className="text-2xl font-black text-orange-600 leading-none mt-1">{jugador.puntos || 0} GP</p>
          </div>
          
          <div className="w-px h-12 bg-slate-100 mx-2 hidden md:block"></div>
        </div>

        {/* BOTONES MÁGICOS */}
        <div className="w-full md:w-auto flex flex-wrap md:flex-col gap-2 relative z-10">
          <button onClick={() => setEdicion(true)} className="flex-1 md:flex-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold transition-colors text-xs flex items-center justify-center gap-2 shadow-sm">
            <Edit className="w-3.5 h-3.5" /> Editar Perfil
          </button>
          
          {estadoMiembro === 'Activo' ? (
            <button onClick={() => cambiarEstado('Inactivo')} className="flex-1 md:flex-none bg-white hover:bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg font-bold transition-colors text-xs flex items-center justify-center gap-2 shadow-sm">
              <Pause className="w-3.5 h-3.5" /> Marcar Inactivo
            </button>
          ) : (
            <button onClick={() => cambiarEstado('Activo')} className="flex-1 md:flex-none bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg font-bold transition-colors text-xs flex items-center justify-center gap-2 shadow-sm">
              <Play className="w-3.5 h-3.5" /> Reactivar Jugador
            </button>
          )}

          <button onClick={eliminarJugador} className="flex-1 md:flex-none bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-4 py-2 rounded-lg font-bold transition-colors text-xs flex items-center justify-center gap-2 shadow-sm mt-2 md:mt-0">
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
          </button>
        </div>
      </div>

      {/* DETALLES DEL PERFIL */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 ${estadoMiembro === 'Inactivo' ? 'opacity-60 grayscale' : ''}`}>
        
        {/* COLUMNA IZQUIERDA */}
        <div className="space-y-6 md:space-y-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wider border-b border-slate-100 pb-4">
              <FileText className="w-5 h-5 text-blue-500" /> Datos Personales
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3"><span className="text-slate-500 text-sm">Documento de Identidad</span><span className="text-slate-800 font-bold">{jugador.documento_identidad || '---'}</span></div>
              <div className="flex justify-between items-center border-b border-slate-50 pb-3"><span className="text-slate-500 text-sm">Fecha de Nacimiento</span><span className="text-slate-800 font-bold">{jugador.fecha_nacimiento || '---'}</span></div>
              <div className="flex justify-between items-center border-b border-slate-50 pb-3"><span className="text-slate-500 text-sm">Teléfono</span><span className="text-slate-800 font-bold">{jugador.telefono || '---'}</span></div>
              <div className="flex justify-between items-center border-b border-slate-50 pb-3"><span className="text-slate-500 text-sm">Email</span><span className="text-slate-800 font-bold">{jugador.email_contacto || '---'}</span></div>
              <div className="flex justify-between items-center pb-1"><span className="text-slate-500 text-sm">Dirección</span><span className="text-slate-800 font-bold">{jugador.direccion || '---'}</span></div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wider border-b border-slate-100 pb-4">
              <Trophy className="w-5 h-5 text-orange-500" /> Perfil Deportivo y Financiero
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3"><span className="text-slate-500 text-sm">Plan Asignado</span><span className="text-slate-800 font-bold bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{jugador.tipo_plan || 'Regular'}</span></div>
              <div className="flex justify-between items-center border-b border-slate-50 pb-3"><span className="text-slate-500 text-sm">Posición / Dorsal</span><span className="text-slate-800 font-bold">{jugador.posicion || '-'} | #{jugador.dorsal || '-'}</span></div>
              <div className="flex justify-between items-center border-b border-slate-50 pb-3"><span className="text-slate-500 text-sm">Talla de Uniforme</span><span className="text-slate-800 font-bold">{jugador.talla_uniforme || '---'}</span></div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-slate-500 text-sm">Estado de Pago</span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${esAlDia ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{esAlDia ? 'Al día' : 'Pendiente'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-6 md:space-y-8">
          <div className="bg-red-50/30 border border-red-100 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-300"></div>
            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wider border-b border-red-100 pb-4 relative z-10">
              <Hospital className="w-5 h-5 text-red-500" /> Médico y Emergencias
            </h3>
            
            <div className="grid grid-cols-2 gap-6 mb-6 relative z-10">
              <div><span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Tipo de Sangre</span><span className="text-red-600 font-black text-2xl">{jugador.tipo_sangre || '-'}</span></div>
              <div><span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">EPS / Seguro</span><span className="text-slate-800 font-bold text-lg">{jugador.eps || '---'}</span></div>
            </div>

            {jugador.patologias && (
              <div className="mb-6 relative z-10"><span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-2">Patologías / Alergias</span><div className="bg-white border border-red-100 shadow-sm p-4 rounded-xl"><p className="text-red-800 text-sm font-medium leading-relaxed">{jugador.patologias}</p></div></div>
            )}

            <div className="pt-5 border-t border-red-100 relative z-10">
              <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-2">Llamar en emergencia a:</span>
              <p className="text-slate-800 font-bold text-lg">{jugador.emergencia_nombre || '---'}</p>
              <p className="text-slate-600 font-medium text-sm mt-1 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {jugador.emergencia_telefono || '---'}</p>
            </div>
          </div>
          
          {(jugador.acudiente_nombre || jugador.acudiente_identificacion) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-wider border-b border-slate-100 pb-4">
                <Users className="w-5 h-5 text-orange-500" /> Acudiente
              </h3>
              <div className="space-y-4">
                <div><span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Nombre Completo</span><span className="text-slate-800 font-bold">{jugador.acudiente_nombre || '---'}</span></div>
                <div><span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Identificación</span><span className="text-slate-800 font-medium">{jugador.acudiente_identificacion || '---'}</span></div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* SECCIÓN DE PAGOS */}
      <div className="mt-8">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-10">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
              <Wallet className="w-5 h-5 text-emerald-500" /> Historial de Pagos
            </h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-md">{pagos.length} Registros</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-100">
                  <th className="p-4 px-6 italic">№ Recibo</th>
                  <th className="p-4 px-6">Fecha</th>
                  <th className="p-4 px-6">Método</th>
                  <th className="p-4 px-6">Detalle</th>
                  <th className="p-4 px-6 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {pagos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">No se han registrado pagos para este jugador aún.</td>
                  </tr>
                ) : (
                  pagos.map((pago) => (
                    <tr key={pago.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 px-6 font-black text-slate-400">#{pago.consecutivo.toString().padStart(3, '0')}</td>
                      <td className="p-4 px-6 text-slate-600 font-medium">
                        {new Date(pago.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-4 px-6">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold uppercase">{pago.metodo_pago}</span>
                      </td>
                      <td className="p-4 px-6">
                        <p className="text-xs text-slate-500 italic max-w-xs truncate">{pago.notas || 'Sin observaciones'}</p>
                      </td>
                      <td className="p-4 px-6 text-right">
                        <span className="font-black text-emerald-600">${parseFloat(pago.total || 0).toLocaleString('es-CO')}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}