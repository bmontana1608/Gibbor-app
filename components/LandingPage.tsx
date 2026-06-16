'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Zap, ChevronRight, BarChart3, Smartphone,
  Building2, Trophy, CreditCard, MessageSquare, Check,
  Users, Calendar, Bell, ArrowRight, Menu, X,
  ClipboardList, FileText, Wifi, Star, Play, Lock
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import MCMLogo from '@/components/MCMLogo';
import ClubSelectorModal from '@/components/ClubSelectorModal';

// ── DATA ──────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: '#modulos', label: 'Módulos' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#planes', label: 'Planes' },
  { href: '#beneficios', label: 'Beneficios' },
];

const MODULES = [
  {
    id: 'cobros',
    badge: 'Finanzas',
    title: 'Caja inteligente y cobros automáticos',
    desc: 'Registra pagos al instante, genera recibos PDF con tu logo, y el sistema bloquea automáticamente el acceso a alumnos con mora. Todo sin hojas de cálculo.',
    image: '/landing/payments.png',
    color: '#10b981',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    icon: <CreditCard className="w-6 h-6" />,
    bullets: ['Recibos PDF con tu logotipo', 'Alertas automáticas de morosidad', 'Reportes semanales y mensuales', 'Control de deuda por alumno'],
  },
  {
    id: 'whatsapp',
    badge: 'Comunicación IA',
    title: 'Bot de WhatsApp con Inteligencia Artificial',
    desc: 'Tu asistente virtual cobra, recuerda y notifica a los padres de forma amigable. Responde preguntas frecuentes, envía comprobantes y confirma asistencia, todo en automático.',
    image: '/landing/whatsapp.png',
    color: '#22c55e',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    icon: <MessageSquare className="w-6 h-6" />,
    bullets: ['Recordatorios de cobro amigables', 'Envío de comprobantes al chat', 'Notificaciones de convocatorias', 'IA que responde 24/7'],
  },
  {
    id: 'app',
    badge: 'App Móvil',
    title: 'Tu propia App sin ir a la tienda',
    desc: 'Padres y jugadores instalan tu aplicación directamente desde el celular. Ven tu escudo, tus colores. Sin descargar nada de Google Play ni App Store.',
    image: '/landing/pwa.png',
    color: '#3b82f6',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    icon: <Smartphone className="w-6 h-6" />,
    bullets: ['Instalable en iOS y Android', '100% personalizada con tu marca', 'Pagos, asistencias y noticias', 'Notificaciones push gratuitas'],
  },
  {
    id: 'deportivo',
    badge: 'Área Técnica',
    title: 'Gestión deportiva completa',
    desc: 'Convocatorias que el entrenador arma, el director aprueba y el bot notifica. Evaluaciones que generan cartas de jugador estilo FIFA. Control de asistencia en tiempo real.',
    image: '/landing/fifa_card.png',
    color: '#f59e0b',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    icon: <Trophy className="w-6 h-6" />,
    bullets: ['Flujo de convocatorias con aprobación', 'Cartas de jugador estilo videojuego', 'Registro de asistencia por QR', 'Biblioteca de videos técnicos'],
  },
];

const STEPS = [
  { num: '01', title: 'Crea tu club en minutos', desc: 'Registra tu academia, sube tu escudo y define los colores. Tu panel queda listo al instante.' },
  { num: '02', title: 'Invita a entrenadores y padres', desc: 'Cada rol tiene su propio acceso. El entrenador gestiona lo técnico; el director, lo administrativo.' },
  { num: '03', title: 'La plataforma trabaja por ti', desc: 'Cobros automáticos, notificaciones por WhatsApp y reportes que llegan solos a tu correo.' },
];

