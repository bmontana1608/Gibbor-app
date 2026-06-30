'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Calendar, CreditCard, Activity, CheckCircle2, 
  Smartphone, BarChart, Shield, UserCheck, LayoutDashboard,
  ClipboardList, TrendingUp, Target, Folder, Settings, ArrowRight,
  ChevronDown, MessageSquare, Play, Menu, X, Star, FileText, Check, Trophy
} from 'lucide-react';
import Link from 'next/link';
import MCMLogo from '@/components/MCMLogo';
import ClubSelectorModal from '@/components/ClubSelectorModal';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showClubSelector, setShowClubSelector] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B101E] text-slate-300 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden">
      {showClubSelector && <ClubSelectorModal onClose={() => setShowClubSelector(false)} />}

      {/* ── NAVBAR ────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[#0B101E]/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <MCMLogo width={240} height={64} />

          <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#roles" className="hover:text-white transition-colors">Para quién</a>
            <a href="#ecosistema" className="hover:text-white transition-colors">Ecosistema</a>
            <a href="#diferencias" className="hover:text-white transition-colors">Por qué MCM</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setShowClubSelector(true)} className="hidden sm:block text-slate-400 hover:text-white text-sm font-medium transition-colors">
              Iniciar Sesión
            </button>
            <Link href="/registro-club" className="bg-emerald-500 hover:bg-emerald-400 text-[#0B101E] px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center gap-2">
              Solicitar Demo
            </Link>
            <button className="lg:hidden p-2 text-slate-400 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] -z-10 pointer-events-none mix-blend-screen"></div>
        
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-2xl">
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Plataforma Deportiva All-in-One
            </motion.div>
            <motion.h1 variants={fadeInUp} className="text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight mb-6">
              Todo tu club deportivo, conectado en una sola <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">plataforma.</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-lg text-slate-400 leading-relaxed mb-10">
              Administra tu academia, organiza entrenamientos, controla pagos, realiza seguimientos y ofrece una experiencia moderna para entrenadores, jugadores y padres de familia.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/registro-club" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-[#0B101E] px-8 py-4 rounded-full text-base font-bold transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2">
                Solicitar Demo <ArrowRight className="w-4 h-4" />
              </Link>
              <button className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-full text-base font-medium transition-all backdrop-blur-md flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> Ver funcionamiento
              </button>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative lg:h-[600px] flex items-center justify-center"
          >
            {/* Mockup Dashboard Base */}
            <div className="relative w-full z-10 flex flex-col items-center justify-center">
              <img 
                src="/landing/dashboard.png" 
                alt="MCM Dashboard" 
                className="w-[120%] max-w-none sm:w-full h-auto object-contain drop-shadow-2xl"
                style={{
                  maskImage: 'radial-gradient(ellipse at center, black 65%, transparent 100%)',
                  WebkitMaskImage: 'radial-gradient(ellipse at center, black 65%, transparent 100%)'
                }}
              />
            </div>

          </motion.div>
        </div>
      </section>

      {/* ── IDENTIDAD MÓVIL (NUEVA SECCIÓN) ────────────────────────────────────────────────── */}
      <section className="py-20 relative overflow-hidden bg-[#0B101E]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* TEXTO NATIVO (ALTA CALIDAD) */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-10"
            >
              <div>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight mb-6">
                  Tu app.<br/>
                  <span className="text-emerald-500">Tu identidad.</span><br/>
                  Tu escuela.
                </h2>
                <p className="text-lg text-slate-400 leading-relaxed max-w-lg">
                  Con la app de <span className="text-emerald-500 font-semibold">tu escuela</span>, llevas la gestión de tu club a donde vayas, con el logo, los colores y la identidad que los representa.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  { icon: <Shield className="w-6 h-6 text-emerald-500" />, title: 'Tu marca, siempre presente', desc: 'Tu logo, tus colores, tu esencia. Una app que fortalece la identidad de tu escuela en cada detalle.' },
                  { icon: <Users className="w-6 h-6 text-emerald-500" />, title: 'Todo tu club en tu bolsillo', desc: 'Comunicación, entrenamientos, asistencia, pagos, finanzas y mucho más. Siempre contigo.' },
                  { icon: <BarChart className="w-6 h-6 text-emerald-500" />, title: 'Gestiona y toma mejores decisiones', desc: 'Accede a reportes y métricas en tiempo real para hacer crecer tu escuela.' },
                  { icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" />, title: 'Conectado con tu comunidad', desc: 'Notificaciones inteligentes para mantener a tu equipo siempre informado.' },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg mb-1">{item.title}</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
                
                <div className="flex gap-4 items-center bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg">Hecha para tu escuela.</h4>
                      <p className="text-emerald-500 text-sm font-semibold">Pensada para tu éxito.</p>
                    </div>
                </div>
              </div>
            </motion.div>

            {/* IMÁGENES REALES DE LA APP */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative w-full aspect-[4/5] lg:aspect-[3/4] flex items-center justify-center"
            >
              {/* Teléfono 2 (Atrás, Rotado): Screenshot plano estilizado como teléfono */}
              <div className="absolute left-[5%] top-[10%] w-[60%] aspect-[1/2.16] rounded-[2.5rem] border-[8px] border-slate-800 overflow-hidden shadow-2xl -rotate-6 opacity-80 hover:opacity-100 transition-all hover:scale-105 hover:-rotate-2 duration-500 z-10">
                <img 
                  src="/landing/app-mockup-2.jpg" 
                  alt="Login El Edén F.C" 
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Teléfono 1 (Frente): Mockup con marco */}
              <div className="absolute right-[0%] bottom-[5%] w-[75%] z-20 transition-transform hover:scale-105 hover:-translate-y-4 duration-500">
                <img 
                  src="/landing/app-mockup-1.png" 
                  alt="Cobranza y Finanzas Gibbor F.C" 
                  className="w-full h-auto drop-shadow-2xl"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── ROLES (SECCIÓN 2) ────────────────────────────────────────────────── */}
      <section id="roles" className="py-24 relative border-t border-white/5 bg-[#0B101E]/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">Una plataforma diseñada <span className="text-emerald-400">para todos.</span></h2>
            <p className="text-lg text-slate-400">MCM no es solo para la oficina. Es una herramienta colaborativa donde cada miembro del club tiene un rol específico y herramientas únicas.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Director', icon: <LayoutDashboard />, color: 'emerald', items: ['Gestión completa', 'Finanzas automáticas', 'Reportes gerenciales', 'Gestión de categorías'] },
              { title: 'Entrenador', icon: <Activity />, color: 'blue', items: ['Control de asistencia', 'Planificación técnica', 'Armado de convocatorias', 'Stats Lab deportivo'] },
              { title: 'Jugador', icon: <UserCheck />, color: 'amber', items: ['Perfil deportivo online', 'Carnet digital', 'Estadísticas personales', 'Gráficas de evolución'] },
              { title: 'Padres', icon: <Shield />, color: 'purple', items: ['Seguimiento en vivo', 'Historial del jugador', 'Pagos en línea', 'Comunicación oficial'] },
            ].map((role, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-${role.color}-500/10 rounded-full blur-3xl group-hover:bg-${role.color}-500/20 transition-all`}></div>
                <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-${role.color}-400 mb-6 border border-white/5`}>
                  {role.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-6">{role.title}</h3>
                <ul className="space-y-3">
                  {role.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-400">
                      <Check className={`w-4 h-4 text-${role.color}-400/70`} /> {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MÓDULOS (SECCIÓN 3) ────────────────────────────────────────────────── */}
      <section id="ecosistema" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">Todo lo que necesitas para <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">crecer.</span></h2>
            <p className="text-lg text-slate-400">Un conjunto de herramientas poderosas interconectadas para automatizar el 100% de la operación de tu academia.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { icon: <LayoutDashboard />, name: 'Dashboard', desc: 'Métricas en tiempo real' },
              { icon: <Users />, name: 'Miembros', desc: 'Base de datos centralizada' },
              { icon: <Calendar />, name: 'Agenda', desc: 'Planificación de eventos' },
              { icon: <CreditCard />, name: 'Cobros', desc: 'Facturación y pagos' },
              { icon: <ClipboardList />, name: 'Asistencia', desc: 'Control por QR o manual' },
              { icon: <BarChart />, name: 'Reportes', desc: 'Exportación a Excel avanzado' },
              { icon: <Target />, name: 'Convocatorias', desc: 'Armado de equipos' },
              { icon: <FileText />, name: 'Evaluaciones', desc: 'Rendimiento técnico' },
              { icon: <Activity />, name: 'Stats Lab', desc: 'Análisis de datos' },
              { icon: <Folder />, name: 'Documentos', desc: 'Contratos y PDFs' },
              { icon: <Settings />, name: 'Configuración', desc: 'Control total' },
              { icon: <MessageSquare />, name: 'Comunicación', desc: 'Notificaciones automáticas' },
            ].map((mod, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors flex flex-col items-center text-center gap-3"
              >
                <div className="text-emerald-400/80 mb-2">{mod.icon}</div>
                <h4 className="text-white font-bold">{mod.name}</h4>
                <p className="text-xs text-slate-500">{mod.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIMELINE (SECCIÓN 4) ────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#0B101E]/50 border-t border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">Más que administrar. <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Impulsa.</span></h2>
            <p className="text-lg text-slate-400">El objetivo de MCM es documentar y potenciar el proceso formativo de cada talento en tu academia.</p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            {/* Linea conectora */}
            <div className="absolute left-[27px] md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500/50 via-blue-500/50 to-transparent md:-translate-x-1/2"></div>
            
            {[
              { title: 'Ingreso al club', desc: 'Registro digital, pago de inscripción y asignación automática de categoría.' },
              { title: 'Entrenamientos', desc: 'El jugador asiste y el entrenador marca presencia escaneando su código QR.' },
              { title: 'Evaluaciones Técnicas', desc: 'El cuerpo técnico califica velocidad, pase, tiro y genera gráficas de araña.' },
              { title: 'Convocatorias', desc: 'Es seleccionado para el partido del fin de semana. Los padres son notificados.' },
              { title: 'Crecimiento Deportivo', desc: 'Se genera un historial inmutable que sirve como hoja de vida deportiva para el futuro.' },
            ].map((step, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className={`relative flex items-center mb-12 ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
              >
                <div className="hidden md:block w-1/2"></div>
                <div className="absolute left-0 md:left-1/2 w-14 h-14 rounded-full bg-[#0B101E] border-4 border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 md:-translate-x-1/2 z-10">
                  {idx + 1}
                </div>
                <div className={`w-full pl-20 md:w-1/2 ${idx % 2 === 0 ? 'md:pl-0 md:pr-16 md:text-right' : 'md:pl-16'}`}>
                  <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
                    <h4 className="text-xl font-bold text-white mb-2">{step.title}</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARATIVA (SECCIÓN 5) ────────────────────────────────────────────────── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">Olvídate del Excel y los grupos de WhatsApp.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-3xl p-8">
              <h3 className="text-2xl font-bold text-rose-400 mb-8 flex items-center gap-3">
                <X className="w-6 h-6" /> Antes
              </h3>
              <ul className="space-y-6">
                {['Excel desactualizado y frágil', 'Cobros manuales e incómodos', 'Asistencia en papel que se pierde', 'Información de jugadores dispersa', 'Comunicación caótica por WhatsApp'].map((txt, i) => (
                  <li key={i} className="flex items-start gap-4 text-slate-300">
                    <div className="mt-1 min-w-[24px] h-6 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 text-xs"><X className="w-3 h-3" /></div>
                    {txt}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"></div>
              <h3 className="text-2xl font-bold text-emerald-400 mb-8 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6" /> Después con MCM
              </h3>
              <ul className="space-y-6 relative z-10">
                {['Toda tu academia centralizada', 'Facturación y mora automatizada', 'Asistencia digital en tiempo real', 'Historial clínico y deportivo completo', 'Accesos separados y profesionales'].map((txt, i) => (
                  <li key={i} className="flex items-start gap-4 text-white font-medium">
                    <div className="mt-1 min-w-[24px] h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[#0B101E]"><Check className="w-3 h-3" /></div>
                    {txt}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIOS (SECCIÓN 8) ────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#0B101E]/50 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">Academias que ya dieron el salto.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Solo tenemos una academia piloto real, usaremos ese testimonio y placeholders de calidad */}
            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl flex flex-col justify-between">
              <div>
                <div className="flex gap-1 text-amber-400 mb-6">
                  <Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" />
                </div>
                <p className="text-slate-300 text-lg leading-relaxed mb-8">
                  "MCM cambió por completo la forma en que administramos Tabogo FC. La comunicación con los padres ahora es profesional y el control de cobros nos ahorra horas cada semana."
                </p>
              </div>
              <div className="flex items-center gap-4 border-t border-white/5 pt-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 border border-emerald-500/30">
                  TFC
                </div>
                <div>
                  <h4 className="text-white font-bold">Director General</h4>
                  <p className="text-slate-500 text-sm">Tabogo FC</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ (SECCIÓN 9) ────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">Preguntas Frecuentes</h2>
          </div>

          <div className="space-y-4">
            {[
              { q: '¿Necesito instalar algo en mi computadora?', a: 'No, MCM es una plataforma 100% en la nube. Puedes acceder desde cualquier navegador web en tu computadora, tablet o celular.' },
              { q: '¿Funciona desde el celular?', a: '¡Totalmente! MCM cuenta con una aplicación PWA (Progressive Web App) que los padres, jugadores y entrenadores pueden instalar directamente en sus teléfonos sin pasar por las tiendas de apps.' },
              { q: '¿Puedo tener varios entrenadores?', a: 'Sí, la plataforma es multiusuario. Puedes crear perfiles para todos tus entrenadores y asignarles categorías específicas para que solo vean y administren a sus jugadores.' },
              { q: '¿Cuánto tarda la implementación?', a: 'Tu club se crea de forma instantánea. Configurar tus planes, crear las categorías y empezar a registrar jugadores te tomará menos de una hora gracias a nuestra interfaz intuitiva.' },
              { q: '¿Cómo se manejan los cobros?', a: 'El sistema automatiza la facturación. Tú configuras el valor del plan, y MCM genera el estado de cuenta mensual de cada jugador, bloqueando accesos a morosos si así lo configuras.' },
            ].map((faq, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                <button 
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-bold text-white text-lg">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${activeFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeFaq === i && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5 pt-0 text-slate-400">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ────────────────────────────────────────────────── */}
      <footer className="relative pt-32 pb-12 border-t border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B101E] to-emerald-950/20 -z-10"></div>
        <div className="max-w-4xl mx-auto px-6 text-center mb-24">
          <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter">
            Profesionaliza tu academia <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">desde hoy.</span>
          </h2>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
            Empieza a administrar entrenamientos, pagos, jugadores y estadísticas desde una sola plataforma.
          </p>
          <Link href="/registro-club" className="inline-flex bg-emerald-500 hover:bg-emerald-400 text-[#0B101E] px-10 py-5 rounded-full text-lg font-black transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] hover:-translate-y-1 items-center gap-3">
            Solicitar Demo Gratuita <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <MCMLogo width={180} height={48} />
          </div>
          <p>© {new Date().getFullYear()} Master Club Manager. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <Link href="/terminos" className="hover:text-white transition-colors">Términos</Link>
            <Link href="/privacidad" className="hover:text-white transition-colors">Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
