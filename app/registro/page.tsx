'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Mail, Smartphone, MapPin, ShieldCheck, HeartPulse, FileText, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

export default function AutoRegistroPublico() {
  const [isMinor, setIsMinor] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [registroExitoso, setRegistroExitoso] = useState(false);

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

    // DATOS DE CONTROL INTERNO
    rol: 'Futbolista',
    estado_miembro: 'Pendiente',
    estado_pago: 'Pendiente',
    tipo_plan: 'Regular'
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
    setGuardando(true);

    const { error } = await supabase.from('perfiles').insert([formData]);

    setGuardando(false);

    if (error) {
      alert('Hubo un error al enviar el registro: ' + error.message);
    } else {
      setRegistroExitoso(true); 
    }
  };

  if (registroExitoso) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center font-sans tracking-tight transition-all animate-in fade-in duration-700">
        <div className="bg-white border border-slate-100 p-10 md:p-16 rounded-[3rem] max-w-lg w-full shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl"></div>
          
          <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 mb-4 uppercase italic tracking-tighter">¡Registro Recibido!</h1>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed px-4">
            Los datos de <strong className="text-orange-600 font-black">{formData.nombres}</strong> han sido enviados correctamente. El Director de la academia revisará la solicitud y te contactará pronto.
          </p>
          
          <button 
            onClick={() => window.location.reload()} 
            className="group w-full bg-slate-900 text-white font-black py-4 rounded-2xl transition-all shadow-xl hover:shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-3 text-xs tracking-widest uppercase"
          >
            Nuevo Registro <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-16 px-4 font-sans tracking-tight">
      {/* HEADER SECTION */}
      <div className="max-w-3xl mx-auto text-center mb-16 animate-in slide-in-from-top-10 duration-700">
        <div className="flex justify-center mb-6">
          <div className="relative p-2 bg-white rounded-[2rem] shadow-xl shadow-orange-500/5">
            <img 
              src="https://i.postimg.cc/PNGqMH1m/escudo-gibbor.png" 
              alt="Gibbor FC" 
              className="h-20 md:h-24 object-contain" 
            />
          </div>
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tighter uppercase italic">Formulario de Inscripción</h1>
        <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">Únete a la academia más grande de la región. Completa tus datos para iniciar el proceso.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-white border border-slate-100 rounded-[3rem] p-8 md:p-14 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] space-y-14 animate-in fade-in zoom-in duration-500">
        
        {/* 1. Datos del Miembro */}
        <section>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100">
              <User className="text-orange-500 w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Datos del Jugador</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="group">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nombres Completos *</label>
              <input type="text" name="nombres" value={formData.nombres} onChange={handleChange} placeholder="Ej: Juan Andrés" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Apellidos *</label>
              <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} placeholder="Ej: Pérez Rodríguez" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Documento Identidad *</label>
              <input type="text" name="documento_identidad" value={formData.documento_identidad} onChange={handleChange} placeholder="C.C / T.I / R.C" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Fecha Nacimiento *</label>
              <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleDateChange} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-bold text-slate-500" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Número de WhatsApp *</label>
              <div className="flex">
                <span className="bg-slate-100 border-none rounded-l-2xl px-4 py-4 text-slate-400 font-bold flex items-center">+57</span>
                <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="300 000 0000" className="w-full bg-slate-50 border-none rounded-r-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300" required />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Correo Electrónico</label>
              <input type="email" name="email_contacto" value={formData.email_contacto} onChange={handleChange} placeholder="ejemplo@gmail.com" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2"><MapPin className="w-3 h-3" /> Dirección de Residencia</label>
              <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} placeholder="Barrio y Dirección completa" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300" />
            </div>
          </div>
        </section>

        {/* 2. Acudiente (Condicional con acento visual) */}
        {isMinor && (
          <section className="bg-orange-50/50 border border-orange-100 rounded-[2rem] p-8 md:p-10 animate-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <ShieldCheck className="text-orange-500 w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Responsable Legal</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2 ml-1">Nombre Representante *</label>
                <input type="text" name="acudiente_nombre" value={formData.acudiente_nombre} onChange={handleChange} placeholder="Padre o Madre" className="w-full bg-white border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-bold text-slate-700 shadow-sm" required />
              </div>
              <div>
                <label className="block text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2 ml-1">Documento Identidad *</label>
                <input type="text" name="acudiente_identificacion" value={formData.acudiente_identificacion} onChange={handleChange} placeholder="Número de C.C." className="w-full bg-white border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-bold text-slate-700 shadow-sm" required />
              </div>
            </div>
          </section>
        )}

        {/* 3. Información Médica */}
        <section>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100">
              <HeartPulse className="text-orange-500 w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Información Médica</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tipo de Sangre *</label>
              <select name="tipo_sangre" value={formData.tipo_sangre} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 outline-none font-bold text-slate-700 appearance-none shadow-sm cursor-pointer" required>
                <option value="">Selección...</option><option>O+</option><option>O-</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">EPS o Seguro *</label>
              <input type="text" name="eps" value={formData.eps} onChange={handleChange} placeholder="Nombre EPS" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-bold text-slate-700 shadow-sm" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Talla Uniforme</label>
              <select name="talla_uniforme" value={formData.talla_uniforme} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 outline-none font-bold text-slate-700 appearance-none shadow-sm cursor-pointer">
                <option value="">S/M/L/6-16</option><option>6</option><option>8</option><option>10</option><option>12</option><option>14</option><option>16</option><option>S</option><option>M</option><option>L</option><option>XL</option>
              </select>
            </div>
          </div>
          
          <div className="mb-8">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Patologías o Alergias</label>
            <textarea name="patologias" value={formData.patologias} onChange={handleChange} placeholder="Asma, alergias, condiciones especiales... (Opcional)" rows={2} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-bold text-slate-700 shadow-sm resize-none"></textarea>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 p-8 rounded-[2rem] shadow-2xl shadow-slate-900/10">
            <div className="md:col-span-2 flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-4 h-4 text-orange-500" />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">En caso de emergencia avisar a:</h3>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nombre Completo *</label>
              <input type="text" name="emergencia_nombre" value={formData.emergencia_nombre} onChange={handleChange} className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all font-bold text-white text-sm" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Teléfono Urgencias *</label>
              <input type="tel" name="emergencia_telefono" value={formData.emergencia_telefono} onChange={handleChange} className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all font-bold text-white text-sm" required />
            </div>
          </div>
        </section>

        {/* 4. Documentación (Visual/Mockup) */}
        <section>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100">
              <FileText className="text-orange-500 w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Documentación</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="group relative bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-8 text-center hover:border-orange-500 hover:bg-orange-50/30 transition-all cursor-pointer">
              <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">📸</span>
              <p className="text-slate-900 font-black uppercase italic tracking-tighter text-sm">Foto Documento</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Lado Cara (Jugador)</p>
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            <div className="group relative bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-8 text-center hover:border-orange-500 hover:bg-orange-50/30 transition-all cursor-pointer">
              <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">🏥</span>
              <p className="text-slate-900 font-black uppercase italic tracking-tighter text-sm">Registro EPS</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Carne o Certificado</p>
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
          </div>
        </section>

        {/* SUBMIT BUTTON */}
        <div className="pt-8">
          <button 
            type="submit" 
            disabled={guardando} 
            className="group relative w-full bg-slate-900 text-white font-black text-xl py-6 rounded-[2rem] transition-all shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] hover:shadow-orange-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 overflow-hidden"
          >
             {/* Effect */}
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