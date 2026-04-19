'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  User, Mail, Smartphone, MapPin, ShieldCheck, 
  HeartPulse, FileText, CheckCircle2, Loader2, 
  ArrowRight, Sparkles, Target
} from 'lucide-react';
import { toast } from 'sonner';

export default function AutoRegistroPublico() {
  const [isMinor, setIsMinor] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [registroExitoso, setRegistroExitoso] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [categoriaAsignada, setCategoriaAsignada] = useState<any>(null);

  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    documento_identidad: '',
    fecha_nacimiento: '',
    telefono: '',
    email_contacto: '',
    direccion: '',
    acudiente_nombre: '',
    acudiente_identificacion: '',
    tipo_sangre: '',
    eps: '',
    talla_uniforme: '',
    patologias: '',
    emergencia_nombre: '',
    emergencia_telefono: '',
    grupos: '', // Campo para la categoría automática

    // DATOS DE CONTROL INTERNO
    rol: 'Futbolista',
    estado_miembro: 'Pendiente',
    estado_pago: 'Pendiente',
    tipo_plan: 'Regular',
    
    // CAMPOS PARA ALMACENAR URLS DE DOCUMENTOS
    doc_jugador_url: '',
    doc_eps_url: '',
    doc_acudiente_url: ''
  });
  
  // Estado para los archivos físicos antes de subir
  const [archivos, setArchivos] = useState<{
    jugador: File | null;
    eps: File | null;
    acudiente: File | null;
  }>({ jugador: null, eps: null, acudiente: null });

  // Cargar categorías al inicio
  useEffect(() => {
    async function cargarCategorias() {
      const { data } = await supabase.from('categorias').select('*').eq('estado', 'Activo');
      if (data) setCategorias(data);
    }
    cargarCategorias();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    setFormData(prev => ({ ...prev, fecha_nacimiento: dateValue }));
    
    if (dateValue) {
      const birthDate = new Date(dateValue);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      setIsMinor(age < 18);

      // Lógica Inteligente de Asignación de Categoría
      const match = categorias.find(cat => 
        age >= (cat.edad_minima || 0) && age <= (cat.edad_maxima || 99)
      );

      if (match) {
        setCategoriaAsignada(match);
        setFormData(prev => ({ ...prev, grupos: match.nombre }));
        toast.success(`Asignado automáticamente a: ${match.nombre}`, {
          description: `Basado en la edad (${age} años)`
        });
      } else {
        setCategoriaAsignada(null);
        setFormData(prev => ({ ...prev, grupos: '' }));
      }
    } else {
      setIsMinor(false);
      setCategoriaAsignada(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const currentFormData = { ...formData };
      
      // 1. SUBIR ARCHIVOS SI EXISTEN
      const uploadFile = async (file: File, folder: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(filePath, file);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('documentos')
          .getPublicUrl(filePath);
          
        return publicUrl;
      };

      if (archivos.jugador) currentFormData.doc_jugador_url = await uploadFile(archivos.jugador, 'jugadores');
      if (archivos.eps) currentFormData.doc_eps_url = await uploadFile(archivos.eps, 'eps');
      if (archivos.acudiente) currentFormData.doc_acudiente_url = await uploadFile(archivos.acudiente, 'acudientes');

      // 2. INSERTAR PERFIL CON URLS
      const { error } = await supabase.from('perfiles').insert([currentFormData]);
      if (error) throw error;
      
      setRegistroExitoso(true);
    } catch (error: any) {
      toast.error('Error al procesar el registro: ' + (error.message || 'Error desconocido'));
    } finally {
      setGuardando(false);
    }
  };

  if (registroExitoso) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center font-sans tracking-tight transition-all animate-in fade-in duration-700">
        <div className="bg-white border border-slate-100 p-10 md:p-16 rounded-[3rem] max-w-lg w-full shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl"></div>
          <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4 uppercase italic tracking-tighter">Registro Recibido</h1>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed px-4">
            Los datos de <strong className="text-orange-600 font-black">{formData.nombres}</strong> han sido enviados correctamente. {categoriaAsignada && <span>Asignado preliminarmente a <b>{categoriaAsignada.nombre}</b>. </span>}El Director de la academia revisará la solicitud y te contactará pronto.
          </p>
          <button onClick={() => window.location.reload()} className="group w-full bg-slate-900 text-white font-black py-4 rounded-2xl transition-all shadow-xl hover:shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-3 text-xs tracking-widest uppercase">
            Nuevo Registro <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 py-16 px-4 font-sans tracking-tight relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-slate-900/5 rounded-full blur-[120px]"></div>

      <div className="max-w-3xl mx-auto text-center mb-16 animate-in slide-in-from-top-10 duration-700 relative z-10">
        <div className="flex justify-center mb-8">
          <div className="relative p-3 bg-white rounded-[2.5rem] shadow-2xl shadow-orange-500/10 border border-slate-100 ring-4 ring-orange-500/5">
            <img src="https://i.postimg.cc/PNGqMH1m/escudo-gibbor.png" alt="Gibbor FC" className="h-24 md:h-28 object-contain" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tighter uppercase italic">
          <span className="text-orange-500">Solicitud</span> de Ingreso
        </h1>
        <p className="text-slate-500 font-bold max-w-md mx-auto leading-relaxed border-t-2 border-orange-500/20 pt-4">
          Inicia tu camino a la élite deportiva con Gibbor FC.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-slate-50 border border-slate-200 rounded-[3rem] p-8 md:p-14 shadow-[0_40px_100px_-15px_rgba(15,23,42,0.12)] space-y-16 animate-in fade-in zoom-in duration-500 relative z-10">
        
        <section>
          <div className="flex items-center gap-5 mb-12">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center border-b-4 border-orange-500 shadow-xl">
              <User className="text-orange-500 w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Datos del Jugador</h2>
              <div className="h-1 w-20 bg-orange-500 mt-1 rounded-full"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-[2.5rem] border border-slate-200/50 p-8 md:p-12 shadow-sm">
            <div className="group">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Nombres Completos *</label>
              <input type="text" name="nombres" value={formData.nombres} onChange={handleChange} placeholder="Ej: Juan Andrés" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-slate-700 shadow-sm" required />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Apellidos *</label>
              <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} placeholder="Ej: Pérez Rodríguez" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-slate-700 shadow-sm" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Documento Identidad *</label>
              <input type="text" name="documento_identidad" value={formData.documento_identidad} onChange={handleChange} placeholder="Número C.C / T.I" className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/10 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-200" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Fecha Nacimiento *</label>
              <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleDateChange} className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/10 outline-none transition-all font-bold text-slate-500" required />
            </div>
            
            {/* CATEGORÍA AUTOMÁTICA VISUAL */}
            {categoriaAsignada ? (
              <div className="md:col-span-2 bg-orange-100 dark:bg-orange-500/10 p-5 rounded-2xl border-2 border-orange-500 shadow-lg shadow-orange-500/10 animate-in zoom-in duration-300">
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                  Categoría Asignada por Sistema
                </p>
                <div className="flex items-center justify-between">
                  <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{categoriaAsignada.nombre}</h4>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-orange-200">
                    <Target className="w-3.5 h-3.5 text-orange-500" /> {categoriaAsignada.nivel}
                  </div>
                </div>
              </div>
            ) : formData.fecha_nacimiento && (
              <div className="md:col-span-2 bg-slate-100 p-5 rounded-2xl border-2 border-dashed border-slate-300 flex items-center gap-4">
                 <AlertCircle className="w-6 h-6 text-slate-400" />
                 <p className="text-xs font-bold text-slate-500 leading-tight">No se encontró una categoría activa para esta edad. El director asignará una manualmente tras revisar el registro.</p>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Número de WhatsApp *</label>
              <div className="flex">
                <span className="bg-slate-100 border border-slate-200 border-r-0 rounded-l-2xl px-4 py-4 text-slate-400 font-bold flex items-center">+57</span>
                <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="300 000 0000" className="w-full bg-white border border-slate-100 rounded-r-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/10 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-200" required />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Correo Electrónico (Opcional)</label>
              <input type="email" name="email_contacto" value={formData.email_contacto} onChange={handleChange} placeholder="ejemplo@gmail.com" className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/10 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-200" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2"><MapPin className="w-3 h-3" /> Dirección de Residencia</label>
              <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} placeholder="Barrio y Dirección" className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/10 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-200" />
            </div>
          </div>
        </section>

        {isMinor && (
          <section className="bg-slate-900 border-l-8 border-orange-500 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group animate-in slide-in-from-right-10 duration-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-3xl rounded-full group-hover:bg-orange-500/10 transition-colors"></div>
            <div className="flex items-center gap-5 mb-10 relative z-10">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                <ShieldCheck className="text-orange-400 w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Representante Legal</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Requerido para menores</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Nombre Representante *</label>
                <input type="text" name="acudiente_nombre" value={formData.acudiente_nombre} onChange={handleChange} placeholder="Padre o Madre" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-white shadow-sm" required />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Documento Identidad *</label>
                <input type="text" name="acudiente_identificacion" value={formData.acudiente_identificacion} onChange={handleChange} placeholder="Número de C.C." className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-white shadow-sm" required />
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center gap-5 mb-12">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center border-b-4 border-slate-300 shadow-sm">
              <HeartPulse className="text-orange-500 w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Ficha Médica</h2>
              <div className="h-1 w-20 bg-slate-300 mt-1 rounded-full"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-white rounded-[2.5rem] border border-slate-200/50 p-8 md:p-12 shadow-sm mb-10">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Tipo de Sangre *</label>
              <select name="tipo_sangre" value={formData.tipo_sangre} onChange={handleChange} className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none font-bold text-slate-700 appearance-none shadow-sm cursor-pointer focus:border-orange-500/30 transition-all" required>
                <option value="">Selección...</option><option>O+</option><option>O-</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">EPS o Seguro *</label>
              <input type="text" name="eps" value={formData.eps} onChange={handleChange} placeholder="Nombre EPS" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-slate-700 shadow-sm" required />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Talla Uniforme</label>
              <select name="talla_uniforme" value={formData.talla_uniforme} onChange={handleChange} className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none font-bold text-slate-700 appearance-none shadow-sm cursor-pointer focus:border-orange-500/30 transition-all">
                <option value="">S/M/L/6-16</option><option>6</option><option>8</option><option>10</option><option>12</option><option>14</option><option>16</option><option>S</option><option>M</option><option>L</option><option>XL</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Patologías o Alergias</label>
              <textarea name="patologias" value={formData.patologias} onChange={handleChange} placeholder="Asma, alergias, condiciones especiales... (Opcional)" rows={3} className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-slate-700 shadow-sm resize-none"></textarea>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-orange-500 rounded-[2.5rem] p-8 md:p-12 shadow-[0_20px_40px_-10px_rgba(249,115,22,0.3)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-slate-900 opacity-0 group-hover:opacity-5 transition-opacity"></div>
            <div className="md:col-span-2 flex items-center gap-4 mb-3 relative z-10">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <Smartphone className="text-orange-600 w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 italic">
                Contacto de Emergencia
              </h3>
            </div>
            <div className="relative z-10">
              <label className="block text-[10px] font-black text-orange-900/60 uppercase tracking-widest mb-3">Nombre Completo *</label>
              <input type="text" name="emergencia_nombre" value={formData.emergencia_nombre} onChange={handleChange} className="w-full bg-white/20 border-white/20 border rounded-2xl px-6 py-4 focus:bg-white outline-none transition-all font-bold text-white focus:text-slate-900 text-sm placeholder:text-orange-100/50" required placeholder="Nombre de contacto" />
            </div>
            <div className="relative z-10">
              <label className="block text-[10px] font-black text-orange-900/60 uppercase tracking-widest mb-3">Teléfono Urgencias *</label>
              <input type="tel" name="emergencia_telefono" value={formData.emergencia_telefono} onChange={handleChange} className="w-full bg-white/20 border-white/20 border rounded-2xl px-6 py-4 focus:bg-white outline-none transition-all font-bold text-white focus:text-slate-900 text-sm placeholder:text-orange-100/50" required placeholder="Nro de celular" />
            </div>
          </div>
        </section>

        <section className="relative z-10">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-orange-100/50 rounded-2xl flex items-center justify-center border border-orange-200">
              <FileText className="text-orange-600 w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Documentación</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white rounded-[2.5rem] border border-slate-200/50 p-6 md:p-10 shadow-sm">
            <div className="group relative bg-white border border-slate-200 rounded-[2rem] p-8 text-center hover:border-orange-500/50 hover:bg-orange-50 transition-all cursor-pointer shadow-sm">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-100 transition-colors">
                <FileText className="w-5 h-5 text-slate-400 group-hover:text-orange-600" />
              </div>
              <p className="text-slate-900 font-black uppercase italic tracking-tighter text-sm">Doc. Identidad <span className="text-orange-500">Jugador</span></p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                {archivos.jugador ? <span className="text-emerald-500">✓ {archivos.jugador.name}</span> : 'Foto, PDF o Word (T.I / C.C)'}
              </p>
              <input 
                type="file" 
                accept="image/*,.pdf,.doc,.docx" 
                onChange={(e) => setArchivos(prev => ({ ...prev, jugador: e.target.files?.[0] || null }))}
                className="absolute inset-0 opacity-0 cursor-pointer" 
              />
            </div>
            <div className="group relative bg-white border border-slate-200 rounded-[2rem] p-8 text-center hover:border-orange-500/50 hover:bg-orange-50 transition-all cursor-pointer shadow-sm">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-100 transition-colors">
                <ShieldCheck className="w-5 h-5 text-slate-400 group-hover:text-orange-600" />
              </div>
              <p className="text-slate-900 font-black uppercase italic tracking-tighter text-sm">Registro <span className="text-orange-500">EPS</span></p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                {archivos.eps ? <span className="text-emerald-500">✓ {archivos.eps.name}</span> : 'Carne o Certificado (Imagen/PDF)'}
              </p>
              <input 
                type="file" 
                accept="image/*,.pdf,.doc,.docx" 
                onChange={(e) => setArchivos(prev => ({ ...prev, eps: e.target.files?.[0] || null }))}
                className="absolute inset-0 opacity-0 cursor-pointer" 
              />
            </div>
            <div className="md:col-span-2 group relative bg-white border border-slate-200 rounded-[2rem] p-8 text-center hover:border-orange-500/50 hover:bg-orange-50 transition-all cursor-pointer shadow-sm">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-100 transition-colors">
                <User className="w-5 h-5 text-slate-400 group-hover:text-orange-600" />
              </div>
              <p className="text-slate-900 font-black uppercase italic tracking-tighter text-sm">Doc. Identidad <span className="text-orange-500">Acudiente</span></p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                {archivos.acudiente ? <span className="text-emerald-500">✓ {archivos.acudiente.name}</span> : 'Foto, PDF o Word de la Cédula'}
              </p>
              <input 
                type="file" 
                accept="image/*,.pdf,.doc,.docx" 
                onChange={(e) => setArchivos(prev => ({ ...prev, acudiente: e.target.files?.[0] || null }))}
                className="absolute inset-0 opacity-0 cursor-pointer" 
              />
            </div>
          </div>
        </section>

        <div className="pt-8">
          <button 
            type="submit" 
            disabled={guardando} 
            className="group relative w-full bg-slate-900 text-white font-black text-xl py-6 rounded-[2rem] transition-all shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] hover:shadow-orange-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <span className="relative z-10 uppercase italic tracking-tighter">
              {guardando ? 'Procesando Envío...' : 'Enviar Solicitud de Inscripción'}
            </span>
            {guardando ? <Loader2 className="w-6 h-6 animate-spin relative z-10" /> : <ArrowRight className="w-6 h-6 relative z-10 group-hover:translate-x-2 transition-transform" /> }
          </button>
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-8 opacity-50">
            Powered by Gibbor Stats Lab © 2026
          </p>
        </div>
      </form>
    </div>
  );
}

// Icono extra faltante en la importación inicial
function AlertCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}