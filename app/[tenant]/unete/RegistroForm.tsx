'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  User, MapPin, ShieldCheck,
  HeartPulse, FileText, CheckCircle2, Loader2,
  ArrowRight, Target, AlertCircle, Smartphone
} from 'lucide-react';
import { toast } from 'sonner';

export default function RegistroForm({ club, categoriasIniciales }: { club: any, categoriasIniciales: any[] }) {
  const [isMinor, setIsMinor] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [registroExitoso, setRegistroExitoso] = useState(false);
  const [categorias, setCategorias] = useState<any[]>(categoriasIniciales);
  const [categoriaAsignada, setCategoriaAsignada] = useState<any>(null);

  const [formData, setFormData] = useState({
    nombres: '', apellidos: '', documento_identidad: '', fecha_nacimiento: '',
    telefono: '', email_contacto: '', direccion: '',
    acudiente_nombre: '', acudiente_identificacion: '',
    tipo_sangre: '', eps: '', talla_uniforme: '', patologias: '',
    emergencia_nombre: '', emergencia_telefono: '', grupos: '',
    rol: 'Futbolista', estado_miembro: 'Pendiente', estado_pago: 'Pendiente', tipo_plan: 'Regular',
    doc_jugador_url: '', doc_eps_url: '', doc_acudiente_url: ''
  });

  const [archivos, setArchivos] = useState<{ jugador: File | null; eps: File | null; acudiente: File | null }>
    ({ jugador: null, eps: null, acudiente: null });

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
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
      setIsMinor(age < 18);
      const birthYear = birthDate.getFullYear();
      const match = categorias.find(cat => {
        if (cat.edad_minima > 100) {
          return birthYear >= cat.edad_minima && birthYear <= cat.edad_maxima;
        }
        return age >= (cat.edad_minima || 0) && age <= (cat.edad_maxima || 99);
      });
      if (match) {
        setCategoriaAsignada(match);
        setFormData(prev => ({ ...prev, grupos: match.nombre }));
        toast.success(`Asignado a: ${match.nombre}`, { description: `Edad: ${age} años` });
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
    if (!club?.id) return toast.error('Club no identificado. Verifica el enlace.');
    setGuardando(true);

    try {
      const currentFormData = { ...formData };

      const uploadFile = async (file: File, folder: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('documentos').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(filePath);
        return publicUrl;
      };

      if (archivos.jugador)   currentFormData.doc_jugador_url   = await uploadFile(archivos.jugador,   'jugadores');
      if (archivos.eps)       currentFormData.doc_eps_url        = await uploadFile(archivos.eps,        'eps');
      if (archivos.acudiente) currentFormData.doc_acudiente_url  = await uploadFile(archivos.acudiente,  'acudientes');

      // Insertar perfil CON el club_id del club detectado
      const { error } = await supabase.from('perfiles').insert([{
        ...currentFormData,
        club_id: club.id,
        estado_miembro: 'Pendiente',
      }]);

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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white border border-slate-100 p-10 md:p-16 rounded-[3rem] max-w-lg w-full shadow-xl">
          <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4 uppercase italic tracking-tighter">¡Registro Recibido!</h1>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed">
            Los datos de <strong className="font-black" style={{ color: club.color_primario }}>{formData.nombres}</strong> han sido enviados a{' '}
            <strong>{club?.nombre}</strong>. El director revisará la solicitud y te contactará pronto.
          </p>
          <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl text-xs tracking-widest uppercase flex items-center justify-center gap-3">
            Nuevo Registro <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const color = club?.color_primario || '#06b6d4';

  return (
    <div className="min-h-screen bg-slate-200 text-slate-800 py-16 px-4 font-sans tracking-tight relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ background: `${color}15` }} />

      {/* Header del Club */}
      <div className="max-w-3xl mx-auto text-center mb-16 relative z-10">
        <div className="flex justify-center mb-8">
          <div className="relative p-3 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100">
            {club?.logo_url
              ? <img src={club.logo_url} alt={club.nombre} className="h-24 md:h-28 object-contain" />
              : <div className="h-24 w-24 flex items-center justify-center text-5xl font-black text-slate-700">{club?.nombre?.charAt(0)}</div>
            }
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tighter uppercase italic">
          <span style={{ color }}>Solicitud</span> de Ingreso
        </h1>
        <p className="text-slate-500 font-bold max-w-md mx-auto border-t-2 pt-4" style={{ borderColor: `${color}40` }}>
          Inicia tu camino en <strong>{club?.nombre}</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-slate-100 border border-slate-200 rounded-[3rem] p-8 md:p-14 shadow-xl space-y-16 relative z-10">

        {/* DATOS DEL JUGADOR */}
        <section>
          <div className="flex items-center gap-5 mb-12">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center border-b-4" style={{ borderColor: color }}>
              <User className="w-7 h-7" style={{ color }} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Datos del Jugador</h2>
              <div className="h-1 w-20 mt-1 rounded-full" style={{ background: color }} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-[2.5rem] border border-slate-200/50 p-8 md:p-12 shadow-sm">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Nombres Completos *</label>
              <input type="text" name="nombres" value={formData.nombres} onChange={handleChange} placeholder="Ej: Juan Andrés" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none font-bold text-slate-700 shadow-sm" required />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Apellidos *</label>
              <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} placeholder="Ej: Pérez Rodríguez" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none font-bold text-slate-700 shadow-sm" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Documento Identidad *</label>
              <input type="text" name="documento_identidad" value={formData.documento_identidad} onChange={handleChange} placeholder="Número C.C / T.I" className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 outline-none font-bold text-slate-700" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha Nacimiento *</label>
              <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleDateChange} className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 outline-none font-bold text-slate-500" required />
            </div>

            {categoriaAsignada ? (
              <div className="md:col-span-2 p-5 rounded-2xl border-2 animate-in zoom-in duration-300" style={{ backgroundColor: `${color}10`, borderColor: color }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color }}>Categoría Asignada por Sistema</p>
                <div className="flex items-center justify-between">
                  <h4 className="text-xl font-black text-slate-900 uppercase italic">{categoriaAsignada.nombre}</h4>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border" style={{ borderColor: `${color}40` }}>
                    <Target className="w-3.5 h-3.5" style={{ color }} /> {categoriaAsignada.nivel}
                  </div>
                </div>
              </div>
            ) : formData.fecha_nacimiento && (
              <div className="md:col-span-2 bg-slate-100 p-5 rounded-2xl border-2 border-dashed border-slate-300 flex items-center gap-4">
                <AlertCircle className="w-6 h-6 text-slate-400 flex-shrink-0" />
                <p className="text-xs font-bold text-slate-500">No se encontró categoría para esta edad. El director asignará una manualmente.</p>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">WhatsApp *</label>
              <div className="flex">
                <span className="bg-slate-100 border border-slate-200 border-r-0 rounded-l-2xl px-4 py-4 text-slate-400 font-bold">+57</span>
                <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="300 000 0000" className="w-full bg-white border border-slate-100 rounded-r-2xl px-5 py-4 outline-none font-bold text-slate-700" required />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Correo Electrónico (Opcional)</label>
              <input type="email" name="email_contacto" value={formData.email_contacto} onChange={handleChange} placeholder="ejemplo@gmail.com" className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 outline-none font-bold text-slate-700" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><MapPin className="w-3 h-3" /> Dirección</label>
              <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} placeholder="Barrio y Dirección" className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 outline-none font-bold text-slate-700" />
            </div>
          </div>
        </section>

        {/* REPRESENTANTE LEGAL (menores) */}
        {isMinor && (
          <section className="bg-slate-900 border-l-8 rounded-[2.5rem] p-8 md:p-12 shadow-2xl" style={{ borderColor: color }}>
            <div className="flex items-center gap-5 mb-10">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-7 h-7" style={{ color: `${color}66` }} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Representante Legal</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Requerido para menores</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">Nombre Representante *</label>
                <input type="text" name="acudiente_nombre" value={formData.acudiente_nombre} onChange={handleChange} placeholder="Padre o Madre" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none font-bold text-white" required />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">Documento Identidad *</label>
                <input type="text" name="acudiente_identificacion" value={formData.acudiente_identificacion} onChange={handleChange} placeholder="Número de C.C." className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none font-bold text-white" required />
              </div>
            </div>
          </section>
        )}

        {/* FICHA MÉDICA */}
        <section>
          <div className="flex items-center gap-5 mb-12">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center border-b-4 border-slate-300">
              <HeartPulse className="w-7 h-7" style={{ color }} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Ficha Médica</h2>
              <div className="h-1 w-20 bg-slate-300 mt-1 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-white rounded-[2.5rem] border border-slate-200/50 p-8 md:p-12 shadow-sm mb-10">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Tipo de Sangre *</label>
              <select name="tipo_sangre" value={formData.tipo_sangre} onChange={handleChange} className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none font-bold text-slate-700" required>
                <option value="">Selección...</option>
                {['O+','O-','A+','A-','B+','B-','AB+','AB-'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">EPS o Seguro *</label>
              <input type="text" name="eps" value={formData.eps} onChange={handleChange} placeholder="Nombre EPS" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none font-bold text-slate-700" required />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Talla Uniforme</label>
              <select name="talla_uniforme" value={formData.talla_uniforme} onChange={handleChange} className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none font-bold text-slate-700">
                <option value="">S/M/L/6-16</option>
                {['6','8','10','12','14','16','S','M','L','XL'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Patologías o Alergias</label>
              <textarea name="patologias" value={formData.patologias} onChange={handleChange} placeholder="Asma, alergias, condiciones especiales... (Opcional)" rows={3} className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none font-bold text-slate-700 resize-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 rounded-[2.5rem] p-8 md:p-12 shadow-lg" style={{ backgroundColor: color }}>
            <div className="md:col-span-2 flex items-center gap-4 mb-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <Smartphone className="w-5 h-5" style={{ color }} />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Contacto de Emergencia</h3>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: `${color}66` }}>Nombre Completo *</label>
              <input type="text" name="emergencia_nombre" value={formData.emergencia_nombre} onChange={handleChange} className="w-full bg-white/20 border border-white/20 rounded-2xl px-6 py-4 focus:bg-white outline-none font-bold text-white focus:text-slate-900" required placeholder="Nombre de contacto" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: `${color}66` }}>Teléfono Urgencias *</label>
              <input type="tel" name="emergencia_telefono" value={formData.emergencia_telefono} onChange={handleChange} className="w-full bg-white/20 border border-white/20 rounded-2xl px-6 py-4 focus:bg-white outline-none font-bold text-white focus:text-slate-900" required placeholder="Nro de celular" />
            </div>
          </div>
        </section>

        {/* DOCUMENTACIÓN */}
        <section>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center border" style={{ backgroundColor: `${color}10`, borderColor: `${color}66` }}>
              <FileText className="w-6 h-6" style={{ color }} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Documentación</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white rounded-[2.5rem] border border-slate-200/50 p-6 md:p-10 shadow-sm">
            {[
              { key: 'jugador', label: 'Doc. Identidad Jugador', sub: 'T.I / C.C', icon: <FileText className="w-5 h-5 text-slate-400 group-hover:text-current" />, col: '' },
              { key: 'eps',     label: 'Registro EPS',           sub: 'Carné o Certificado', icon: <ShieldCheck className="w-5 h-5 text-slate-400 group-hover:text-current" />, col: '' },
              { key: 'acudiente', label: 'Doc. Identidad Acudiente', sub: 'Cédula del representante', icon: <User className="w-5 h-5 text-slate-400 group-hover:text-current" />, col: 'md:col-span-2' },
            ].map(({ key, label, sub, icon, col }) => (
              <div key={key} className={`${col} group relative bg-white border border-slate-200 rounded-[2rem] p-8 text-center hover:border-slate-300 transition-all cursor-pointer shadow-sm`} style={{ '--hover-bg': `${color}10` } as any}>
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors group-hover:bg-white" style={{ color }}>{icon}</div>
                <p className="text-slate-900 font-black uppercase italic tracking-tighter text-sm">{label}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {(archivos as any)[key] ? <span className="text-emerald-500">✓ {(archivos as any)[key].name}</span> : sub}
                </p>
                <input type="file" accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => setArchivos(prev => ({ ...prev, [key]: e.target.files?.[0] || null }))}
                  className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            ))}
          </div>
        </section>

        {/* ENVIAR */}
        <div className="pt-8">
          <button type="submit" disabled={guardando} className="group relative w-full bg-slate-900 text-white font-black text-xl py-6 rounded-[2rem] transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 overflow-hidden">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(to right, ${color}, ${color}99)` }} />
            <span className="relative z-10 uppercase italic tracking-tighter">
              {guardando ? 'Procesando Envío...' : 'Enviar Solicitud de Inscripción'}
            </span>
            {guardando ? <Loader2 className="w-6 h-6 animate-spin relative z-10" /> : <ArrowRight className="w-6 h-6 relative z-10 group-hover:translate-x-2 transition-transform" />}
          </button>
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-8 opacity-50">
            Portal Oficial de Miembros © 2026
          </p>
        </div>
      </form>

      <style jsx>{`
        .group:hover {
          background-color: var(--hover-bg);
        }
      `}</style>
    </div>
  );
}
