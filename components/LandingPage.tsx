'use client';

import React from 'react';
import { Bot, ShieldCheck, Zap, Globe, ChevronRight, BarChart3, Smartphone, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-cyan-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-cyan-600 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="font-black text-white text-lg tracking-tighter">M</span>
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">
              MasterClub<span className="text-cyan-400">Manager</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/master" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">
              Soy Administrador
            </Link>
            <Link href="/gibbor/login" className="bg-white text-slate-950 px-5 py-2.5 rounded-full text-sm font-bold hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-105">
              Acceso a mi Club
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10 mt-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold mb-8 uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            El SaaS #1 para Escuelas de Fútbol
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
            Digitaliza, controla y <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              escala tu Academia.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Un ecosistema todo-en-uno con aplicación móvil (PWA), pagos automatizados, asistente de WhatsApp con IA y portal de familias 100% marca blanca.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-8 py-4 rounded-full font-black text-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:-translate-y-1">
              Agendar una Demo <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dashboard Preview Image/Mockup */}
        <div className="max-w-5xl mx-auto mt-20 relative z-10">
          <div className="aspect-[16/9] bg-slate-900 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent z-10" />
            <div className="absolute top-4 left-4 right-4 flex gap-2 z-20">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            {/* Abstract UI representation */}
            <div className="absolute inset-0 p-12 pt-20 grid grid-cols-3 gap-6 opacity-80 group-hover:opacity-100 transition-opacity duration-700">
              <div className="col-span-2 space-y-6">
                <div className="h-32 bg-slate-800/50 rounded-2xl border border-white/5" />
                <div className="grid grid-cols-2 gap-6">
                  <div className="h-48 bg-slate-800/50 rounded-2xl border border-white/5" />
                  <div className="h-48 bg-slate-800/50 rounded-2xl border border-white/5" />
                </div>
              </div>
              <div className="space-y-6">
                <div className="h-64 bg-cyan-900/20 rounded-2xl border border-cyan-500/20" />
                <div className="h-20 bg-slate-800/50 rounded-2xl border border-white/5" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-32 px-6 bg-slate-900/50 relative border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">La infraestructura que tu club merece</h2>
            <p className="text-slate-400">Olvídate del Excel y los mensajes manuales. Automatiza cada aspecto de tu escuela.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-900 p-8 rounded-3xl border border-white/5 hover:border-cyan-500/30 transition-colors group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Smartphone className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">App Nativa (PWA)</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tus alumnos y sus padres podrán instalar tu aplicación directamente en sus celulares iOS y Android con tu propio logo.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900 p-8 rounded-3xl border border-white/5 hover:border-cyan-500/30 transition-colors group">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Bot className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Asistente WhatsApp IA</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Recordatorios automáticos de pago, envío de comunicados y envío de recibos en PDF directo al WhatsApp de las familias.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900 p-8 rounded-3xl border border-white/5 hover:border-cyan-500/30 transition-colors group">
              <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">100% Marca Blanca</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Nuestra marca nunca aparece. Todos los recibos PDF, interfaz y comunicaciones llevarán única y exclusivamente el logo de tu academia.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-900 p-8 rounded-3xl border border-white/5 hover:border-cyan-500/30 transition-colors group">
              <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Control de Pagos</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Módulo completo de caja, generación de recibos numerados, control de mora y bloqueo automático de asistencia a morosos.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-900 p-8 rounded-3xl border border-white/5 hover:border-cyan-500/30 transition-colors group">
              <div className="w-14 h-14 bg-pink-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7 text-pink-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Estadísticas y Reportes</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Mide la evolución de tus jugadores, asistencias por categorías y reportes financieros mensuales en tiempo real.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-900 p-8 rounded-3xl border border-white/5 hover:border-cyan-500/30 transition-colors group">
              <div className="w-14 h-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Building2 className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Multiclub y Escuelas</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Arquitectura escalable. Si tienes varias sedes o franquicias, podrás administrarlas todas desde un mismo panel maestro.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black mb-6">¿Listo para llevar tu club al siguiente nivel?</h2>
          <p className="text-slate-400 mb-10">Únete a los clubes que ya están usando Master Club Manager para digitalizar su operación.</p>
          <button className="bg-white text-slate-950 px-10 py-4 rounded-full font-black text-lg transition-transform hover:scale-105 shadow-xl shadow-white/10">
            Contactar Ventas
          </button>
        </div>
        <div className="mt-20 pt-10 border-t border-white/5 text-sm font-medium text-slate-600 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto">
          <p>© {new Date().getFullYear()} Master Club Manager. Todos los derechos reservados.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacidad</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Términos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
