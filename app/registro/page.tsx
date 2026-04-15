'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

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
    estado_miembro: 'Pendiente', // <--- LA MAGIA: Entran como pendientes de aprobación
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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-zinc-900 border border-zinc-800 p-8 md:p-12 rounded-3xl max-w-lg w-full shadow-2xl">
          <span className="text-6xl mb-6 block">⏳</span>
          <h1 className="text-3xl font-bold text-white mb-4">¡Solicitud en Revisión!</h1>
          <p className="text-zinc-400 mb-8">
            Los datos de <strong className="text-orange-500">{formData.nombres}</strong> han sido enviados con éxito. Nuestro Director revisará la solicitud y la aprobará en breve.
          </p>
          <button onClick={() => window.location.reload()} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors border border-zinc-700">
            Registrar a otro jugador
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 py-10 px-4">
      <div className="max-w-3xl mx-auto text-center mb-10">
        <div className="flex justify-center mb-4">
          <img src="https://i.postimg.cc/PNGqMH1m/escudo-gibbor.png" alt="Gibbor FC" className="h-16 md:h-20 drop-shadow-lg transition-all" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Inscripción Oficial</h1>
        <p className="text-zinc-400">Completa el formulario para unirte a la Escuela de Formación Deportiva Gibbor.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-10 shadow-2xl space-y-12">
        {/* 1. Datos del Miembro */}
        <section>
          <h2 className="text-xl font-bold text-orange-500 border-b border-zinc-800 pb-3 mb-6 flex items-center gap-2">👤 Datos del Jugador</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><label className="block text-sm font-medium text-zinc-400 mb-1">Nombres *</label><input type="text" name="nombres" value={formData.nombres} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all" required /></div>
            <div><label className="block text-sm font-medium text-zinc-400 mb-1">Apellidos *</label><input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all" required /></div>
            <div><label className="block text-sm font-medium text-zinc-400 mb-1">Número de Identidad *</label><input type="text" name="documento_identidad" value={formData.documento_identidad} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all" required /></div>
            <div><label className="block text-sm font-medium text-zinc-400 mb-1">Fecha de Nacimiento *</label><input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleDateChange} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all text-zinc-400" required /></div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Teléfono Móvil *</label>
              <div className="flex">
                <span className="bg-zinc-800 border border-zinc-700 border-r-0 rounded-l-xl px-4 py-3 text-zinc-400">+57</span>
                <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-700 rounded-r-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all" required />
              </div>
            </div>
            <div><label className="block text-sm font-medium text-zinc-400 mb-1">Email</label><input type="email" name="email_contacto" value={formData.email_contacto} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-zinc-400 mb-1">Dirección de Residencia</label><input type="text" name="direccion" value={formData.direccion} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all" /></div>
          </div>
        </section>

        {/* 2. Acudiente (Condicional) */}
        {isMinor && (
          <section className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-orange-400 border-b border-orange-500/20 pb-3 mb-6 flex items-center gap-2">👨‍👩‍👦 Datos del Acudiente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div><label className="block text-sm font-medium text-zinc-400 mb-1">Nombre Completo *</label><input type="text" name="acudiente_nombre" value={formData.acudiente_nombre} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all" required /></div>
              <div><label className="block text-sm font-medium text-zinc-400 mb-1">Identificación del Acudiente *</label><input type="text" name="acudiente_identificacion" value={formData.acudiente_identificacion} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all" required /></div>
            </div>
          </section>
        )}

        {/* 3. Información Médica */}
        <section>
          <h2 className="text-xl font-bold text-orange-500 border-b border-zinc-800 pb-3 mb-6 flex items-center gap-2">🏥 Médico y Emergencias</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Tipo Sangre *</label>
              <select name="tipo_sangre" value={formData.tipo_sangre} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all text-zinc-400" required>
                <option value="">Seleccionar...</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-zinc-400 mb-1">EPS *</label><input type="text" name="eps" value={formData.eps} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all" required /></div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Talla Uniforme</label>
              <select name="talla_uniforme" value={formData.talla_uniforme} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all text-zinc-400">
                <option value="">Seleccionar...</option><option>6</option><option>8</option><option>10</option><option>12</option><option>14</option><option>16</option><option>S</option><option>M</option><option>L</option><option>XL</option>
              </select>
            </div>
          </div>
          <div className="mb-6"><label className="block text-sm font-medium text-zinc-400 mb-1">Patologías o Alergias</label><textarea name="patologias" value={formData.patologias} onChange={handleChange} placeholder="Asma, alergia a medicamentos, etc. (Deja en blanco si no aplica)" rows={2} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all"></textarea></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-zinc-950 p-5 rounded-2xl border border-zinc-800">
            <div className="md:col-span-2"><h3 className="text-sm font-bold text-white">En caso de emergencia avisar a:</h3></div>
            <div><label className="block text-sm font-medium text-zinc-400 mb-1">Nombre Contacto *</label><input type="text" name="emergencia_nombre" value={formData.emergencia_nombre} onChange={handleChange} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all" required /></div>
            <div><label className="block text-sm font-medium text-zinc-400 mb-1">Teléfono Emergencia *</label><input type="tel" name="emergencia_telefono" value={formData.emergencia_telefono} onChange={handleChange} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none transition-all" required /></div>
          </div>
        </section>

        {/* Carga Documentos Visual */}
        <section>
          <h2 className="text-xl font-bold text-orange-500 border-b border-zinc-800 pb-3 mb-6 flex items-center gap-2">📄 Carga de Documentos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-zinc-950 border border-dashed border-zinc-600 rounded-2xl p-6 text-center hover:border-orange-500 transition-colors">
              <span className="text-3xl mb-2 block">🆔</span>
              <p className="text-zinc-300 font-medium mb-1">Documento Jugador</p>
              <input type="file" className="mt-3 w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:bg-orange-500/10 file:text-orange-500 cursor-pointer" />
            </div>
            <div className="bg-zinc-950 border border-dashed border-zinc-600 rounded-2xl p-6 text-center hover:border-orange-500 transition-colors">
              <span className="text-3xl mb-2 block">🏥</span>
              <p className="text-zinc-300 font-medium mb-1">Certificado EPS</p>
              <input type="file" className="mt-3 w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:bg-orange-500/10 file:text-orange-500 cursor-pointer" />
            </div>
          </div>
        </section>

        <div className="pt-6">
          <button type="submit" disabled={guardando} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-lg py-4 rounded-xl transition-all shadow-lg shadow-orange-900/40 disabled:opacity-50">
            {guardando ? 'Enviando Datos...' : 'Enviar Solicitud de Inscripción'}
          </button>
        </div>
      </form>
    </div>
  );
}