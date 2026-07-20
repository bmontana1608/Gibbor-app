'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Edit, Save, Trash2, Pause, Play, FileText, Trophy, Hospital, Users, Phone, Loader, AlertCircle, Wallet, Upload, Wand2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

import { useTenant } from '@/lib/hooks/useTenant';

export default function FichaDelJugador() {
  const params = useParams();
  const router = useRouter();
  const { route, slug: tenantSlug } = useTenant();
  
  const [jugador, setJugador] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  
  const [edicion, setEdicion] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoDoc, setSubiendoDoc] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [todosLosJugadores, setTodosLosJugadores] = useState<any[]>([]);
  
  // Accesos a plataforma
  const [emailAcceso, setEmailAcceso] = useState('');
  const [claveAcceso, setClaveAcceso] = useState('Club2026*');
  const [generandoAcceso, setGenerandoAcceso] = useState(false);

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
        let cleanGrupos = '';
        if (data.grupos) {
          const cleanArr = data.grupos.replace('|MANUAL', '').split(',').map((g: string) => g.trim()).filter(Boolean);
          cleanGrupos = Array.from(new Set(cleanArr)).join(', ');
        }
        setJugador({ ...data, grupos: cleanGrupos });
        
        const formDataInit = { ...data };
        if (data.fecha_nacimiento) {
          formDataInit.fecha_nacimiento = normalizeDate(data.fecha_nacimiento);
        }
        formDataInit.grupos = cleanGrupos;
        if (data.grupos && data.grupos.includes('|MANUAL')) {
          formDataInit.override_categoria = true;
        } else {
          formDataInit.override_categoria = false;
        }
        setFormData(formDataInit); 

        const { data: categoriasBD } = await supabase.from('categorias')
          .select('nombre')
          .eq('club_id', data.club_id)
          .eq('estado', 'Activo');
        if (categoriasBD) setCategorias(categoriasBD);

        const { data: planesBD } = await supabase.from('planes')
          .select('nombre, precio_base')
          .eq('club_id', data.club_id)
          .order('precio_base', { ascending: true });
        if (planesBD) setPlanes(planesBD);

        const { data: pagosBD } = await supabase
          .from('pagos_ingresos')
          .select('*')
          .eq('jugador_id', params.id)
          .eq('club_id', data.club_id)
          .order('fecha', { ascending: false });
        if (pagosBD) setPagos(pagosBD);

        const { data: todosJugadoresBD } = await supabase
          .from('perfiles')
          .select('id, nombres, apellidos, grupos')
          .eq('club_id', data.club_id)
          .eq('rol', 'Futbolista')
          .eq('estado_miembro', 'Activo')
          .order('nombres', { ascending: true });
        if (todosJugadoresBD) setTodosLosJugadores(todosJugadoresBD);
        
        setEmailAcceso(data.email_contacto || data.email || '');
      }
      setCargando(false);
    }
    cargarJugador();
  }, [params]);

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    const toastId = toast.loading("Guardando...");

    const payload = { ...formData };
    if (payload.estado_miembro === 'Inactivo' && jugador.estado_miembro !== 'Inactivo') {
      payload.fecha_inactivacion = new Date().toISOString().split('T')[0];
    } else if (payload.estado_miembro === 'Activo' && jugador.estado_miembro !== 'Activo') {
      payload.fecha_inactivacion = null;
    }

    if (payload.override_categoria && payload.grupos && payload.rol === 'Futbolista') {
      payload.grupos = `${payload.grupos}|MANUAL`;
    } else if (payload.grupos) {
      payload.grupos = payload.grupos.replace('|MANUAL', '');
    }
    delete payload.override_categoria;

    const { error } = await supabase
      .from('perfiles')
      .update(payload)
      .eq('id', jugador.id);

    if (error) {
      toast.error("Error al actualizar: " + error.message, { id: toastId });
    } else {
      setJugador({ 
        ...payload, 
        grupos: payload.grupos?.replace('|MANUAL', ''),
        fecha_inactivacion: payload.fecha_inactivacion !== undefined ? payload.fecha_inactivacion : jugador.fecha_inactivacion
      }); 
      setEdicion(false);    
      toast.success("Datos actualizados.", { id: toastId });
      router.refresh();
    }
    setGuardando(false);
  };

  const handleSubirDocumento = async (e: React.ChangeEvent<HTMLInputElement>, tipoCampo: 'doc_jugador_url' | 'doc_eps_url' | 'doc_acudiente_url', carpeta: string) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setSubiendoDoc(tipoCampo);

      const toastId = toast.loading('Subiendo documento...');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${carpeta}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('documentos').upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('perfiles')
        .update({ [tipoCampo]: publicUrl })
        .eq('id', jugador.id);

      if (dbError) throw dbError;

      setJugador((prev: any) => ({ ...prev, [tipoCampo]: publicUrl }));
      setFormData((prev: any) => ({ ...prev, [tipoCampo]: publicUrl }));

      toast.success('Documento subido con éxito', { id: toastId });
    } catch (err: any) {
      toast.error('Error al subir documento: ' + err.message);
    } finally {
      setSubiendoDoc(null);
    }
  };

  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setSubiendoFoto(true);

      const toastId = toast.loading('Subiendo imagen al servidor...');

      // Enviar la imagen al API del servidor para quitar el fondo (funciona en iOS y Android)
      const formDataApi = new FormData();
      formDataApi.append('image_file', file);
      formDataApi.append('club_id', jugador.club_id);

      toast.loading('Eliminando fondo con IA en el servidor...', { id: toastId });

      const apiRes = await fetch('/api/remove-background', {
        method: 'POST',
        body: formDataApi,
      });

      if (!apiRes.ok) {
        const errData = await apiRes.json();
        throw new Error(errData.error || 'Error al procesar la imagen');
      }

      const { publicUrl } = await apiRes.json();
      setFormData({ ...formData, foto_url: publicUrl });
      toast.success('¡Foto sin fondo lista! No olvides guardar el perfil.', { id: toastId });
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSubiendoFoto(false);
    }
  };

  const cambiarEstado = async (nuevoEstado: string) => {
    if (!window.confirm(`¿Cambiar estado a ${nuevoEstado}?`)) return;
    const fechaInact = nuevoEstado === 'Inactivo' ? new Date().toISOString().split('T')[0] : null;
    const { error } = await supabase
      .from('perfiles')
      .update({ 
        estado_miembro: nuevoEstado,
        fecha_inactivacion: fechaInact
      })
      .eq('id', jugador.id);
    if (!error) {
      setJugador({ 
        ...jugador, 
        estado_miembro: nuevoEstado,
        fecha_inactivacion: fechaInact
      });
      toast.success(`Jugador ${nuevoEstado}`);
      router.refresh();
    }
  };

  const eliminarJugador = async () => {
    if (!window.confirm(`¿ELIMINAR PERFIL?`)) return;
    const { error } = await supabase.from('perfiles').delete().eq('id', jugador.id);
    if (!error) {
      toast.success("Eliminado");
      router.refresh();
      router.push(route('/director/miembros'));
    }
  };

  const normalizeDate = (d: string | null | undefined) => {
    if (!d || d === 'null' || d === 'undefined') return '';
    if (d.includes('-')) return d.split('T')[0];
    const parts = d.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return d;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  if (cargando) return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500"><Loader className="w-8 h-8 animate-spin" /><p>Cargando...</p></div>;
  if (!jugador) return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-red-500"><AlertCircle className="w-10 h-10" /><p>No encontrado.</p></div>;

  const esAlDia = (jugador.estado_pago || '').trim().toLowerCase() === 'al día';

  if (edicion) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Edit className="w-6 h-6" /> Editando Perfil de {jugador.nombres}</h1>
            <button onClick={() => setEdicion(false)} className="text-slate-500 font-bold hover:text-slate-700 transition-colors">✕ Cancelar</button>
          </div>
          <form onSubmit={handleGuardarEdicion} className="space-y-6">
            {/* CARD 1: ESTADO Y ROL EN ACADEMIA */}
            <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Estado y Academia</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Estado de Miembro</label>
                  <select name="estado_miembro" value={formData.estado_miembro || 'Activo'} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm bg-white font-bold">
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Rol</label>
                  <select name="rol" value={formData.rol || 'Futbolista'} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm bg-white">
                    <option value="Futbolista">Futbolista</option>
                    <option value="Entrenador">Entrenador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {formData.rol === 'Entrenador' || formData.rol === 'Director' ? 'Categorías Asignadas' : 'Categoría'}
                  </label>
                  <div className="space-y-2">
                    {formData.rol === 'Entrenador' || formData.rol === 'Director' ? (
                      <div className="grid grid-cols-2 gap-2 border bg-cyan-50/30 p-3 rounded-xl border-cyan-100 max-h-32 overflow-y-auto">
                        {categorias.map(c => (
                          <label key={c.nombre} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={(formData.grupos || '').split(',').map((g: string) => g.trim()).includes(c.nombre.trim())}
                              onChange={(e) => {
                                const currentGroups = (formData.grupos || '').split(',').map((g: string) => g.trim()).filter(Boolean);
                                const uniqueGroups = Array.from(new Set(currentGroups)) as string[];
                                let newGroups: string[];
                                if (e.target.checked) {
                                  newGroups = [...uniqueGroups, c.nombre.trim()];
                                } else {
                                  newGroups = uniqueGroups.filter((g: string) => g !== c.nombre.trim());
                                }
                                const finalGroups = Array.from(new Set(newGroups)).join(', ');
                                setFormData((prev: any) => ({ ...prev, grupos: finalGroups }));
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-brand focus:text-brand"
                            />
                            {c.nombre}
                          </label>
                        ))}
                        {categorias.length === 0 && <p className="text-[10px] text-slate-400 italic">No hay categorías activas.</p>}
                      </div>
                    ) : (
                      <>
                        <select name="grupos" value={formData.grupos || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm bg-white">
                          <option value="">Sin Asignar</option>
                          {categorias.map(c => (
                            <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
                          ))}
                        </select>
                        {formData.rol === 'Futbolista' && formData.grupos && (
                          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={formData.override_categoria}
                              onChange={(e) => setFormData((prev: any) => ({ ...prev, override_categoria: e.target.checked }))}
                              className="w-3.5 h-3.5 rounded border-slate-300"
                            />
                            Fijar categoría manualmente
                          </label>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Plan de Pago</label>
                  <select name="tipo_plan" value={formData.tipo_plan || 'Regular'} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm bg-white">
                    {planes.map(p => (
                      <option key={p.nombre} value={p.nombre}>{p.nombre} (${Number(p.precio_base).toLocaleString('es-CO')})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Puntos GP</label>
                  <input type="number" name="puntos" value={formData.puntos ?? 0} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm" />
                </div>
              </div>
            </div>

            {/* CARD 2: DATOS BÁSICOS Y PERSONALES */}
            <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Datos Personales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nombres *</label>
                  <input type="text" name="nombres" value={formData.nombres || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm" required/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Apellidos *</label>
                  <input type="text" name="apellidos" value={formData.apellidos || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm" required/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Documento de Identidad</label>
                  <input type="text" name="documento_identidad" value={formData.documento_identidad || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Fecha de Nacimiento</label>
                  <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono</label>
                  <input type="text" name="telefono" value={formData.telefono || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Email de Contacto</label>
                  <input type="email" name="email_contacto" value={formData.email_contacto || formData.email || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm"/>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Dirección de Residencia</label>
                  <input type="text" name="direccion" value={formData.direccion || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm"/>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Foto de Perfil</label>
                  <div className="flex gap-4 items-center">
                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 border p-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all group">
                       {subiendoFoto ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 text-emerald-500 group-hover:rotate-12 transition-transform" />} 
                       {subiendoFoto ? "Procesando IA..." : "Foto con IA"}
                       <input type="file" accept="image/*" onChange={handleSubirFoto} className="hidden" disabled={subiendoFoto} />
                    </label>
                    <input type="text" name="foto_url" value={formData.foto_url || ''} onChange={handleChange} placeholder="URL de la foto..." className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2"/>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: FICHA MÉDICA Y DEPORTIVA */}
            <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 border-b pb-2">Ficha Médica y Deportiva</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Sangre</label>
                  <input type="text" name="tipo_sangre" value={formData.tipo_sangre || ''} onChange={handleChange} placeholder="Ej: O+" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">EPS</label>
                  <input type="text" name="eps" value={formData.eps || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Talla Uniforme</label>
                  <input type="text" name="talla_uniforme" value={formData.talla_uniforme || ''} onChange={handleChange} placeholder="Ej: M" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Posición de Juego</label>
                  <input type="text" name="posicion" value={formData.posicion || ''} onChange={handleChange} placeholder="Ej: Delantero" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Dorsal / Número</label>
                  <input type="text" name="dorsal" value={formData.dorsal || ''} onChange={handleChange} placeholder="Ej: 10" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Observaciones Médicas / Alergias / Patologías</label>
                  <textarea name="patologias" value={formData.patologias || ''} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm" placeholder="Indica alergias, medicamentos o condiciones especiales..."></textarea>
                </div>
              </div>
            </div>

            {/* CARD 4: DATOS DE ACUDIENTE Y EMERGENCIA */}
            <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 border-b pb-2">Acudiente y Emergencia</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nombre del Acudiente</label>
                  <input type="text" name="acudiente_nombre" value={formData.acudiente_nombre || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Identificación del Acudiente</label>
                  <input type="text" name="acudiente_identificacion" value={formData.acudiente_identificacion || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Contacto de Emergencia</label>
                  <input type="text" name="emergencia_nombre" value={formData.emergencia_nombre || ''} onChange={handleChange} placeholder="Nombre completo" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono de Emergencia</label>
                  <input type="text" name="emergencia_telefono" value={formData.emergencia_telefono || ''} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 text-sm" />
                </div>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="flex justify-end gap-3 pt-4 bg-white rounded-2xl p-4 border shadow-sm">
              <button type="button" onClick={() => setEdicion(false)} className="px-6 py-2.5 border rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={guardando} className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-emerald-700 transition-all">{guardando ? 'Guardando...' : 'Guardar Perfil'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <button onClick={() => router.back()} className="mb-6 text-slate-500 hover:text-slate-800 flex items-center gap-2 font-bold text-sm">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <div className="bg-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm border mb-8 relative">
        <div className={`absolute top-0 left-0 w-1.5 h-full ${jugador.estado_miembro === 'Activo' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-4xl border overflow-hidden">
            {jugador.foto_url ? <img src={jugador.foto_url} alt="P" className="w-full h-full object-cover" /> : jugador.nombres.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">{jugador.nombres} {jugador.apellidos}</h1>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase border bg-emerald-50 text-emerald-700 border-emerald-200">{jugador.estado_miembro}</span>
              <span className="bg-slate-100 text-slate-600 border px-2 py-1 rounded-full text-[10px] font-bold uppercase">{jugador.rol}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEdicion(true)} className="bg-white border text-slate-700 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Edit className="w-3.5 h-3.5" /> Editar</button>
          <button onClick={eliminarJugador} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> Datos Personales</h3>
          <div className="space-y-4">
             <div className="flex justify-between border-b pb-2"><span className="text-slate-500 text-sm">Documento</span><span className="text-slate-800 font-bold">{jugador.documento_identidad || '---'}</span></div>
             <div className="flex justify-between border-b pb-2"><span className="text-slate-500 text-sm">Teléfono</span><span className="text-slate-800 font-bold">{jugador.telefono || '---'}</span></div>
             <div className="flex justify-between"><span className="text-slate-500 text-sm">Categoría</span><span className="text-slate-800 font-bold">{jugador.grupos || 'Sin asignar'}</span></div>
          </div>
        </div>
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-4 flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-500" /> Estado Financiero</h3>
          <div className="space-y-4">
             <div className="flex justify-between border-b pb-2"><span className="text-slate-500 text-sm">Plan</span><span className="text-slate-800 font-bold">{jugador.tipo_plan || 'Regular'}</span></div>
             <div className="flex justify-between border-b pb-2"><span className="text-slate-500 text-sm">Estado Pago</span><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${esAlDia ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{esAlDia ? 'Al día' : 'Pendiente'}</span></div>
             <div className="flex justify-between"><span className="text-slate-500 text-sm">Puntos</span><span className="text-slate-800 font-bold">{jugador.puntos || 0} GP</span></div>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE DOCUMENTOS */}
      <div className="mt-6 bg-white border rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-500" /> Documentos Adjuntos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center text-center justify-center gap-3">
            <span className="text-sm font-bold text-slate-700">Identificación Jugador</span>
            {jugador.doc_jugador_url ? (
              <a href={jugador.doc_jugador_url} target="_blank" rel="noreferrer" className="bg-white border px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:text-brand hover:border-brand transition-colors">Ver Documento</a>
            ) : (
              <span className="text-xs text-slate-400 font-medium bg-slate-200 px-3 py-1 rounded-full">No cargado</span>
            )}
            <label className="mt-1 cursor-pointer text-xs font-bold text-slate-500 hover:text-brand flex items-center gap-1 transition-colors">
              {subiendoDoc === 'doc_jugador_url' ? <Loader className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {subiendoDoc === 'doc_jugador_url' ? 'Subiendo...' : (jugador.doc_jugador_url ? 'Actualizar' : 'Cargar Documento')}
              <input type="file" className="hidden" accept=".pdf,image/*" onChange={e => handleSubirDocumento(e, 'doc_jugador_url', 'jugadores')} disabled={subiendoDoc !== null} />
            </label>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center text-center justify-center gap-3">
            <span className="text-sm font-bold text-slate-700">Certificado Médico / EPS</span>
            {jugador.doc_eps_url ? (
              <a href={jugador.doc_eps_url} target="_blank" rel="noreferrer" className="bg-white border px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:text-brand hover:border-brand transition-colors">Ver Documento</a>
            ) : (
              <span className="text-xs text-slate-400 font-medium bg-slate-200 px-3 py-1 rounded-full">No cargado</span>
            )}
            <label className="mt-1 cursor-pointer text-xs font-bold text-slate-500 hover:text-brand flex items-center gap-1 transition-colors">
              {subiendoDoc === 'doc_eps_url' ? <Loader className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {subiendoDoc === 'doc_eps_url' ? 'Subiendo...' : (jugador.doc_eps_url ? 'Actualizar' : 'Cargar Documento')}
              <input type="file" className="hidden" accept=".pdf,image/*" onChange={e => handleSubirDocumento(e, 'doc_eps_url', 'eps')} disabled={subiendoDoc !== null} />
            </label>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center text-center justify-center gap-3">
            <span className="text-sm font-bold text-slate-700">Identificación Acudiente</span>
            {jugador.doc_acudiente_url ? (
              <a href={jugador.doc_acudiente_url} target="_blank" rel="noreferrer" className="bg-white border px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:text-brand hover:border-brand transition-colors">Ver Documento</a>
            ) : (
              <span className="text-xs text-slate-400 font-medium bg-slate-200 px-3 py-1 rounded-full">No cargado</span>
            )}
            <label className="mt-1 cursor-pointer text-xs font-bold text-slate-500 hover:text-brand flex items-center gap-1 transition-colors">
              {subiendoDoc === 'doc_acudiente_url' ? <Loader className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {subiendoDoc === 'doc_acudiente_url' ? 'Subiendo...' : (jugador.doc_acudiente_url ? 'Actualizar' : 'Cargar Documento')}
              <input type="file" className="hidden" accept=".pdf,image/*" onChange={e => handleSubirDocumento(e, 'doc_acudiente_url', 'acudientes')} disabled={subiendoDoc !== null} />
            </label>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE ACCESOS A PLATAFORMA */}
      <div className="mt-8 bg-white border rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-4 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-brand" /> Accesos a Plataforma
        </h3>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-1 w-full space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Correo de Acceso</label>
              <input type="email" value={emailAcceso} onChange={(e) => setEmailAcceso(e.target.value)} placeholder="Correo electrónico" className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Contraseña Temporal</label>
              <input type="text" value={claveAcceso} onChange={(e) => setClaveAcceso(e.target.value)} placeholder="Ej: Club2026*" className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand transition-all" />
              <p className="text-[9px] text-slate-400 mt-1 ml-1 font-medium">Debe tener al menos 6 caracteres.</p>
            </div>
          </div>
          
          <div className="flex-1 w-full flex flex-col gap-3 pt-5">
            {jugador.email ? (
              <button onClick={async () => { 
                if(!claveAcceso || claveAcceso.length < 6) return toast.error("La clave debe tener mínimo 6 caracteres.");
                if(!window.confirm(`¿Seguro que deseas resetear la clave de este usuario a: ${claveAcceso} ?`)) return; 
                setGenerandoAcceso(true); 
                const tid = toast.loading("Reseteando clave..."); 
                const res = await fetch('/api/admin/reset-password', { 
                  method: 'POST', 
                  body: JSON.stringify({ userId: jugador.id, newPassword: claveAcceso }) 
                }); 
                if(res.ok) toast.success(`Clave reseteada a ${claveAcceso}`, {id: tid});
                else toast.error("Error al resetear clave", {id: tid});
                setGenerandoAcceso(false); 
              }} disabled={generandoAcceso} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-xl font-black uppercase text-xs transition-all shadow-md">Resetear Clave</button>
            ) : (
              <button onClick={async () => { 
                if(!emailAcceso) return toast.error("Por favor ingresa un correo"); 
                if(!claveAcceso || claveAcceso.length < 6) return toast.error("La clave debe tener mínimo 6 caracteres.");
                setGenerandoAcceso(true); 
                const tid = toast.loading("Activando acceso...");
                try {
                  const res = await fetch('/api/admin/crear-usuario', { 
                    method: 'POST', 
                    body: JSON.stringify({ 
                      email: emailAcceso, 
                      password: claveAcceso, 
                      rol: jugador.rol || 'Futbolista', 
                      perfilId: jugador.id 
                    }) 
                  }); 
                  const data = await res.json();
                  if(res.ok) { 
                    toast.success("¡Acceso activado correctamente!", { id: tid }); 
                    setJugador({...jugador, email: emailAcceso});
                  } else { 
                    toast.error("Error: " + (data.error || "Fallo desconocido"), { id: tid }); 
                  }
                } catch (err) {
                   toast.error("Error de conexión", { id: tid });
                }
                setGenerandoAcceso(false); 
              }} disabled={generandoAcceso} className="w-full bg-brand hover:bg-brand/90 text-white py-3.5 rounded-xl font-black uppercase text-xs transition-all shadow-md shadow-brand/20">Activar Acceso</button>
            )}
            
            <button onClick={() => {
              const msg = `¡Hola! Tu acceso a Gibbor App ha sido configurado.\n\n📧 Correo: ${emailAcceso}\n🔑 Clave temporal: ${claveAcceso}\n\nPuedes ingresar en: https://www.masterclubmanager.com/${tenantSlug || 'tenant'}/login`;
              window.open(`https://wa.me/${jugador.telefono?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
            }} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"><Smartphone className="w-4 h-4" /> Notificar WhatsApp</button>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE HISTORIAL DE PAGOS */}
      <div className="mt-8 bg-white border rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-500" /> Historial de Pagos Recientes
        </h3>
        {pagos.length === 0 ? (
          <p className="text-xs font-bold text-slate-400 text-center py-6">No hay pagos registrados para este jugador.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Consecutivo</th>
                  <th className="pb-3">Fecha</th>
                  <th className="pb-3">Concepto</th>
                  <th className="pb-3">Método</th>
                  <th className="pb-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagos.map((pago: any) => {
                  const normalizedFecha = normalizeDate(pago.fecha);
                  const dateObj = normalizedFecha ? new Date(normalizedFecha + 'T00:00:00') : null;
                  const dateStr = dateObj && !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : 's/f';
                  return (
                    <tr key={pago.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 font-bold text-slate-700">#{String(pago.consecutivo || '').padStart(4, '0')}</td>
                      <td className="py-3.5 text-slate-500">{dateStr}</td>
                      <td className="py-3.5 font-bold text-slate-800">{pago.concepto || 'Mensualidad'}</td>
                      <td className="py-3.5 text-slate-500">{pago.metodo_pago}</td>
                      <td className="py-3.5 font-black text-emerald-600 text-right">${(pago.total || 0).toLocaleString('es-CO')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}