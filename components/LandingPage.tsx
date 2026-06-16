'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Zap, ChevronRight, BarChart3, Smartphone,
  Building2, Trophy, CreditCard, MessageSquare, Check,
  Users, Calendar, Bell, Star, ArrowRight, Menu, X
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import MCMLogo from '@/components/MCMLogo';

const featuresData = [
  {
    id: 'pagos',
    title: 'Caja y Recaudación',
    icon: <CreditCard className="w-5 h-5" />,
    description: 'Registra pagos, genera recibos PDF con tu logo y controla la morosidad de forma automática.',
    image: '/landing/payments.png',
    color: 'from-emerald-500 to-teal-600',
    bullets: ['Recibos PDF automáticos', 'Alertas de morosidad', 'Reportes financieros']
  },
  {
    id: 'whatsapp',
    title: 'Bot WhatsApp con IA',
    icon: <MessageSquare className="w-5 h-5" />,
    description: 'Automatiza cobros, notificaciones de asistencia y convocatorias directamente en WhatsApp.',
    image: '/landing/whatsapp.png',
    color: 'from-green-500 to-emerald-600',
    bullets: ['Cobros automáticos', 'Envío de comprobantes', 'IA conversacional']
  },
  {
    id: 'pwa',
    title: 'App Móvil Marca Blanca',
    icon: <Smartphone className="w-5 h-5" />,
    description: 'Tu escudo, tus colores. Una aplicación instalable en iOS y Android sin pasar por las tiendas.',
    image: '/landing/pwa.png',
    color: 'from-blue-500 to-indigo-600',
    bullets: ['Sin App Store ni Google Play', '100% personalizada', 'Asistencias y pagos en línea']
  },
  {
    id: 'fifa',
    title: 'Cartas de Jugador',
    icon: <Trophy className="w-5 h-5" />,
    description: 'Motiva a tus atletas con evaluaciones que generan cartas estilo videojuego compartibles.',
    image: '/landing/fifa_card.png',
    color: 'from-amber-500 to-orange-600',
    bullets: ['Estadísticas de rendimiento', 'Cartas tipo Ultimate Team', 'Informes para padres']
  }
];