const BENEFITS = [
  { icon: <ShieldCheck />, title: 'Tu marca, no la nuestra', desc: 'La app, los PDFs y el portal muestran tu escudo. Tus padres verán una solución profesional propia de tu academia.', color: 'bg-indigo-50 text-indigo-600' },
  { icon: <BarChart3 />, title: 'Analítica en tiempo real', desc: 'Visualiza ingresos, morosidad, asistencias y crecimiento en un dashboard actualizado al instante.', color: 'bg-emerald-50 text-emerald-600' },
  { icon: <Building2 />, title: 'Multi-categoría', desc: 'Administra Sub-8, Sub-12, Sub-15 y más, cada una con entrenador y jugadores independientes.', color: 'bg-blue-50 text-blue-600' },
  { icon: <Bell />, title: 'Automatización total', desc: 'Cobros, asistencias y convocatorias se notifican sin que hagas nada. Recupera horas de tu semana.', color: 'bg-amber-50 text-amber-600' },
  { icon: <Lock />, title: 'Roles y permisos', desc: 'Director, Entrenador, Jugador y Familia: accesos únicos y seguros. Cada quien ve solo lo que necesita.', color: 'bg-rose-50 text-rose-600' },
  { icon: <Wifi />, title: 'Siempre disponible', desc: 'Plataforma en la nube, sin servidores propios. Funciona desde cualquier celular o computadora.', color: 'bg-violet-50 text-violet-600' },
];

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [activeModule, setActiveModule] = useState(MODULES[0].id);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [planes, setPlanes] = useState<any[]>([]);
  const [planesLoading, setPlanesLoading] = useState(true);
  const [showClubSelector, setShowClubSelector] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    fetch('/api/planes-publicos')
      .then(r => r.json())
      .then(d => { setPlanes(Array.isArray(d) ? d : []); })
      .catch(() => setPlanes([]))
      .finally(() => setPlanesLoading(false));
  }, []);

  const activeM = MODULES.find(m => m.id === activeModule) || MODULES[0];

  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      {showClubSelector && <ClubSelectorModal onClose={() => setShowClubSelector(false)} />}

      {/* ── NAVBAR ────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-xl shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <MCMLogo width={180} height={48} />

          <div className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-600">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} className="hover:text-slate-900 transition-colors">{l.label}</a>
            ))}
            <Link href="/master" className="text-green-600 hover:text-green-700 font-bold transition-colors">Admin</Link>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowClubSelector(true)} className="hidden sm:block text-slate-600 hover:text-slate-900 text-sm font-bold px-4 py-2 rounded-full hover:bg-slate-100 transition-all">
              Ingresar
            </button>
            <Link href="/unete-gibbor" className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-full text-sm font-black transition-all shadow-lg shadow-green-600/20 hover:-translate-y-0.5">
              Empezar gratis
            </Link>
            <button className="lg:hidden p-2 text-slate-500 ml-1" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-1 shadow-lg">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} className="block py-3 text-sm font-semibold text-slate-700 border-b border-slate-50 last:border-0" onClick={() => setMobileOpen(false)}>{l.label}</a>
            ))}
            <button onClick={() => setShowClubSelector(true)} className="block py-3 text-sm font-bold text-green-600">Ingresar a mi club</button>
          </div>
        )}
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section
        id="inicio"
        className="relative pt-28 pb-0 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f2a1a 100%)' }}
      >
        {/* Decorative orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 text-center pb-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-black px-4 py-2 rounded-full mb-8 uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Software N°1 para Escuelas de Fútbol
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.08] mb-6 max-w-5xl mx-auto">
            Tu academia, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #4ade80, #34d399)' }}>
              profesionalizada al máximo.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Cobros automatizados, App móvil con tu marca, convocatorias inteligentes y bot de WhatsApp con IA. Todo en una sola plataforma.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link
              href="/unete-gibbor"
              className="w-full sm:w-auto bg-green-500 hover:bg-green-400 text-white px-8 py-4 rounded-full font-black text-base flex items-center justify-center gap-2 transition-all shadow-2xl shadow-green-500/30 hover:-translate-y-0.5"
            >
              Comenzar Prueba Gratis <ChevronRight className="w-5 h-5" />
            </Link>
            <a
              href="#modulos"
              className="w-full sm:w-auto border border-white/20 text-white hover:bg-white/10 px-8 py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-4 h-4 fill-white" /> Ver la plataforma
            </a>
          </div>

          {/* Dashboard screenshot */}
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute -inset-1 bg-gradient-to-b from-transparent via-green-500/10 to-transparent rounded-[2rem] blur-xl" />
            <div className="relative rounded-t-[2rem] overflow-hidden border border-white/10 shadow-[0_-20px_80px_rgba(0,0,0,0.4)]">
              <div className="bg-slate-800/80 h-9 flex items-center px-5 gap-2 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 mx-4 bg-slate-700/50 rounded-md h-5 flex items-center px-3">
                  <span className="text-[10px] text-slate-400 font-mono">masterclubmanager.com/director</span>
                </div>
              </div>
              <Image
                src="/landing/dashboard.png"
                alt="Panel de control EFD Gibbor"
                width={1200}
                height={750}
                className="w-full h-auto"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────── */}
      <section className="bg-slate-900 py-10 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { v: '500+', l: 'Jugadores gestionados' },
            { v: '4 roles', l: 'Director / Coach / Atleta / Familia' },
            { v: '100%', l: 'Marca blanca personalizada' },
            { v: '24/7', l: 'Bot de WhatsApp activo' },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-3xl font-black text-white mb-1">{s.v}</p>
              <p className="text-xs text-slate-400 font-semibold">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── MODULES ───────────────────────────────────────────────── */}
      <section id="modulos" className="py-28 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-3">La Plataforma</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Una herramienta. Cuatro superpoderes.
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Cada módulo está diseñado para resolver un problema real de las academias de fútbol.
            </p>
          </div>

          {/* Tab selector */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
            {MODULES.map(m => (
              <button
                key={m.id}
                onClick={() => setActiveModule(m.id)}
                className={`flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-left transition-all ${
                  activeModule === m.id
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xl'
                    : 'border-slate-100 bg-white text-slate-700 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <div className={`p-2 rounded-xl ${activeModule === m.id ? 'bg-white/10' : m.iconBg}`}>
                  {React.cloneElement(m.icon as React.ReactElement<{ className?: string }>, {
                    className: `w-5 h-5 ${activeModule === m.id ? 'text-white' : m.iconColor}`
                  })}
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${activeModule === m.id ? 'text-green-400' : 'text-slate-400'}`}>{m.badge}</p>
                  <p className="text-sm font-black leading-tight">{m.title.split(' ').slice(0, 3).join(' ')}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Active module detail */}
          <div key={activeModule} className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center animate-in fade-in duration-300">
            <div>
              <div className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-5 ${activeM.iconBg} ${activeM.iconColor}`}>
                {React.cloneElement(activeM.icon as React.ReactElement<{ className?: string }>, { className: 'w-3.5 h-3.5' })}
                {activeM.badge}
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">{activeM.title}</h3>
              <p className="text-slate-500 text-lg leading-relaxed mb-8">{activeM.desc}</p>
              <ul className="space-y-3">
                {activeM.bullets.map((b, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full ${activeM.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <Check className={`w-3.5 h-3.5 ${activeM.iconColor}`} />
                    </div>
                    <span className="text-slate-700 font-semibold text-sm">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[3rem] blur-2xl opacity-20" style={{ backgroundColor: activeM.color }} />
              <div className="relative rounded-3xl border border-slate-100 overflow-hidden shadow-2xl bg-white">
                <Image
                  src={activeM.image}
                  alt={activeM.title}
                  width={700}
                  height={500}
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section id="como-funciona" className="py-24 px-6" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-3">Simple y rápido</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Listo en menos de 10 minutos
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Sin instalaciones, sin servidores, sin necesitar un técnico.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={i} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-green-200 to-transparent z-0" />
                )}
                <div className="relative bg-white rounded-3xl border border-green-100 p-8 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
                  <div className="w-14 h-14 bg-green-600 text-white rounded-2xl flex items-center justify-center font-black text-lg mb-6 shadow-lg shadow-green-600/20">
                    {step.num}
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-3">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANES ────────────────────────────────────────────────── */}
      <section id="planes" className="py-28 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-3">Precios Transparentes</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
              El plan perfecto para tu academia
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Sin contratos ocultos. Sin cobros sorpresa. Escala según crece tu club.
            </p>
          </div>

          {planesLoading ? (
            <div className="flex justify-center py-16">
              <div className="flex items-center gap-3 text-slate-400 font-semibold">
                <div className="w-5 h-5 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
                Cargando planes...
              </div>
            </div>
          ) : planes.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-slate-500 font-semibold">No hay planes configurados aún. Contáctanos para más información.</p>
            </div>
          ) : (
            <>
              <div className={`grid grid-cols-1 gap-6 ${planes.length === 1 ? 'max-w-sm mx-auto' : planes.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : planes.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
                {planes.map((plan: any, idx: number) => {
                  const isPopular = planes.length > 1 && idx === Math.floor((planes.length - 1) / 2);
                  return (
                    <div
                      key={plan.id}
                      className={`relative flex flex-col rounded-3xl p-8 transition-all hover:-translate-y-1 ${
                        isPopular
                          ? 'bg-slate-900 text-white ring-2 ring-green-500 shadow-2xl shadow-slate-900/20'
                          : 'bg-white border-2 border-slate-100 hover:border-green-200 hover:shadow-xl'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <span className="bg-green-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg shadow-green-500/30 uppercase tracking-wide">
                            ⭐ Más Popular
                          </span>
                        </div>
                      )}

                      <div className="mb-6">
                        <span className={`inline-block text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 ${isPopular ? 'bg-green-500/20 text-green-400' : 'bg-green-50 text-green-600'}`}>
                          {plan.tipo_cobro === 'anual' ? '📅 Anual' : '📆 Mensual'}
                        </span>
                        <h3 className={`text-2xl font-black mb-3 ${isPopular ? 'text-white' : 'text-slate-900'}`}>{plan.nombre}</h3>
                        <div className="flex items-end gap-1">
                          <span className={`text-4xl font-black leading-none ${isPopular ? 'text-white' : 'text-slate-900'}`}>
                            {formatCOP(plan.precio_base)}
                          </span>
                          <span className={`text-sm font-medium pb-0.5 ${isPopular ? 'text-slate-400' : 'text-slate-400'}`}>
                            /{plan.tipo_cobro === 'anual' ? 'año' : 'mes'}
                          </span>
                        </div>
                      </div>

                      <ul className="space-y-3 mb-8 flex-1">
                        {[
                          plan.limite_jugadores_base > 0 ? `Hasta ${plan.limite_jugadores_base} jugadores` : 'Jugadores ilimitados',
                          plan.precio_jugador_extra > 0 ? `+${formatCOP(plan.precio_jugador_extra)}/jugador extra` : null,
                          'Dashboard completo',
                          'App móvil marca blanca',
                          'Bot WhatsApp IA',
                          'Soporte prioritario',
                        ].filter(Boolean).map((feat, fi) => (
                          <li key={fi} className="flex items-center gap-2.5">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isPopular ? 'bg-green-500/20' : 'bg-green-50'}`}>
                              <Check className={`w-3 h-3 ${isPopular ? 'text-green-400' : 'text-green-600'}`} />
                            </div>
                            <span className={`text-sm font-semibold ${isPopular ? 'text-slate-300' : 'text-slate-600'}`}>{feat}</span>
                          </li>
                        ))}
                      </ul>

                      <Link
                        href="/unete-gibbor"
                        className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                          isPopular
                            ? 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/30'
                            : 'bg-slate-900 hover:bg-slate-700 text-white'
                        }`}
                      >
                        Comenzar ahora <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-sm text-slate-400 mt-8 font-medium">
                ¿Dudas sobre los planes?{' '}
                <a href="mailto:soporte@masterclubmanager.com" className="text-green-600 font-bold hover:underline">
                  Escríbenos
                </a>
              </p>
            </>
          )}
        </div>
      </section>

      {/* ── BENEFITS ──────────────────────────────────────────────── */}
      <section id="beneficios" className="py-28 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-3">Por qué elegirnos</p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Diseñado para academias reales
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              No es un software genérico adaptado al fútbol. Nació para escuelas de fútbol.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map((b, i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 p-8 hover:shadow-xl hover:-translate-y-1 transition-all group">
                <div className={`w-12 h-12 ${b.color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  {React.cloneElement(b.icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6' })}
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">{b.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #052e16 100%)' }}>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-400/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-black px-4 py-2 rounded-full mb-8 uppercase tracking-widest">
            <Star className="w-3.5 h-3.5 fill-green-400" /> Empieza hoy sin tarjeta de crédito
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-tight mb-6">
            Lleva tu academia a{' '}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #4ade80, #34d399)' }}>
              primera división
            </span>
          </h2>
          <p className="text-slate-400 text-xl mb-10 max-w-xl mx-auto">
            Únete a las academias que ya digitalizaron su gestión y recuperaron horas de su semana.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/unete-gibbor"
              className="bg-green-500 hover:bg-green-400 text-white px-10 py-5 rounded-full font-black text-lg flex items-center justify-center gap-2 transition-all shadow-2xl shadow-green-500/30 hover:scale-105"
            >
              Iniciar Prueba Gratuita <ChevronRight className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setShowClubSelector(true)}
              className="border border-white/20 text-white hover:bg-white/10 px-10 py-5 rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-all"
            >
              Ya tengo mi club
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <MCMLogo width={150} height={40} />
          <p className="text-slate-500 text-sm font-medium">
            © {new Date().getFullYear()} Master Club Manager. Todos los derechos reservados.
          </p>
          <div className="flex gap-5 text-sm text-slate-500 font-medium">
            <Link href="#" className="hover:text-slate-300 transition-colors">Privacidad</Link>
            <Link href="#" className="hover:text-slate-300 transition-colors">Términos</Link>
            <a href="mailto:soporte@masterclubmanager.com" className="hover:text-slate-300 transition-colors">Soporte</a>
            <Link href="/master" className="hover:text-green-400 transition-colors text-green-600">Admin</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
