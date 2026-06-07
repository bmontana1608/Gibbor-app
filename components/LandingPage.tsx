'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Zap, ChevronRight, BarChart3, Smartphone, Building2, Trophy, CreditCard, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const featuresData = [
  {
    id: 'pagos',
    title: 'Caja y Recaudación Automática',
    icon: <CreditCard className="w-5 h-5" />,
    description: 'Toma el control absoluto de las finanzas de tu club. Registra pagos, genera recibos en PDF al instante con tu logotipo, y bloquea automáticamente la asistencia de alumnos morosos. Todo centralizado para evitar fugas de dinero.',
    image: '/landing/payments.png',
    bullets: [
      'Recibos PDF generados automáticamente',
      'Alertas de morosidad en tiempo real',
      'Reportes financieros semanales y mensuales'
    ]
  },
  {
    id: 'whatsapp',
    title: 'Bot Asistente por WhatsApp (IA)',
    icon: <MessageSquare className="w-5 h-5" />,
    description: 'No pierdas tiempo cobrando manualmente. Nuestro Bot inteligente contacta a los padres por WhatsApp para enviarles recordatorios amigables de pago, enviarles los recibos generados, y notificarles sobre la asistencia de sus hijos.',
    image: '/landing/whatsapp.png',
    bullets: [
      'Cobros automáticos y amigables',
      'Envío de comprobantes directo al chat',
      'Interacciones impulsadas por Inteligencia Artificial'
    ]
  },
  {
    id: 'pwa',
    title: 'App Móvil (PWA) Marca Blanca',
    icon: <Smartphone className="w-5 h-5" />,
    description: 'Tus jugadores y padres de familia podrán instalar tu aplicación directamente en sus celulares (iOS y Android). Verán tu escudo, tus colores y tu nombre, sin tener que descargar nada de la App Store.',
    image: '/landing/pwa.png',
    bullets: [
      'Instalación directa sin pasar por las tiendas',
      '100% personalizada con tu identidad gráfica',
      'Visualización de asistencias, pagos y entrenamientos'
    ]
  },
  {
    id: 'fifa',
    title: 'Evaluaciones y Cartas de Jugador',
    icon: <Trophy className="w-5 h-5" />,
    description: 'Lleva la motivación al máximo. Los entrenadores pueden evaluar a los jugadores y el sistema genera automáticamente una Carta Estilo Videojuego (con estadísticas de Ritmo, Tiro, Pase, etc.) que los alumnos pueden compartir.',
    image: '/landing/fifa_card.png',
    bullets: [
      'Métricas personalizables de rendimiento',
      'Cartas de jugador interactivas tipo Ultimate Team',
      'Informes de progreso detallados para padres'
    ]
  }
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState(featuresData[0].id);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activeFeature = featuresData.find(f => f.id === activeTab) || featuresData[0];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-50 font-sans selection:bg-lime-500/30 overflow-x-hidden">
      {/* Decorative blurred backgrounds */}
      <div className="fixed top-0 left-0 w-[800px] h-[800px] bg-lime-500/10 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-emerald-700/10 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 pointer-events-none z-0" />

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/10 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo_mcm_dark.png"
              alt="Master Club Manager"
              width={180}
              height={48}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>
          
          <div className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#inicio" className="hover:text-lime-400 transition-colors">Inicio</a>
            <a href="#plataforma" className="hover:text-lime-400 transition-colors">Plataforma</a>
            <a href="#beneficios" className="hover:text-lime-400 transition-colors">Beneficios</a>
            <Link href="/master" className="text-lime-400/80 hover:text-lime-400 transition-colors">
              Soy Administrador
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/gibbor/login" className="bg-lime-400 text-slate-950 px-6 py-2.5 rounded-full text-sm font-black hover:bg-lime-300 transition-all shadow-[0_0_20px_rgba(132,204,22,0.2)] hover:scale-105">
              Acceso a mi Club
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main id="inicio" className="pt-40 pb-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lime-500/10 border border-lime-500/20 text-lime-400 text-xs font-bold mb-8 uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
            </span>
            Software Especializado en Fútbol
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.05] mb-8 mx-auto max-w-5xl">
            Aumenta los ingresos de tu <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400">
              Club Deportivo
            </span>
          </h1>
          
          <p className="text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            El único software que combina control de pagos, App marca blanca para padres, seguimiento de asistencia y recordatorios automatizados por WhatsApp con IA.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <button className="w-full sm:w-auto bg-lime-400 hover:bg-lime-300 text-slate-950 px-10 py-5 rounded-full font-black text-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_40px_rgba(132,204,22,0.3)] hover:shadow-[0_0_60px_rgba(132,204,22,0.5)] hover:-translate-y-1">
              Comenzar Prueba Gratis <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="relative mx-auto max-w-5xl">
            <div className="absolute inset-0 bg-gradient-to-tr from-lime-500/20 to-transparent blur-3xl -z-10 rounded-full" />
            <div className="rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl shadow-lime-900/30 bg-slate-900 relative">
              {/* Fake Window Header */}
              <div className="h-10 bg-slate-950/50 border-b border-white/5 flex items-center px-6 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
              </div>
              <Image 
                src="/landing/dashboard.png" 
                alt="Dashboard de Master Club Manager" 
                width={1200} 
                height={800} 
                className="w-full h-auto object-cover opacity-90"
                priority
              />
            </div>
          </div>
        </div>
      </main>

      {/* Interactive Tabs Section (The Core Platform) */}
      <section id="plataforma" className="py-32 relative z-10 bg-slate-900/40 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-6">Todo lo que necesitas en <span className="text-lime-400">una sola plataforma</span></h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">Explora a detalle cada módulo de Master Club Manager y descubre cómo puede transformar tu academia.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Tabs Navigation (Sidebar) */}
            <div className="lg:col-span-4 flex flex-col gap-2">
              {featuresData.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => setActiveTab(feature.id)}
                  className={`text-left p-5 rounded-2xl flex items-start gap-4 transition-all duration-300 border ${
                    activeTab === feature.id 
                      ? 'bg-slate-800/80 border-lime-500/30 shadow-[0_0_20px_rgba(132,204,22,0.1)]' 
                      : 'bg-transparent border-transparent hover:bg-slate-800/40'
                  }`}
                >
                  <div className={`mt-1 p-2 rounded-xl transition-colors ${activeTab === feature.id ? 'bg-lime-500/20 text-lime-400' : 'bg-slate-800 text-slate-400'}`}>
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className={`font-bold text-lg mb-1 ${activeTab === feature.id ? 'text-white' : 'text-slate-300'}`}>
                      {feature.title}
                    </h3>
                    <p className={`text-sm line-clamp-2 ${activeTab === feature.id ? 'text-slate-300' : 'text-slate-500'}`}>
                      {feature.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Tab Content Display */}
            <div className="lg:col-span-8">
              <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-8 md:p-12 min-h-[600px] flex flex-col relative overflow-hidden">
                {/* Background glow specific to active tab */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-lime-500/10 rounded-full blur-[100px] pointer-events-none transition-opacity duration-500" />
                
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center h-full">
                  <div>
                    <div className="w-12 h-12 bg-lime-500/20 text-lime-400 rounded-2xl flex items-center justify-center mb-6">
                      {React.cloneElement(activeFeature.icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6' })}
                    </div>
                    <h3 className="text-3xl font-black mb-4 text-white leading-tight">
                      {activeFeature.title}
                    </h3>
                    <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                      {activeFeature.description}
                    </p>
                    <ul className="space-y-4">
                      {activeFeature.bullets.map((bullet, i) => (
                        <li key={i} className="flex items-center gap-3 text-slate-300 font-medium">
                          <Zap className="w-4 h-4 text-lime-400 flex-shrink-0" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Image Display with smooth transition key */}
                  <div className="relative w-full aspect-[4/5] md:aspect-square flex justify-center items-center">
                    <Image
                      key={activeFeature.id} // Forces re-render/animation on tab change
                      src={activeFeature.image}
                      alt={activeFeature.title}
                      fill
                      className="object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-right-8 duration-500"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section id="beneficios" className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">Control total sobre el terreno de juego</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Sustituye múltiples herramientas y horas de Excel por un solo panel de control diseñado para administradores profesionales.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<ShieldCheck />}
              title="Tu Marca es lo Primero"
              description="Toda la interfaz, los PDFs y la App móvil llevan tu escudo y tus colores. El cliente sentirá que pagaste miles de dólares por un software propio."
            />
            <FeatureCard 
              icon={<BarChart3 />}
              title="Analítica Deportiva"
              description="Mide el progreso de tus equipos, la efectividad de tu cobranza y el crecimiento de inscritos en gráficos fáciles de entender."
            />
            <FeatureCard 
              icon={<Building2 />}
              title="Múltiples Sedes"
              description="Si tu academia crece, nosotros también. Administra infinitas sedes, categorías y franquicias desde una sola cuenta maestra."
            />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="py-32 px-6 text-center relative z-10 bg-lime-500/5 border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-t from-lime-900/10 to-transparent z-0" />
        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter">
            Lleva tu academia a <span className="text-lime-400">primera división</span>
          </h2>
          <p className="text-slate-400 mb-12 text-xl max-w-2xl mx-auto">
            Únete a los cientos de clubes que ya digitalizaron su operación y aumentaron sus ingresos exponencialmente.
          </p>
          <button className="bg-lime-400 text-slate-950 px-12 py-5 rounded-full font-black text-xl transition-all hover:scale-105 shadow-[0_0_40px_rgba(132,204,22,0.4)] hover:bg-lime-300">
            Iniciar Prueba Gratuita Hoy
          </button>
        </div>
        
        <div className="mt-32 border-t border-white/10 pt-10 text-sm font-medium text-slate-500 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto relative z-10">
          <p>© {new Date().getFullYear()} Master Club Manager. Todos los derechos reservados.</p>
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

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-slate-900/50 p-8 rounded-[2rem] border border-white/5 hover:border-lime-500/30 transition-all hover:-translate-y-1 group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/5 rounded-full blur-2xl group-hover:bg-lime-500/10 transition-colors" />
      <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner border border-white/5 text-lime-400">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-7 h-7' })}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed relative z-10">
        {description}
      </p>
    </div>
  );
}