const statsData = [
  { value: '500+', label: 'Jugadores gestionados' },
  { value: '98%', label: 'Satisfacción de directores' },
  { value: '3x', label: 'Reducción en tareas manuales' },
  { value: '24/7', label: 'Soporte automatizado' },
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState(featuresData[0].id);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [planes, setPlanes] = useState<any[]>([]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetch('/api/planes-publicos')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPlanes(data); })
      .catch(() => {});
  }, []);

  const activeFeature = featuresData.find(f => f.id === activeTab) || featuresData[0];

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-xl shadow-sm border-b border-slate-100' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-18 py-4">
          <MCMLogo width={200} height={54} />

          <div className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#plataforma" className="hover:text-slate-900 transition-colors">Plataforma</a>
            <a href="#planes" className="hover:text-slate-900 transition-colors">Planes</a>
            <a href="#beneficios" className="hover:text-slate-900 transition-colors">Beneficios</a>
            <Link href="/master" className="text-lime-600 hover:text-lime-700 transition-colors font-bold">
              Admin
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/gibbor/login"
              className="hidden sm:block text-slate-700 hover:text-slate-900 font-bold text-sm px-4 py-2 rounded-full hover:bg-slate-100 transition-all"
            >
              Ingresar
            </Link>
            <Link
              href="/unete-gibbor"
              className="bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-black hover:bg-slate-700 transition-all shadow-sm"
            >
              Comenzar gratis
            </Link>
            <button
              className="lg:hidden p-2 text-slate-500 hover:text-slate-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-3 shadow-lg">
            <a href="#plataforma" className="block text-sm font-semibold text-slate-700 py-2" onClick={() => setMobileMenuOpen(false)}>Plataforma</a>
            <a href="#planes" className="block text-sm font-semibold text-slate-700 py-2" onClick={() => setMobileMenuOpen(false)}>Planes</a>
            <a href="#beneficios" className="block text-sm font-semibold text-slate-700 py-2" onClick={() => setMobileMenuOpen(false)}>Beneficios</a>
            <Link href="/gibbor/login" className="block text-sm font-semibold text-lime-600 py-2">Ingresar a mi club</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section id="inicio" className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lime-50 border border-lime-200 text-lime-700 text-xs font-bold mb-8 uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
              </span>
              Software Especializado en Fútbol
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.05] mb-6 text-slate-900">
              Digitaliza tu academia.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-500 to-emerald-500">
                Aumenta tus ingresos.
              </span>
            </h1>

            <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
              La plataforma todo-en-uno para escuelas de fútbol: cobros, asistencia, convocatorias,
              App móvil propia y bot de WhatsApp con IA.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/unete-gibbor"
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-700 text-white px-8 py-4 rounded-full font-black text-lg flex items-center justify-center gap-2 transition-all shadow-xl hover:-translate-y-0.5"
              >
                Comenzar Prueba Gratis <ChevronRight className="w-5 h-5" />
              </Link>
              <a
                href="#plataforma"
                className="w-full sm:w-auto border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:border-slate-400 transition-all"
              >
                Ver la Plataforma
              </a>
            </div>
          </div>

          {/* Dashboard screenshot */}
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute -inset-4 bg-gradient-to-br from-lime-100 to-emerald-100 rounded-[3rem] blur-2xl opacity-60" />
            <div className="relative rounded-[2rem] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/80 bg-slate-100">
              <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-5 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div className="ml-4 h-5 bg-white rounded-md flex-1 max-w-xs border border-slate-200 flex items-center px-3">
                  <span className="text-[10px] text-slate-400 font-mono">app.efdgibbor.com/director</span>
                </div>
              </div>
              <Image
                src="/landing/dashboard.png"
                alt="Dashboard de EFD Gibbor"
                width={1200}
                height={750}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 px-6 border-y border-slate-100 bg-slate-50">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {statsData.map((s, i) => (
            <div key={i}>
              <p className="text-4xl font-black text-slate-900 mb-1">{s.value}</p>
              <p className="text-sm text-slate-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PLATFORM TABS ── */}
      <section id="plataforma" className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-black text-lime-600 uppercase tracking-widest mb-3">La Plataforma</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-slate-900">
              Todo lo que necesita tu academia
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Reemplaza hojas de cálculo, chats informales y decenas de apps por un único panel de control.
            </p>
          </div>

          {/* Tab Pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {featuresData.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveTab(f.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all border ${
                  activeTab === f.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {f.icon}
                {f.title}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div key={activeTab + '-text'} className="animate-in fade-in slide-in-from-left-4 duration-400">
              <div className={`w-14 h-14 bg-gradient-to-br ${activeFeature.color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                {React.cloneElement(activeFeature.icon as React.ReactElement<{ className?: string }>, { className: 'w-7 h-7' })}
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4">{activeFeature.title}</h3>
              <p className="text-slate-500 text-lg mb-8 leading-relaxed">{activeFeature.description}</p>
              <ul className="space-y-4">
                {activeFeature.bullets.map((b, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-lime-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-lime-600" />
                    </div>
                    <span className="text-slate-700 font-semibold">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div key={activeTab + '-img'} className="relative animate-in fade-in slide-in-from-right-4 duration-400">
              <div className={`absolute -inset-6 bg-gradient-to-br ${activeFeature.color} opacity-10 rounded-[3rem] blur-2xl`} />
              <div className="relative rounded-[2rem] border border-slate-200 overflow-hidden shadow-2xl bg-white">
                <Image
                  src={activeFeature.image}
                  alt={activeFeature.title}
                  width={700}
                  height={500}
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLANES (dinámicos desde BD) ── */}
      <section id="planes" className="py-28 px-6 bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-black text-lime-600 uppercase tracking-widest mb-3">Precios Transparentes</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-slate-900">
              Elige el plan ideal para tu academia
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Sin contratos largos. Sin sorpresas. Empieza gratis y escala según crece tu club.
            </p>
          </div>

          {planes.length === 0 ? (
            /* Fallback mientras carga o si no hay planes configurados */
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-500 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></div>
                Cargando planes...
              </div>
            </div>
          ) : (
            <div className={`grid grid-cols-1 ${planes.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : planes.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'} gap-6`}>
              {planes.map((plan: any, idx: number) => {
                const esPopular = idx === Math.floor(planes.length / 2);
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-3xl p-8 flex flex-col transition-all hover:-translate-y-1 ${
                      esPopular
                        ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20 ring-2 ring-slate-900'
                        : 'bg-white text-slate-900 border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300'
                    }`}
                  >
                    {esPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="bg-lime-400 text-slate-900 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                          ⭐ Más Popular
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <p className={`text-xs font-black uppercase tracking-widest mb-2 ${esPopular ? 'text-lime-400' : 'text-lime-600'}`}>
                        {plan.tipo_cobro === 'anual' ? '📅 Anual' : '📆 Mensual'}
                      </p>
                      <h3 className={`text-2xl font-black mb-3 ${esPopular ? 'text-white' : 'text-slate-900'}`}>
                        {plan.nombre}
                      </h3>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-black ${esPopular ? 'text-white' : 'text-slate-900'}`}>
                          {formatCOP(plan.precio_base)}
                        </span>
                        <span className={`text-sm font-medium ${esPopular ? 'text-slate-400' : 'text-slate-400'}`}>
                          /{plan.tipo_cobro === 'anual' ? 'año' : 'mes'}
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                      <li className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${esPopular ? 'bg-lime-400/20' : 'bg-lime-100'}`}>
                          <Check className={`w-3 h-3 ${esPopular ? 'text-lime-400' : 'text-lime-600'}`} />
                        </div>
                        <span className={`text-sm font-semibold ${esPopular ? 'text-slate-200' : 'text-slate-600'}`}>
                          {plan.limite_jugadores_base > 0 ? `Hasta ${plan.limite_jugadores_base} jugadores` : 'Jugadores ilimitados'}
                        </span>
                      </li>
                      {plan.precio_jugador_extra > 0 && (
                        <li className="flex items-center gap-2.5">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${esPopular ? 'bg-lime-400/20' : 'bg-lime-100'}`}>
                            <Check className={`w-3 h-3 ${esPopular ? 'text-lime-400' : 'text-lime-600'}`} />
                          </div>
                          <span className={`text-sm font-semibold ${esPopular ? 'text-slate-200' : 'text-slate-600'}`}>
                            +{formatCOP(plan.precio_jugador_extra)}/jugador extra
                          </span>
                        </li>
                      )}
                      {['Dashboard completo', 'App móvil marca blanca', 'Bot WhatsApp con IA', 'Soporte prioritario'].map((feat, i) => (
                        <li key={i} className="flex items-center gap-2.5">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${esPopular ? 'bg-lime-400/20' : 'bg-lime-100'}`}>
                            <Check className={`w-3 h-3 ${esPopular ? 'text-lime-400' : 'text-lime-600'}`} />
                          </div>
                          <span className={`text-sm font-semibold ${esPopular ? 'text-slate-200' : 'text-slate-600'}`}>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/unete-gibbor"
                      className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                        esPopular
                          ? 'bg-lime-400 hover:bg-lime-300 text-slate-900 shadow-lg shadow-lime-400/20'
                          : 'bg-slate-900 hover:bg-slate-700 text-white'
                      }`}
                    >
                      Empezar ahora <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-center text-sm text-slate-400 mt-8 font-medium">
            ¿Tienes preguntas sobre los planes? <a href="mailto:soporte@masterclubmanager.com" className="text-lime-600 font-bold hover:underline">Contáctanos</a>
          </p>
        </div>
      </section>

      {/* ── BENEFITS GRID ── */}
      <section id="beneficios" className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-black text-lime-600 uppercase tracking-widest mb-3">Por qué elegirnos</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-slate-900">
              Control total sobre tu academia
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Diseñado específicamente para administradores de escuelas de fútbol. No más Excel, no más WhatsApp perdido.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <ShieldCheck />, title: 'Tu Marca Primero', desc: 'App, PDFs y portal 100% con tu escudo y colores. Tus padres sentirán que desarrollaste un software propio.', color: 'bg-blue-50 text-blue-600' },
              { icon: <BarChart3 />, title: 'Analítica en Tiempo Real', desc: 'Mide asistencias, ingresos y rendimiento deportivo desde un solo panel actualizado al instante.', color: 'bg-emerald-50 text-emerald-600' },
              { icon: <Building2 />, title: 'Múltiples Categorías', desc: 'Gestiona Sub-8, Sub-10, Sub-14 y todas las categorías con entrenadores independientes por grupo.', color: 'bg-violet-50 text-violet-600' },
              { icon: <Bell />, title: 'Notificaciones Automáticas', desc: 'Los padres reciben alertas de cobro, asistencia y convocatorias sin que tengas que hacer nada.', color: 'bg-amber-50 text-amber-600' },
              { icon: <Users />, title: 'Roles Definidos', desc: 'Director, Entrenador, Jugador y Familia: cada uno con su panel y accesos únicos.', color: 'bg-rose-50 text-rose-600' },
              { icon: <Calendar />, title: 'Convocatorias Inteligentes', desc: 'El profe arma la lista, el director la aprueba, y el bot notifica a los jugadores por WhatsApp.', color: 'bg-lime-50 text-lime-600' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 p-8 hover:border-slate-200 hover:shadow-xl transition-all hover:-translate-y-1 group">
                <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6' })}
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <footer className="py-24 px-6 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-black mb-6 tracking-tight">
            Lleva tu academia a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400">
              primera división
            </span>
          </h2>
          <p className="text-slate-400 mb-10 text-xl max-w-xl mx-auto">
            Únete a las academias que ya digitalizaron su operación con nuestra plataforma.
          </p>
          <Link
            href="/unete-gibbor"
            className="inline-flex items-center gap-2 bg-lime-400 text-slate-900 px-10 py-5 rounded-full font-black text-xl hover:bg-lime-300 transition-all shadow-2xl shadow-lime-400/20 hover:scale-105"
          >
            Iniciar Prueba Gratuita <ChevronRight className="w-6 h-6" />
          </Link>
        </div>

        <div className="border-t border-white/10 pt-10 text-sm font-medium text-slate-500 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto">
          <MCMLogo width={150} height={40} />
          <p className="mt-4 md:mt-0">© {new Date().getFullYear()} Master Club Manager. Todos los derechos reservados.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="#" className="hover:text-slate-300 transition-colors">Privacidad</Link>
            <Link href="#" className="hover:text-slate-300 transition-colors">Términos</Link>
            <Link href="mailto:soporte@masterclubmanager.com" className="hover:text-slate-300 transition-colors">Soporte</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
