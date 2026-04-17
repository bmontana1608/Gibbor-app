'use client';

// Forzando despliegue - Fix useEffect import
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, Users, Hospital, ShieldAlert, ArrowLeft, Trophy, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function NuevoMiembro() {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);

  useEffect(() => {
    async function cargarDatosInscripcion() {
      // Cargar categorías activas
      const { data: catData } = await supabase.from('categorias').select('nombre').eq('estado', 'Activo');
      if (catData) setCategorias(catData);

      // Cargar planes de pago dinámicos
      const { data: planesData } = await supabase.from('planes').select('nombre, precio_base').order('precio_base', { ascending: true });
      if (planesData) setPlanes(planesData);
    }
    cargarDatosInscripcion();
  }, []);

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
    estado_miembro: 'Activo'
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

    const { error } = await supabase
      .from('perfiles')
      .insert([formData]);

    setGuardando(false);

    if (error) {
      toast.error("Error al guardar en base de datos: " + error.message, { id: toastId });
      console.error(error);
    } else {
      toast.success("¡Jugador registrado exitosamente!", { id: toastId });
      router.push('/director/miembros');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      
      <button 
        onClick={() => router.back()} 
        className="mb-6 text-slate-500 hover:text-orange-600 flex items-center gap-2 transition-colors font-bold text-sm w-fit group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al Directorio
      </button>

      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Cabecera del formulario */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-white mb-1">Inscripción Oficial</h1>
            <p className="text-sm text-slate-400">Ingresa la información completa del nuevo jugador.</p>
          </div>
          <div className="hidden md:block w-32 h-32 bg-orange-500/10 rounded-full absolute -right-10 -top-10 blur-2xl"></div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-10">
          
          {/* 1. DATOS DEL JUGADOR */}
          <section>
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
              <User className="text-orange-500 w-5 h-5" /> Datos Personales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombres *</label>
                <input type="text" name="nombres" value={formData.nombres} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Apellidos *</label>
                <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Documento de Identidad *</label>
                <input type="text" name="documento_identidad" value={formData.documento_identidad} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha de Nacimiento *</label>
                <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleDateChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm cursor-pointer" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Teléfono Móvil / WhatsApp *</label>
                <div className="flex">
                  <span className="bg-slate-100 border border-slate-300 border-r-0 rounded-l-lg px-3 py-2.5 text-slate-500 text-sm font-medium">+57</span>
                  <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-r-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                <input type="email" name="email_contacto" value={formData.email_contacto} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dirección de Residencia</label>
                <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
              </div>
            </div>
          </section>

          {/* 2. ACUDIENTE (CONDICIONAL) */}
          {isMinor && (
            <section className="bg-orange-50/50 border border-orange-100 rounded-xl p-5 md:p-6 shadow-sm">
              <h2 className="text-lg font-bold text-orange-800 border-b border-orange-200/50 pb-3 mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-600" /> Datos del Acudiente
              </h2>
              <p className="text-xs text-orange-600 mb-5">Requerido porque el jugador es menor de edad.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-orange-800 uppercase tracking-wider mb-2">Nombre Completo *</label>
                  <input type="text" name="acudiente_nombre" value={formData.acudiente_nombre} onChange={handleChange} required className="w-full px-4 py-2.5 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-orange-800 uppercase tracking-wider mb-2">Identificación del Acudiente *</label>
                  <input type="text" name="acudiente_identificacion" value={formData.acudiente_identificacion} onChange={handleChange} required className="w-full px-4 py-2.5 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
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
                <select name="tipo_sangre" value={formData.tipo_sangre} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm bg-white cursor-pointer">
                  <option value="">Seleccionar...</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">EPS / Seguro *</label>
                <input type="text" name="eps" value={formData.eps} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Talla Uniforme</label>
                <select name="talla_uniforme" value={formData.talla_uniforme} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm bg-white cursor-pointer">
                  <option value="">Seleccionar...</option><option>6</option><option>8</option><option>10</option><option>12</option><option>14</option><option>16</option><option>S</option><option>M</option><option>L</option><option>XL</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Patologías o Alergias</label>
              <textarea name="patologias" value={formData.patologias} onChange={handleChange} placeholder="Asma, alergia a medicamentos, etc. (Deja en blanco si no aplica)" rows={2} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"></textarea>
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
                <select name="rol" value={formData.rol} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm bg-white cursor-pointer font-bold text-orange-600">
                  <option value="Futbolista">Futbolista</option>
                  <option value="Entrenador">Entrenador</option>
                  <option value="Director">Director</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categoría(s) / Grupo(s) Asignados</label>
                {formData.rol === 'Entrenador' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border border-orange-100 rounded-xl p-4 bg-orange-50/30">
                    {categorias.map(cat => (
                      <label key={cat.nombre} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer hover:text-orange-600 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={(formData.grupos || '').split(', ').includes(cat.nombre)}
                          onChange={(e) => {
                            const currentGroups = (formData.grupos || '').split(', ').filter(Boolean);
                            let newGroups;
                            if (e.target.checked) {
                              newGroups = [...currentGroups, cat.nombre];
                            } else {
                              newGroups = currentGroups.filter(g => g !== cat.nombre);
                            }
                            setFormData({ ...formData, grupos: newGroups.join(', ') });
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        {cat.nombre}
                      </label>
                    ))}
                    {categorias.length === 0 && <p className="text-[10px] text-slate-400 italic col-span-full">No hay categorías activas creadas.</p>}
                  </div>
                ) : (
                  <select name="grupos" value={formData.grupos} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm bg-white cursor-pointer font-bold">
                    <option value="">Sin categoría / Sin asignar</option>
                    {categorias.map(cat => (
                      <option key={cat.nombre} value={cat.nombre}>{cat.nombre}</option>
                    ))}
                  </select>
                )}
                <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Los entrenadores pueden tener varias categorías asignadas.</p>
              </div>
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
              className="w-full md:w-auto bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-md text-sm disabled:opacity-50 flex items-center justify-center gap-2 group"
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
