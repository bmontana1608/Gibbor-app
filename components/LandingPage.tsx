'use client';

import React from 'react';
import { Bot, ShieldCheck, Zap, ChevronRight, BarChart3, Smartphone, Building2, Trophy, Activity, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-50 font-sans selection:bg-lime-500/30 overflow-x-hidden">
      {/* Decorative blurred backgrounds */}
      <div className="fixed top-0 left-0 w-[800px] h-[800px] bg-lime-500/10 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-emerald-700/10 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 pointer-events-none z-0" />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-lime-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(132,204,22,0.3)]">
              <Trophy className="w-6 h-6 text-slate-950" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block text-white">
              MasterClub<span className="text-lime-400">Manager</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/master" className="text-sm font-bold text-slate-400 hover:text-white transition-colors hidden md:block">
              Soy Administrador
            </Link>
            <Link href="/gibbor/login" className="bg-lime-400 text-slate-950 px-6 py-2.5 rounded-full text-sm font-black hover:bg-lime-300 transition-all shadow-[0_0_20px_rgba(132,204,22,0.2)] hover:scale-105 hover:shadow-[0_0_30px_rgba(132,204,22,0.4)]">
              Acceso a mi Club
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-36 pb-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Text */}
          <div className="text-left relative z-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lime-500/10 border border-lime-500/20 text-lime-400 text-xs font-bold mb-6 uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
              </span>
              Software Especializado en Fútbol
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.05] mb-6">
              Aumenta los <br className="hidden md:block"/>
              ingresos de tu <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400">
                Club Deportivo
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-xl leading-relaxed">
              El único software que combina control de pagos, PWA marca blanca, seguimiento de asistencia y recordatorios por WhatsApp con IA. 
              <strong>Aumenta tu recaudo hasta un 40%.</strong>
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button className="w-full sm:w-auto bg-lime-400 hover:bg-lime-300 text-slate-950 px-8 py-4 rounded-full font-black text-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(132,204,22,0.3)] hover:shadow-[0_0_40px_rgba(132,204,22,0.5)] hover:-translate-y-1">
                Probar Gratis <ChevronRight className="w-5 h-5" />
              </button>
              <button className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-full font-bold text-lg transition-all">
                Ver Demo
              </button>
            </div>
            
            <div className="mt-12 flex items-center gap-4 text-sm text-slate-500 font-medium">
              <div className="flex -space-x-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#0a0a0a]" />
                <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-[#0a0a0a]" />
                <div className="w-8 h-8 rounded-full bg-slate-600 border-2 border-[#0a0a0a]" />
              </div>
              <p>Más de <strong className="text-white">500 clubes</strong> ya lo usan.</p>
            </div>
          </div>

          {/* Right Dashboard Image */}
          <div className="relative z-10 lg:-mr-20">
            <div className="absolute inset-0 bg-gradient-to-tr from-lime-500/20 to-transparent blur-3xl -z-10 rounded-full" />
            <div className="rounded-3xl border border-white/10 overflow-hidden shadow-2xl shadow-lime-900/20 transform rotate-2 hover:rotate-0 transition-transform duration-500 bg-slate-900">
              <Image 
                src="/landing/dashboard.png" 
                alt="Dashboard de Master Club Manager" 
                width={800} 
                height={600} 
                className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity"
              />
            </div>
          </div>

        </div>
      </main>

      {/* Stats and FIFA Card Section */}
      <section className="py-24 relative z-10 bg-slate-900/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* FIFA Card Visualization */}
            <div className="relative flex justify-center items-center">
              <div className="absolute inset-0 bg-emerald-500/10 blur-[100px] z-0" />
              <div className="relative z-10 transform hover:scale-105 transition-transform duration-500">
                <Image 
                  src="/landing/fifa_card.png" 
                  alt="Carta estilo FIFA del Jugador" 
                  width={350} 
                  height={500} 
                  className="drop-shadow-[0_0_30px_rgba(132,204,22,0.4)]"
                />
              </div>
            </div>

            {/* Explanatory Text */}
            <div>
              <h2 className="text-4xl md:text-5xl font-black mb-6">
                Evaluación y <span className="text-lime-400">Cartas FIFA</span> para tus jugadores
              </h2>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                Motiva a tus alumnos con evaluaciones de rendimiento semestrales. Genera automáticamente **cartas de jugador** estilo videojuego con sus estadísticas de Pase, Tiro, Regate, Defensa y Físico. 
                Los padres podrán ver el crecimiento deportivo de sus hijos en tiempo real.
              </p>
              
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-lime-500/20 flex items-center justify-center text-lime-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  Métricas de rendimiento personalizadas
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-lime-500/20 flex items-center justify-center text-lime-400">
                    <Users className="w-4 h-4" />
                  </div>
                  Informes PDF para padres de familia
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-lime-500/20 flex items-center justify-center text-lime-400">
                    <Trophy className="w-4 h-4" />
                  </div>
                  Generación de cartas de jugador interactivas
                </li>
              </ul>
            </div>
            
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">Control total sobre el terreno de juego</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Sustituye múltiples herramientas y hojas de cálculo por un solo panel de control diseñado específicamente para administradores de clubes de fútbol.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Smartphone />}
              title="App Nativa (PWA)"
              description="Tus alumnos y padres instalarán tu propia aplicación en iOS y Android con el logo y colores de tu escuela."
            />
            <FeatureCard 
              icon={<Bot />}
              title="Asistente WhatsApp IA"
              description="El sistema envía recordatorios de pago automáticos, cobros y recibos directamente al WhatsApp de los padres."
            />
            <FeatureCard 
              icon={<Zap />}
              title="Caja y Cobranza"
              description="Genera recibos numerados, controla quién ha pagado y bloquea automáticamente la asistencia a jugadores morosos."
            />
            <FeatureCard 
              icon={<ShieldCheck />}
              title="Marca Blanca"
              description="Tu identidad es lo primero. Toda la interfaz, los PDFs y la App móvil llevan tu escudo. Nosotros somos invisibles."
            />
            <FeatureCard 
              icon={<BarChart3 />}
              title="Analítica Deportiva"
              description="Mide el progreso de tus equipos, efectividad de cobro y crecimiento del club en un solo vistazo."
            />
            <FeatureCard 
              icon={<Building2 />}
              title="Múltiples Sedes"
              description="Si tu academia crece, nuestro sistema también. Administra infinitas sedes, categorías y franquicias desde un mismo lugar."
            />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="py-24 px-6 text-center relative z-10 bg-lime-500/5 border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-t from-lime-900/10 to-transparent z-0" />
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-black mb-6">¿Listo para llevar tu academia a primera división?</h2>
          <p className="text-slate-400 mb-10 text-lg">Digitaliza tu operación, aumenta tus ingresos y ofrece una experiencia profesional a tus jugadores.</p>
          <button className="bg-lime-400 text-slate-950 px-12 py-5 rounded-full font-black text-xl transition-transform hover:scale-105 shadow-[0_0_40px_rgba(132,204,22,0.4)]">
            Comenzar Prueba Gratis
          </button>
        </div>
        
        <div className="mt-24 border-t border-white/10 pt-10 text-sm font-medium text-slate-500 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto relative z-10">
          <p>© {new Date().getFullYear()} Master Club Manager. Todos los derechos reservados.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="#" className="hover:text-slate-300 transition-colors">Privacidad</Link>
            <Link href="#" className="hover:text-slate-300 transition-colors">Términos</Link>
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
