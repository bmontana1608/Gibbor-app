'use client';

import { useState } from 'react';
import Link from 'next/link';
import MCMLogo from '@/components/MCMLogo';
import {
  Building2, User, Mail, Phone, MapPin, Users,
  MessageSquare, ChevronRight, CheckCircle, ArrowLeft, Shield, Zap, Smartphone
} from 'lucide-react';

const JUGADORES_OPCIONES = [
  { label: 'Menos de 30', value: 20 },
  { label: '30 – 60', value: 45 },
  { label: '60 – 120', value: 90 },
  { label: '120 – 200', value: 160 },
  { label: 'Más de 200', value: 250 },
];

const VENTAJAS = [
  { icon: <Zap className="w-4 h-4" />, text: 'Configuración en menos de 10 minutos' },
  { icon: <Shield className="w-4 h-4" />, text: 'Tu escudo y tus colores en todo' },
  { icon: <Smartphone className="w-4 h-4" />, text: 'App móvil instalable sin tiendas' },
  { icon: <Users className="w-4 h-4" />, text: 'Roles para director, entrenador y familia' },
];

export default function RegistroClubPage() {
  const [form, setForm] = useState({
    nombre_academia: '',
    nombre_director: '',
    email: '',
    telefono: '',
    ciudad: '',
    pais: 'Colombia',
    jugadores_estimados: '',
    mensaje: '',
  });
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/solicitudes-club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar solicitud');
      setEnviado(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-3">¡Solicitud recibida!</h1>
          <p className="text-slate-500 text-lg mb-4 leading-relaxed">
            Gracias, <strong className="text-slate-700">{form.nombre_director}</strong>. Revisaremos tu solicitud para <strong className="text-slate-700">{form.nombre_academia}</strong> y te contactaremos pronto al correo <strong className="text-green-600">{form.email}</strong>.
          </p>
          <p className="text-slate-400 text-sm mb-8">Tiempo de respuesta estimado: <strong>24–48 horas hábiles</strong></p>
          <Link href="/" className="inline-flex items-center gap-2 text-green-600 font-bold hover:underline">
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/"><MCMLogo width={160} height={44} /></Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 font-semibold flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

        {/* Left: Info */}
        <div className="lg:sticky lg:top-12">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-black px-3 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Solicitud Gratuita
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-4">
            Registra tu<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600">
              academia hoy
            </span>
          </h1>

          <p className="text-slate-500 text-lg leading-relaxed mb-8">
            Completa el formulario y nuestro equipo configurará tu plataforma personalizada. Sin contratos, sin sorpresas.
          </p>

          <ul className="space-y-3 mb-10">
            {VENTAJAS.map((v, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  {v.icon}
                </div>
                <span className="text-slate-700 font-semibold text-sm">{v.text}</span>
              </li>
            ))}
          </ul>

          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">¿Cómo funciona?</p>
            <ol className="space-y-3">
              {[
                'Envías tu solicitud con los datos básicos',
                'Nuestro equipo la revisa en 24–48 horas',
                'Recibes acceso a tu academia configurada',
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                  <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Right: Form */}
        <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-xl p-8">
          <h2 className="text-xl font-black text-slate-900 mb-6">Datos de tu academia</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nombre academia */}
            <Field label="Nombre de la academia *" icon={<Building2 className="w-4 h-4" />}>
              <input
                name="nombre_academia"
                type="text"
                required
                value={form.nombre_academia}
                onChange={handleChange}
                placeholder="Ej: Academia Fútbol del Norte"
                className={INPUT_CLS}
              />
            </Field>

            {/* Nombre director */}
            <Field label="Tu nombre completo *" icon={<User className="w-4 h-4" />}>
              <input
                name="nombre_director"
                type="text"
                required
                value={form.nombre_director}
                onChange={handleChange}
                placeholder="Nombre y apellidos del director"
                className={INPUT_CLS}
              />
            </Field>

            {/* Email */}
            <Field label="Correo electrónico *" icon={<Mail className="w-4 h-4" />}>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="director@miacademia.com"
                className={INPUT_CLS}
              />
            </Field>

            {/* Teléfono + Ciudad */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Teléfono / WhatsApp" icon={<Phone className="w-4 h-4" />}>
                <input
                  name="telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={handleChange}
                  placeholder="+57 300 000 0000"
                  className={INPUT_CLS}
                />
              </Field>
              <Field label="Ciudad" icon={<MapPin className="w-4 h-4" />}>
                <input
                  name="ciudad"
                  type="text"
                  value={form.ciudad}
                  onChange={handleChange}
                  placeholder="Bogotá"
                  className={INPUT_CLS}
                />
              </Field>
            </div>

            {/* País */}
            <Field label="País" icon={<MapPin className="w-4 h-4" />}>
              <select name="pais" value={form.pais} onChange={handleChange} className={INPUT_CLS}>
                {['Colombia', 'México', 'Argentina', 'Chile', 'Perú', 'Ecuador', 'Venezuela', 'España', 'Otro'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>

            {/* Jugadores estimados */}
            <Field label="Jugadores aproximados" icon={<Users className="w-4 h-4" />}>
              <select name="jugadores_estimados" value={form.jugadores_estimados} onChange={handleChange} className={INPUT_CLS}>
                <option value="">Selecciona un rango</option>
                {JUGADORES_OPCIONES.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            {/* Mensaje */}
            <Field label="Cuéntanos sobre tu academia (opcional)" icon={<MessageSquare className="w-4 h-4" />}>
              <textarea
                name="mensaje"
                rows={3}
                value={form.mensaje}
                onChange={handleChange}
                placeholder="¿Cuántas categorías tienes? ¿Qué problema quieres resolver?"
                className={`${INPUT_CLS} resize-none`}
              />
            </Field>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-4 py-3 rounded-2xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-600/20 hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Enviando...
                </>
              ) : (
                <>Enviar Solicitud <ChevronRight className="w-5 h-5" /></>
              )}
            </button>

            <p className="text-center text-xs text-slate-400 font-medium">
              Al enviar aceptas nuestros{' '}
              <Link href="#" className="text-green-600 hover:underline">Términos de Servicio</Link>.
              No spam, nunca.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

const INPUT_CLS = 'w-full bg-slate-50 border-2 border-slate-100 focus:border-green-500 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400';

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
        <span className="text-slate-400">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}
