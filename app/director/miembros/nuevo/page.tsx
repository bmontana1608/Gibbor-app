'use client';

// Forzando despliegue - Fix useEffect import
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, Users, Hospital, ShieldAlert, ArrowLeft, Trophy, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { useTenant } from '@/lib/hooks/useTenant';

export default function NuevoMiembro() {
  const router = useRouter();
  const { route } = useTenant();
  const [guardando, setGuardando] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);
  const [todosLosJugadores, setTodosLosJugadores] = useState<any[]>([]);
  const [tenant, setTenant] = useState<any>(null);
  const { slug: tenantSlug } = useTenant();

  useEffect(() => {
    async function cargarDatosInscripcion() {
      // 1. Cargar Tenant para RLS
      if (!tenantSlug) return;
      const tenantRes = await fetch(`/api/tenant?slug=${tenantSlug}`, { cache: 'no-store' });
      const tenantData = await tenantRes.json();
      setTenant(tenantData);

      // Cargar categorías activas
      const { data: catData } = await supabase.from('categorias').select('nombre, id').eq('club_id', tenantData.id).eq('estado', 'Activo');
      if (catData) setCategorias(catData);

      // Cargar planes de pago dinámicos
      const { data: planesData } = await supabase.from('planes').select('nombre, precio_base').eq('club_id', tenantData.id).order('precio_base', { ascending: true });
      if (planesData) setPlanes(planesData);

      // Cargar jugadores para vinculación opcional
      const { data: todosJugadoresBD } = await supabase
        .from('perfiles')
        .select('id, nombres, apellidos, grupos')
        .eq('club_id', tenantData.id) // FILTRO DE SEGURIDAD
        .eq('rol', 'Futbolista')
        .eq('estado_miembro', 'Activo')
        .order('nombres', { ascending: true });
      
      if (todosJugadoresBD) setTodosLosJugadores(todosJugadoresBD);
    }
    cargarDatosInscripcion();
  }, [tenantSlug]);

  // Estado del formulario ampliado
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    documento_identidad: '',
    fecha_nacimiento: '',
    telefono: '',
    email_contacto: '',
    direccion: '',
    
    // Acudiente
    acudiente_nombre: '',
    acudiente_identificacion: '',
    
    // Médico y Emergencias
    tipo_sangre: '',
    eps: '',
    talla_uniforme: '',
    patologias: '',
    emergencia_nombre: '',
    emergencia_telefono: '',

    // Club
    grupos: '',
    tipo_plan: 'Regular',
    rol: 'Futbolista',
    estado_pago: 'Pendiente',
    estado_miembro: 'Activo',
    hijos_config: '',
    override_categoria: false,
    fecha_ingreso: new Date().toISOString().split('T')[0], // Por defecto: hoy
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    setFormData(prev => ({ ...prev, fecha_nacimiento: dateValue }));
    
    if (dateValue) {
      const year = new Date(dateValue).getFullYear();
      const currentYear = new Date().getFullYear();
      setIsMinor((currentYear - year) < 18);
    } else {
      setIsMinor(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombres || !formData.apellidos || !formData.documento_identidad) {
      toast.error("Por favor completa los campos obligatorios.");
      return;
    }

    setGuardando(true);
    const toastId = toast.loading("Guardando jugador...");

    const payload = {
      ...formData,
      grupos: formData.override_categoria && formData.grupos ? `${formData.grupos}|MANUAL` : formData.grupos,
      club_id: tenant?.id
    };
    
    // Renombrar fecha_ingreso a fecha_ingreso_club para la BD
    (payload as any).fecha_ingreso_club = formData.fecha_ingreso;
    delete (payload as any).override_categoria;
    delete (payload as any).fecha_ingreso;

    const { error } = await supabase
      .from('perfiles')
      .insert([payload]);

    setGuardando(false);

    if (error) {
      toast.error("Error al guardar en base de datos: " + error.message, { id: toastId });
      console.error(error);
    } else {
      toast.success("¡Jugador registrado exitosamente!", { id: toastId });
      router.push(route('/director/miembros'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      
      <button 
        onClick={() => router.back()} 
        className="mb-6 text-slate-500 hover:text-brand flex items-center gap-2 transition-colors font-bold text-sm w-fit group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al Directorio
      </button>

      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Cabecera del formulario */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 md:p-8 relative overflow-hidden">
          <div className="text-brand"></div>
          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-white mb-1">Inscripción Oficial</h1>
            <p className="text-sm text-slate-400">Ingresa la información completa del nuevo jugador.</p>
          </div>
          <div className="bg-brand/10 rounded-full absolute -right-10 -top-10 blur-2xl"></div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-10">
          
          {/* 1. DATOS DEL JUGADOR */}
          <section>
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
              <User className="text-brand w-5 h-5" /> Datos Personales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombres *</label>
                <input type="text" name="nombres" value={formData.nombres} onChange={handleChange} required className="text-brand outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Apellidos *</label>
                <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} required className="text-brand outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Documento de Identidad *</label>
                <input type="text" name="documento_identidad" value={formData.documento_identidad} onChange={handleChange} required className="text-brand outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha de Nacimiento *</label>
                <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleDateChange} required className="text-brand outline-none text-sm cursor-pointer" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Teléfono Móvil / WhatsApp *</label>
                <div className="flex">
                  <span className="bg-slate-100 border border-slate-300 border-r-0 rounded-l-lg px-3 py-2.5 text-slate-500 text-sm font-medium">+57</span>
                  <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} required className="text-brand outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                <input type="email" name="email_contacto" value={formData.email_contacto} onChange={handleChange} className="text-brand outline-none text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dirección de Residencia</label>
                <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} className="text-brand outline-none text-sm" />
              </div>
            </div>
          </section>

          {/* 2. ACUDIENTE (CONDICIONAL) */}
          {formData.rol === 'Futbolista' && isMinor && (
            <section className="bg-brand/10/50 border bg-brand/10 rounded-xl p-5 md:p-6 shadow-sm">
              <h2 className="text-lg font-bold text-brand border-b border-brand/40/50 pb-3 mb-2 flex items-center gap-2">
                <Users className="text-brand" /> Datos del Acudiente
              </h2>
              <p className="text-xs text-brand mb-5">Requerido porque el jugador es menor de edad.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-brand uppercase tracking-wider mb-2">Nombre Completo *</label>
                  <input type="text" name="acudiente_nombre" value={formData.acudiente_nombre} onChange={handleChange} required className="text-brand outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand uppercase tracking-wider mb-2">Identificación del Acudiente *</label>
                  <input type="text" name="acudiente_identificacion" value={formData.acudiente_identificacion} onChange={handleChange} required className="text-brand outline-none text-sm" />
                </div>
              </div>
            </section>
          )}

          {/* 3. MÉDICO Y EMERGENCIAS */}
          <section>
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
              <Hospital className="text-red-500 w-5 h-5" /> Médico y Emergencias
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Sangre *</label>
                <select name="tipo_sangre" value={formData.tipo_sangre} onChange={handleChange} required className="text-brand outline-none text-sm bg-white cursor-pointer">
                  <option value="">Seleccionar...</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">EPS / Seguro *</label>
                <input type="text" name="eps" value={formData.eps} onChange={handleChange} required className="text-brand outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Talla Uniforme</label>
                <select name="talla_uniforme" value={formData.talla_uniforme} onChange={handleChange} className="text-brand outline-none text-sm bg-white cursor-pointer">
                  <option value="">Seleccionar...</option><option>6</option><option>8</option><option>10</option><option>12</option><option>14</option><option>16</option><option>S</option><option>M</option><option>L</option><option>XL</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Patologías o Alergias</label>
              <textarea name="patologias" value={formData.patologias} onChange={handleChange} placeholder="Asma, alergia a medicamentos, etc. (Deja en blanco si no aplica)" rows={2} className="text-brand outline-none text-sm"></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-red-50/50 p-5 rounded-xl border border-red-100 relative overflow-hidden">
              <div className="md:col-span-2 flex items-center gap-2 relative z-10"><ShieldAlert className="w-4 h-4 text-red-600" /><h3 className="text-sm font-bold text-red-800">En caso de emergencia llamar a:</h3></div>
              <div className="relative z-10">
                <label className="block text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Nombre del Contacto *</label>
                <input type="text" name="emergencia_nombre" value={formData.emergencia_nombre} onChange={handleChange} required className="w-full px-4 py-2.5 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm bg-white" />
              </div>
              <div className="relative z-10">
                <label className="block text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Teléfono *</label>
                <input type="tel" name="emergencia_telefono" value={formData.emergencia_telefono} onChange={handleChange} required className="w-full px-4 py-2.5 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm bg-white" />
              </div>
            </div>
          </section>

          {/* 4. CONFIGURACIÓN DEL CLUB */}
          <section>
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
              <Trophy className="text-emerald-500 w-5 h-5" /> Configuración Deportiva
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rol en el Club</label>
                <select name="rol" value={formData.rol} onChange={handleChange} className="text-brand outline-none text-sm bg-white cursor-pointer font-bold text-brand">
                  <option value="Futbolista">Futbolista</option>
                  <option value="Entrenador">Entrenador</option>
                  <option value="Director">Director</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categoría(s) / Grupo(s) Asignados</label>
                {formData.rol === 'Entrenador' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border bg-brand/10 rounded-xl p-4 bg-brand/10/30">
                    {categorias.map(cat => (
                      <label key={cat.nombre} className="text-brand transition-colors">
                        <input 
                          type="checkbox" 
                          checked={(formData.grupos || '').split(',').map((g: string) => g.trim()).includes(cat.nombre.trim())}
                          onChange={(e) => {
                            const currentGroups = (formData.grupos || '').split(',').map((g: string) => g.trim()).filter(Boolean);
                            const uniqueGroups = Array.from(new Set(currentGroups)) as string[];
                            let newGroups: string[];
                            if (e.target.checked) {
                              newGroups = [...uniqueGroups, cat.nombre.trim()];
                            } else {
                              newGroups = uniqueGroups.filter((g: string) => g !== cat.nombre.trim());
                            }
                            const finalGroups = Array.from(new Set(newGroups)).join(', ');
                            setFormData({ ...formData, grupos: finalGroups });
                          }}
                          className="text-brand focus:text-brand"
                        />
                        {cat.nombre}
                      </label>
                    ))}
                    {categorias.length === 0 && <p className="text-[10px] text-slate-400 italic col-span-full">No hay categorías activas creadas.</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select name="grupos" value={formData.grupos} onChange={handleChange} className="text-brand outline-none text-sm bg-white cursor-pointer font-bold">
                      <option value="">Sin categoría / Sin asignar</option>
                      {categorias.map(cat => (
                        <option key={cat.nombre} value={cat.nombre}>{cat.nombre}</option>
                      ))}
                    </select>
                    
                    {formData.grupos && (
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={formData.override_categoria}
                          onChange={(e) => setFormData(prev => ({ ...prev, override_categoria: e.target.checked }))}
                          className="text-brand focus:text-brand"
                        />
                        <span>Fijar manualmente (Ignorar auto-asignación por edad)</span>
                      </label>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Los entrenadores pueden tener varias categorías asignadas.</p>
                {formData.rol === 'Futbolista' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Plan Financiero Asignado</label>
                    <select name="tipo_plan" value={formData.tipo_plan} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white cursor-pointer font-bold text-emerald-700">
                      {planes.map(plan => (
                        <option key={plan.nombre} value={plan.nombre}>
                          {plan.nombre} (${Number(plan.precio_base).toLocaleString('es-CO')})
                        </option>
                      ))}
                      {planes.length === 0 && <option value="Regular">Regular</option>}
                    </select>
                  </div>
                )}

                {formData.rol === 'Futbolista' && (
                  <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
                    <label className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                      📅 Fecha de Inscripción al Club
                    </label>
                    <p className="text-[10px] text-amber-600 font-medium mb-3">
                      Fecha en la que el deportista se vincula oficialmente al club. Por defecto: hoy.
                    </p>
                    <input
                      type="date"
                      name="fecha_ingreso"
                      value={formData.fecha_ingreso}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm bg-white cursor-pointer font-bold text-slate-700"
                    />
                  </div>
                )}
              </div>

              {/* Vincular Familia (Solo Entrenador/Director) */}
              {(formData.rol === 'Entrenador' || formData.rol === 'Director') && (
                <div className="md:col-span-2 bg-brand/10/50 border bg-brand/10 rounded-xl p-6 mt-4">
                  <h3 className="text-sm font-bold text-brand mb-4 flex items-center gap-2">
                    <Users className="text-brand" /> Vincular Familia (Jugadores a cargo)
                  </h3>
                  <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    {categorias.map(cat => (
                      <div key={cat.nombre}>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">{cat.nombre}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {todosLosJugadores
                            .filter(j => j.grupos === cat.nombre)
                            .map(jug => (
                              <label key={jug.id} className="flex items-center gap-2 p-2 rounded-xl border border-white bg-white/50 hover:bg-white hover:border-brand/40 transition-all cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={formData.hijos_config.includes(jug.id)}
                                  onChange={(e) => {
                                    const currentIds = (formData.hijos_config || '').split(',').map(id => id.trim()).filter(Boolean);
                                    let newIds;
                                    if (e.target.checked) {
                                      newIds = [...currentIds, jug.id];
                                    } else {
                                      newIds = currentIds.filter(id => id !== jug.id);
                                    }
                                    setFormData({ ...formData, hijos_config: newIds.join(',') });
                                  }}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-brand focus:text-brand"
                                />
                                <div className="overflow-hidden">
                                  <p className="text-[11px] font-bold text-slate-800 truncate leading-none mb-0.5">{jug.nombres}</p>
                                  <p className="text-[9px] text-slate-400 truncate leading-none">{jug.apellidos}</p>
                                </div>
                              </label>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Botonera de Envío */}
          <div className="pt-6 border-t border-slate-200 flex flex-col-reverse md:flex-row justify-end gap-4">
            <button 
              type="button" 
              onClick={() => router.back()}
              className="w-full md:w-auto px-6 py-3 border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={guardando}
              className="w-full md:w-auto bg-brand text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-md text-sm disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              {guardando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />}
              {guardando ? 'Registrando en BD...' : 'Guardar Jugador Oficial'}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
