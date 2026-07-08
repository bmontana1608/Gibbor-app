'use client';

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Heart,
  Target,
  Shield,
  Users,
  Zap,
  CheckCircle2,
  Trophy,
  Globe,
  LayoutDashboard,
  ClipboardList,
  MessageCircle,
  Briefcase,
  UserCheck,
  Building,
  Mail,
  Smartphone,
  MapPin
} from 'lucide-react';
import MCMLogo from '@/components/MCMLogo';

export default function BrandBookPage() {
  return (
    <div className="bg-[#f8f9fa] print:bg-white text-slate-800 font-sans min-h-screen">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: 1920px 1080px;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .slide {
            page-break-after: always;
            width: 1920px !important;
            height: 1080px !important;
            overflow: hidden;
            position: relative;
            background-color: #f8f9fa;
          }
          .slide-dark {
            background-color: #0B101E;
            color: white;
          }
          .slide-green {
            background-color: #10b981;
            color: white;
          }
          /* Hide nextjs dev overlays when printing */
          #nextjs-portal { display: none !important; }
        }
        @media screen {
          .slide-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2rem;
            padding: 2rem;
            background: #e2e8f0;
          }
          .slide {
            width: 1920px;
            height: 1080px;
            position: relative;
            overflow: hidden;
            background-color: #f8f9fa;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            transform-origin: top center;
            transform: scale(min(1, calc(100vw / 2000)));
            flex-shrink: 0;
          }
          .slide-dark {
            background-color: #0B101E;
            color: white;
          }
          .slide-green {
            background-color: #10b981;
            color: white;
          }
        }
      `}} />

      <div className="slide-container">
        
        {/* PARTE I: LA HISTORIA */}
        
        {/* SLIDE 1: PORTADA */}
        <div className="slide slide-dark flex">
          <div className="w-1/2 p-24 flex flex-col justify-center relative z-10 bg-[#0B101E]/90 backdrop-blur-sm">
            <div className="scale-[2] origin-left mb-24">
              <MCMLogo />
            </div>
            <h1 className="text-8xl font-black text-white leading-[1.1] mb-8">
              Brand Book<br/><span className="text-emerald-500">v2.0</span>
            </h1>
            <p className="text-4xl text-slate-300 font-light">El documento oficial de identidad, cultura y visión de Master Club Manager.</p>
            
            <div className="absolute bottom-24 left-24 border-l-4 border-emerald-500 pl-6">
              <p className="text-xl font-bold text-white tracking-widest uppercase">Propiedad de MCM</p>
              <p className="text-lg text-slate-400">© 2026 Todos los derechos reservados</p>
            </div>
          </div>
          <div className="w-1/2 relative h-full">
            <img src="/brand-book/mcm_brandbook_cover_1782916558494.png" alt="MCM Cover" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B101E] to-transparent w-1/3"></div>
          </div>
        </div>

        {/* SLIDE 2: ÍNDICE */}
        <div className="slide flex flex-col justify-center p-32">
          <h2 className="text-6xl font-black text-slate-900 mb-20 border-b-8 border-emerald-500 pb-6 inline-block">Índice del Documento</h2>
          
          <div className="grid grid-cols-3 gap-16">
            <div className="space-y-6">
              <h3 className="text-4xl font-bold text-emerald-600 mb-8">I. La Historia</h3>
              <p className="text-2xl text-slate-600 flex justify-between"><span>Carta del Fundador</span> <span className="font-bold">03</span></p>
              <p className="text-2xl text-slate-600 flex justify-between"><span>El Origen: Gibbor FC</span> <span className="font-bold">04</span></p>
              <p className="text-2xl text-slate-600 flex justify-between"><span>El Problema</span> <span className="font-bold">05</span></p>
              <p className="text-2xl text-slate-600 flex justify-between"><span>El Significado de Gibbor</span> <span className="font-bold">06</span></p>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-4xl font-bold text-emerald-600 mb-8">II. Nuestro ADN</h3>
              <p className="text-2xl text-slate-600 flex justify-between"><span>Misión y Visión</span> <span className="font-bold">08</span></p>
              <p className="text-2xl text-slate-600 flex justify-between"><span>El Manifiesto</span> <span className="font-bold">10</span></p>
              <p className="text-2xl text-slate-600 flex justify-between"><span>Valores Centrales</span> <span className="font-bold">12</span></p>
              <p className="text-2xl text-slate-600 flex justify-between"><span>Personalidad de Marca</span> <span className="font-bold">15</span></p>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-4xl font-bold text-emerald-600 mb-8">III. Visión a Futuro</h3>
              <p className="text-2xl text-slate-600 flex justify-between"><span>El Producto</span> <span className="font-bold">20</span></p>
              <p className="text-2xl text-slate-600 flex justify-between"><span>Modelo de Embajadores</span> <span className="font-bold">25</span></p>
              <p className="text-2xl text-slate-600 flex justify-between"><span>Roadmap a 5 Años</span> <span className="font-bold">30</span></p>
              <p className="text-2xl text-slate-600 flex justify-between"><span>La Visión LATAM</span> <span className="font-bold">35</span></p>
            </div>
          </div>
        </div>

        {/* SLIDE 3: CARTA DEL FUNDADOR */}
        <div className="slide flex">
          <div className="w-5/12 relative h-full">
            <img src="/brand-book/mcm_brandbook_founder_1782916574844.png" alt="Founder" className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="w-7/12 p-24 flex flex-col justify-center">
            <h2 className="text-5xl font-black text-slate-900 mb-12">La visión detrás de MCM</h2>
            
            <div className="text-2xl leading-relaxed text-slate-700 space-y-8 italic">
              <p>"Soy un apasionado por la obra social. Creo firmemente que nuestra mayor misión en la tierra es servir a los demás, usando siempre como modelo referente a Jesucristo."</p>
              
              <p>"Esto me llevó a tomar la decisión de abrir la fundación Casa Gibbor en compañía de mi esposa. Visitábamos centros de rehabilitación para llevar espacios culturales a través de la música, visitamos habitantes de calle, y nuestro objetivo siempre ha sido servir a nuestra comunidad."</p>
              
              <p>"De allí surge la idea de abrir un programa deportivo donde los niños y niñas puedan encontrar un espacio seguro lejos de las pandillas, las drogas, las malas compañías y de las pantallas. Creemos que a través del fútbol pueden aprovechar sus capacidades, aprender valores y disciplina."</p>
              
              <p className="font-bold text-emerald-600 mt-12 not-italic">— Alex Toscano, Fundador</p>
            </div>
          </div>
        </div>

        {/* SLIDE 4: EL ORIGEN - GIBBOR FC */}
        <div className="slide slide-dark flex flex-col justify-center p-32">
          <div className="flex items-center gap-6 mb-16">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center">
              <Trophy className="text-[#0B101E] w-8 h-8" />
            </div>
            <h2 className="text-6xl font-black text-white">El Origen: Gibbor FC</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-24">
            <div className="text-3xl leading-relaxed text-slate-300 space-y-8">
              <p>Así fue como surgió la escuela de formación deportiva Gibbor. Inicialmente, el proyecto era solo para los chicos de nuestra fundación.</p>
              <p>Pero poco a poco, otros jóvenes del sector se fueron sumando. Fue así como <span className="text-emerald-400 font-bold">pasamos de 10 a 46 jugadores en solo 2 meses.</span></p>
              <p>Este crecimiento exponencial trajo un nuevo problema: la administración.</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-[50px]"></div>
              <h3 className="text-3xl font-bold text-white mb-8">El dolor del crecimiento</h3>
              <ul className="space-y-6">
                <li className="flex items-start gap-4 text-2xl text-slate-300">
                  <div className="mt-1.5 min-w-[12px] h-[12px] rounded-full bg-red-500"></div>
                  Yo estaba solo administrando todo el club
                </li>
                <li className="flex items-start gap-4 text-2xl text-slate-300">
                  <div className="mt-1.5 min-w-[12px] h-[12px] rounded-full bg-red-500"></div>
                  Mensualidades sin cobrar
                </li>
                <li className="flex items-start gap-4 text-2xl text-slate-300">
                  <div className="mt-1.5 min-w-[12px] h-[12px] rounded-full bg-red-500"></div>
                  Sin un registro confiable de asistencias
                </li>
                <li className="flex items-start gap-4 text-2xl text-slate-300">
                  <div className="mt-1.5 min-w-[12px] h-[12px] rounded-full bg-red-500"></div>
                  Comunicación inefectiva por grupos de WhatsApp
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* SLIDE 5: LA SOLUCIÓN (MCM) */}
        <div className="slide flex">
          <div className="w-1/2 p-32 flex flex-col justify-center">
            <h2 className="text-6xl font-black text-slate-900 mb-12 leading-tight">De resolver un problema propio, a <span className="text-emerald-600">transformar una industria.</span></h2>
            
            <div className="text-2xl leading-relaxed text-slate-600 space-y-8">
              <p>"Decidí hacer una plataforma para administrar mi escuela. En un principio se llamaba Gibbor App ya que estaba pensada solo para mí."</p>
              
              <div className="p-8 bg-emerald-50 border-l-8 border-emerald-500 rounded-r-2xl my-12">
                <p className="font-bold text-emerald-800">"Pero luego me di cuenta que el producto final era tan bueno que podía solucionar no solo mi dolor, sino el de cientos de escuelas en Bogotá, Colombia y toda LATAM."</p>
              </div>
              
              <p>Así nació <strong>Master Club Manager (MCM)</strong>, una plataforma marca blanca donde la identidad de cada club es lo más importante.</p>
            </div>
          </div>
          <div className="w-1/2 bg-[#0B101E] relative flex items-center justify-center p-20">
            <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
            <img src="/landing/mobile-identity.png" alt="Mobile App" className="relative z-10 max-h-[80%] drop-shadow-2xl rounded-3xl" />
          </div>
        </div>

        {/* SLIDE 6: EL SIGNIFICADO DE GIBBOR */}
        <div className="slide flex flex-col justify-center items-center text-center p-32 relative">
          <img src="/brand-book/mcm_brandbook_community_1782916566694.png" alt="Community" className="absolute inset-0 w-full h-full object-cover opacity-10" />
          
          <div className="relative z-10 max-w-5xl">
            <h2 className="text-8xl font-black text-emerald-600 mb-16 tracking-tight uppercase">GIBBOR</h2>
            <h3 className="text-4xl font-bold text-slate-800 mb-12">/ ɡɪˈbɔːr / • Hebreo: "Guerrero Valiente"</h3>
            
            <p className="text-3xl leading-relaxed text-slate-700 mb-12">
              Así llamaban en la Biblia a los valientes de David. Hombres que alguna vez perdieron su propósito de vida, escondidos en una cueva, pero que encontraron esa valentía en Dios y lograron hacer grandes hazañas.
            </p>
            
            <div className="bg-white/80 backdrop-blur-md p-10 rounded-3xl shadow-xl inline-block">
              <p className="text-2xl font-bold text-slate-900">
                En Gibbor creemos que cada niño puede encontrar su propósito de vida y ser valientes para resaltar en una sociedad que cada vez está más en declive.
              </p>
            </div>
          </div>
        </div>

        {/* PARTE II: ADN DE LA MARCA */}

        {/* SLIDE 7: PORTADILLA ADN */}
        <div className="slide slide-green flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-[0.5em] mb-8 text-emerald-100 uppercase">Sección II</h2>
            <h1 className="text-8xl font-black text-white">El ADN de MCM</h1>
            <div className="w-32 h-2 bg-white mx-auto mt-12 rounded-full"></div>
          </div>
        </div>

        {/* SLIDE 8: MISIÓN Y VISIÓN */}
        <div className="slide flex flex-col justify-center p-32">
          <div className="grid grid-cols-2 gap-24 h-full items-center">
            
            <div className="bg-[#0B101E] text-white p-16 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 text-emerald-500/20">
                <Target className="w-64 h-64" />
              </div>
              <h2 className="text-5xl font-black mb-10 text-emerald-400 relative z-10">Misión</h2>
              <p className="text-3xl leading-relaxed relative z-10">
                Liberar a los directores deportivos de la carga administrativa, dándoles la tecnología necesaria para que enfoquen su tiempo en lo que realmente importa: <strong>transformar las vidas de sus jugadores.</strong>
              </p>
            </div>

            <div className="bg-white text-slate-900 p-16 rounded-[3rem] shadow-xl border border-slate-200 relative overflow-hidden">
              <div className="absolute -bottom-10 -right-10 text-slate-100">
                <Globe className="w-64 h-64" />
              </div>
              <h2 className="text-5xl font-black mb-10 text-slate-800 relative z-10">Visión</h2>
              <p className="text-3xl leading-relaxed text-slate-600 relative z-10">
                Ser el sistema operativo estándar para la formación deportiva en toda Latinoamérica, conectando a clubes, jugadores, entrenadores y familias en un solo ecosistema de crecimiento profesional.
              </p>
            </div>

          </div>
        </div>

        {/* SLIDE 9: VALORES */}
        <div className="slide bg-slate-50 flex flex-col justify-center p-32">
          <h2 className="text-6xl font-black text-slate-900 mb-20 text-center">Nuestros Valores Fundamentales</h2>
          
          <div className="grid grid-cols-3 gap-12">
            {[
              { icon: <Heart className="w-8 h-8"/>, title: "Servicio Primero", desc: "Nuestra mayor misión es servir a los demás. El software es solo nuestro medio para lograrlo." },
              { icon: <Shield className="w-8 h-8"/>, title: "Identidad Única", desc: "Creemos que cada club tiene un alma. Por eso somos marca blanca: tu escudo es el protagonista." },
              { icon: <Users className="w-8 h-8"/>, title: "Impacto Comunitario", desc: "Trabajamos para crear espacios seguros lejos de las calles. El fútbol es nuestra herramienta de cambio social." },
              { icon: <Zap className="w-8 h-8"/>, title: "Cero Fricción", desc: "La tecnología debe simplificar, no complicar. Diseñamos para que cualquiera pueda usarlo sin manuales." },
              { icon: <Trophy className="w-8 h-8"/>, title: "Formación Integral", desc: "No solo formamos atletas, formamos valientes ('Gibbor') listos para enfrentar la vida." },
              { icon: <CheckCircle2 className="w-8 h-8"/>, title: "Compromiso Total", desc: "No somos solo proveedores de software, somos aliados en el crecimiento de cada academia." }
            ].map((v, i) => (
              <div key={i} className="bg-white p-10 rounded-3xl shadow-lg border border-slate-100">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-8">
                  {v.icon}
                </div>
                <h3 className="text-3xl font-bold text-slate-800 mb-4">{v.title}</h3>
                <p className="text-xl text-slate-600 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SLIDE 10: MANIFIESTO */}
        <div className="slide slide-dark flex flex-col justify-center items-center text-center p-32 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0B101E] z-10"></div>
          <img src="/presentacion/presentation_kids_sunset_1782909713943.png" alt="Kids" className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale mix-blend-overlay" />
          
          <div className="relative z-20 max-w-6xl space-y-12">
            <h2 className="text-emerald-500 font-bold tracking-[0.3em] uppercase text-2xl mb-8">El Manifiesto MCM</h2>
            
            <p className="text-5xl font-black text-white leading-tight">
              Creemos que las hojas de cálculo no cambian el mundo. <span className="text-emerald-400">Los entrenadores sí.</span>
            </p>
            
            <p className="text-4xl font-light text-slate-300 leading-tight">
              Creemos que cada hora que un director pasa cobrando mensualidades o llenando asistencias, es una hora menos que pasa formando a la próxima generación de líderes.
            </p>

            <p className="text-4xl font-light text-slate-300 leading-tight">
              Nos negamos a aceptar que las escuelas deportivas sigan atrapadas en el caos administrativo.
            </p>

            <p className="text-5xl font-black text-white leading-tight mt-16 pt-16 border-t border-white/10">
              Nosotros construimos la infraestructura.<br/>
              <span className="text-emerald-400">Tú construyes los talentos.</span>
            </p>
          </div>
        </div>

        {/* SLIDE 10.5: PERSONALIDAD DE MARCA */}
        <div className="slide flex flex-col justify-center p-32 bg-white">
          <h2 className="text-6xl font-black text-slate-900 mb-16 text-center">Nuestra Personalidad</h2>
          <div className="flex justify-center mb-16">
            <div className="grid grid-cols-2 gap-16 max-w-5xl">
              <div className="space-y-6">
                <h3 className="text-3xl font-bold text-emerald-600 border-b-4 border-emerald-500 pb-4 inline-block">Somos</h3>
                <ul className="space-y-4 text-2xl text-slate-700">
                  <li className="flex items-center gap-4"><CheckCircle2 className="text-emerald-500 w-8 h-8"/> Cercanos y Empáticos</li>
                  <li className="flex items-center gap-4"><CheckCircle2 className="text-emerald-500 w-8 h-8"/> Valientes (Gibbor)</li>
                  <li className="flex items-center gap-4"><CheckCircle2 className="text-emerald-500 w-8 h-8"/> Inspiradores</li>
                  <li className="flex items-center gap-4"><CheckCircle2 className="text-emerald-500 w-8 h-8"/> Profesionales</li>
                </ul>
              </div>
              <div className="space-y-6">
                <h3 className="text-3xl font-bold text-red-500 border-b-4 border-red-500 pb-4 inline-block">No Somos</h3>
                <ul className="space-y-4 text-2xl text-slate-500">
                  <li className="flex items-center gap-4"><div className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center font-bold">X</div> Fríos o Corporativos</li>
                  <li className="flex items-center gap-4"><div className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center font-bold">X</div> Un software genérico</li>
                  <li className="flex items-center gap-4"><div className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center font-bold">X</div> Exclusivos o distantes</li>
                  <li className="flex items-center gap-4"><div className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center font-bold">X</div> Complicados</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* PARTE III: FUTURO Y VISIÓN */}

        {/* SLIDE 11: EL PRODUCTO */}
        <div className="slide flex">
          <div className="w-1/2 bg-[#0B101E] relative flex flex-col justify-center p-20">
            <h2 className="text-6xl font-black text-white mb-8">El Producto</h2>
            <p className="text-3xl text-emerald-400 font-light mb-12">Una plataforma, cuatro roles.</p>
            <div className="space-y-8">
              <div className="bg-white/10 p-6 rounded-2xl flex items-center gap-6">
                <LayoutDashboard className="w-12 h-12 text-emerald-500" />
                <div>
                  <h4 className="text-2xl font-bold text-white">Director</h4>
                  <p className="text-slate-300 text-lg">Control total de la academia, finanzas y reportes.</p>
                </div>
              </div>
              <div className="bg-white/10 p-6 rounded-2xl flex items-center gap-6">
                <ClipboardList className="w-12 h-12 text-blue-400" />
                <div>
                  <h4 className="text-2xl font-bold text-white">Entrenador</h4>
                  <p className="text-slate-300 text-lg">Asistencias, evaluaciones, pizarra táctica y convocatorias.</p>
                </div>
              </div>
              <div className="bg-white/10 p-6 rounded-2xl flex items-center gap-6">
                <UserCheck className="w-12 h-12 text-amber-400" />
                <div>
                  <h4 className="text-2xl font-bold text-white">Jugador / Padre</h4>
                  <p className="text-slate-300 text-lg">Carnet digital, historial deportivo, pagos y notificaciones.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="w-1/2 p-24 flex flex-col justify-center bg-slate-50">
            <h3 className="text-5xl font-black text-slate-900 mb-12">Marca Blanca Absoluta</h3>
            <p className="text-2xl text-slate-700 leading-relaxed mb-12">
              Entendemos que el escudo de cada club es sagrado. Por eso MCM se instala y configura con los colores y el logo de cada academia.
            </p>
            <div className="relative h-96 w-full flex items-center justify-center">
              <img src="/landing/dashboard.png" alt="Dashboard" className="absolute inset-0 w-full h-full object-cover rounded-3xl shadow-2xl" />
            </div>
          </div>
        </div>

        {/* SLIDE 12: MODELO DE EMBAJADORES */}
        <div className="slide flex flex-col justify-center p-32 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <h2 className="text-6xl font-black text-slate-900 mb-8 text-center">Modelo de Embajadores</h2>
          <p className="text-3xl text-emerald-600 font-bold mb-16 text-center">Ayudando a otros a crecer, mientras creces tú.</p>
          
          <div className="grid grid-cols-2 gap-16">
            <div className="text-2xl text-slate-700 leading-relaxed space-y-6">
              <p>MCM no es solo un software para escuelas. Es un motor de oportunidad económica.</p>
              <p>A través de nuestro programa de embajadores, permitimos que personas apasionadas por el fútbol generen un <strong>ingreso recurrente</strong>.</p>
              <div className="bg-emerald-50 p-8 rounded-2xl border-l-8 border-emerald-500 mt-8">
                <p className="font-bold text-emerald-800">Al recomendar MCM, no solo solucionas el caos administrativo de otras escuelas, sino que construyes tu propia estabilidad financiera, llevando un sustento digno a tu hogar.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 flex flex-col items-center text-center justify-center">
                <div className="text-5xl font-black text-emerald-500 mb-4">100%</div>
                <p className="text-lg text-slate-600">Del primer mes del club referido</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 flex flex-col items-center text-center justify-center">
                <div className="text-5xl font-black text-emerald-500 mb-4">10%</div>
                <p className="text-lg text-slate-600">Comisión mensual recurrente de por vida</p>
              </div>
              <div className="col-span-2 bg-[#0B101E] text-white p-8 rounded-3xl flex items-center justify-between">
                <div>
                  <h4 className="text-2xl font-bold mb-2">Panel de Embajador</h4>
                  <p className="text-slate-400">Control total de referidos y comisiones</p>
                </div>
                <Zap className="w-12 h-12 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* SLIDE 13: ROADMAP A 5 AÑOS */}
        <div className="slide flex flex-col justify-center p-32 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[100px] -z-10"></div>
          
          <h2 className="text-6xl font-black text-slate-900 mb-6">El Plan a 5 Años</h2>
          <p className="text-3xl text-slate-600 mb-20">Hacia dónde vamos y qué estamos construyendo.</p>
          
          <div className="relative">
            {/* Linea central */}
            <div className="absolute top-1/2 left-0 w-full h-2 bg-emerald-100 -translate-y-1/2 rounded-full"></div>
            
            <div className="grid grid-cols-4 gap-8 relative z-10">
              {/* Milestone 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-8 h-8 bg-emerald-500 rounded-full mb-8 shadow-[0_0_0_8px_white]"></div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">El Estándar Nacional</h3>
                <p className="text-lg text-slate-600">Posicionar a MCM como la plataforma para escuelas de fútbol más importante y utilizada de toda Colombia.</p>
              </div>

              {/* Milestone 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-8 h-8 bg-emerald-500 rounded-full mb-8 shadow-[0_0_0_8px_white]"></div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">Expansión LATAM</h3>
                <p className="text-lg text-slate-600">Abrir mercados y consolidar presencia oficial en Ecuador, México y Argentina.</p>
              </div>

              {/* Milestone 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-8 h-8 bg-emerald-500 rounded-full mb-8 shadow-[0_0_0_8px_white]"></div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">Motor de Empleo</h3>
                <p className="text-lg text-slate-600">Tener un equipo de trabajo amplio, brindando oportunidades para que muchas familias lleven un alimento digno a sus hogares a través de MCM.</p>
              </div>

              {/* Milestone 4 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-8 h-8 bg-[#0B101E] rounded-full mb-8 shadow-[0_0_0_8px_white]"></div>
                <h3 className="text-2xl font-bold text-emerald-600 mb-4">El Complejo Deportivo</h3>
                <p className="text-lg text-slate-600">Convertir a MCM en el principal patrocinador de Gibbor FC para lograr el gran sueño: construir nuestro propio complejo deportivo.</p>
              </div>
            </div>
          </div>
        </div>

        {/* SLIDE 12: EL GRAN SUEÑO (VISUAL) */}
        <div className="slide flex">
          <div className="w-1/2 p-32 flex flex-col justify-center bg-emerald-900 text-white relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10">
              <h2 className="text-6xl font-black mb-12 leading-tight">El Complejo Deportivo<br/>Gibbor</h2>
              <p className="text-3xl font-light leading-relaxed mb-12">
                Nuestra meta última no es solo ser una empresa de software exitosa. El software es el vehículo para financiar nuestro verdadero sueño.
              </p>
              <div className="p-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <p className="text-2xl italic font-medium">
                  "MCM debe convertirse en el principal patrocinador de Gibbor para lograr el sueño de construir nuestro propio complejo deportivo, un santuario para la juventud."
                </p>
              </div>
            </div>
          </div>
          <div className="w-1/2 relative h-full">
            <img src="/brand-book/mcm_brandbook_vision_1782916584571.png" alt="Sports Complex Vision" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>

        {/* SLIDE 13: CULTURA DE EQUIPO */}
        <div className="slide flex flex-col items-center justify-center p-32 text-center relative bg-white">
          <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mb-12">
            <Users className="w-16 h-16 text-slate-400" />
          </div>
          <h2 className="text-6xl font-black text-slate-900 mb-12">El Equipo MCM</h2>
          
          <div className="max-w-4xl mb-16">
            <p className="text-3xl text-slate-600 leading-relaxed font-light">
              Hoy, MCM es liderado e impulsado por su fundador. Pero la visión demanda multiplicar esfuerzos. 
              Estamos sentando las bases culturales para el equipo que vendrá.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 text-left w-full max-w-5xl">
            <div className="bg-slate-50 p-10 rounded-3xl border border-slate-200">
              <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                <Briefcase className="text-emerald-500" /> Oportunidad
              </h3>
              <p className="text-lg text-slate-600">Crear empleos dignos en LATAM para que más familias prosperen junto con el crecimiento tecnológico.</p>
            </div>
            <div className="bg-slate-50 p-10 rounded-3xl border border-slate-200">
              <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                <UserCheck className="text-emerald-500" /> Humildad
              </h3>
              <p className="text-lg text-slate-600">Cero egos. El mejor argumento gana, sin importar el título de quien lo proponga.</p>
            </div>
          </div>
        </div>

        {/* SLIDE 14: CONTRAPORTADA */}
        <div className="slide slide-dark flex flex-col justify-between p-24 text-center items-center">
          <div className="w-full flex justify-between items-start">
            <MCMLogo />
            <div className="text-right">
              <p className="text-emerald-500 font-bold text-xl mb-2">Master Club Manager</p>
              <p className="text-slate-400 text-lg">Bogotá, Colombia</p>
            </div>
          </div>

          <div className="max-w-4xl">
            <h2 className="text-7xl font-black text-white mb-12">Designed for football.<br/>Built with passion.</h2>
            <p className="text-3xl text-slate-400">Únete a la revolución de la gestión deportiva.</p>
          </div>

          <div className="w-full flex justify-between items-end border-t border-white/10 pt-12">
            <div className="flex gap-12">
              <div className="flex items-center gap-4 text-xl text-slate-300">
                <Mail className="w-6 h-6 text-emerald-500" /> ventas@masterclubmanager.com
              </div>
              <div className="flex items-center gap-4 text-xl text-slate-300">
                <Globe className="w-6 h-6 text-emerald-500" /> www.masterclubmanager.com
              </div>
              <div className="flex items-center gap-4 text-xl text-slate-300">
                <Smartphone className="w-6 h-6 text-emerald-500" /> +57 312 426 5170
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG 
                value="https://wa.me/573124265170?text=Hola,%20quiero%20conocer%20m%C3%A1s%20sobre%20Master%20Club%20Manager" 
                size={120}
                level="H"
                includeMargin={false}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
