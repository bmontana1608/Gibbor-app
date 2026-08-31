'use client';

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  FileSpreadsheet,
  MessageCircle,
  BookOpen,
  Users,
  BarChart,
  UserCheck,
  LayoutDashboard,
  ClipboardList,
  TrendingUp,
  Target,
  Folder,
  Settings,
  Headset,
  RefreshCw,
  Clock,
  Briefcase,
  Smartphone,
  Mail
} from 'lucide-react';
import MCMLogo from '@/components/MCMLogo';

export default function PresentacionMCM() {
  const [planes, setPlanes] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/planes-publicos')
      .then(res => res.json())
      .then(data => setPlanes(data))
      .catch(err => console.error("Error fetching planes:", err));
  }, []);

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
          /* Hide nextjs dev overlays when printing */
          #nextjs-portal { display: none !important; }
        }
        @media screen {
          .slide-container {
            display: flex;
            flex-direction: column;
            /* Alinear a la izquierda para evitar que Flexbox empuje el div original de 1920px fuera de la pantalla */
            align-items: flex-start;
            padding: 2rem;
            background: #e2e8f0;
            overflow-x: hidden;
            /* Centrar el contenedor en pantallas grandes */
            max-width: 100vw;
          }
          .slide {
            width: 1920px;
            height: 1080px;
            position: relative;
            overflow: hidden;
            background-color: #f8f9fa;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            
            /* Escalar desde la esquina superior izquierda */
            transform-origin: top left;
            transform: scale(min(1, calc((100vw - 4rem) / 1920)));
            
            /* Eliminar el espacio fantasma (bounding box original) que deja el transform */
            margin-bottom: calc( -1080px * (1 - min(1, calc((100vw - 4rem) / 1920))) + 2rem );
            margin-right: calc( -1920px * (1 - min(1, calc((100vw - 4rem) / 1920))) );
          }
          
          /* Si la pantalla es más grande que 1920px, centramos normalmente */
          @media (min-width: 1984px) {
            .slide-container {
              align-items: center;
            }
            .slide {
              transform: scale(1);
              margin-bottom: 2rem;
              margin-right: 0;
            }
          }
          .slide-dark {
            background-color: #0B101E;
            color: white;
          }
        }
      `}} />

      <div className="slide-container">
        
        {/* SLIDE 1: PORTADA */}
        <div className="slide slide-dark flex">
          <div className="w-1/2 p-24 flex flex-col justify-center relative z-10">
            <div className="absolute top-16 left-16 bg-emerald-500 text-[#0B101E] w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl">1</div>
            <div className="scale-150 origin-left mb-16">
              <MCMLogo />
            </div>
            <h1 className="text-7xl font-black text-white leading-[1.1] mb-12">
              El sistema operativo<br/>para escuelas<br/>de fÃºtbol.
            </h1>
            <p className="text-4xl font-bold text-emerald-500">Organiza. Controla. Crece.</p>
          </div>
          <div className="w-1/2 relative h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B101E] via-[#0B101E]/80 to-transparent z-10 w-1/3"></div>
            <img src="/presentacion/presentation_kids_sunset_1782909713943.png" alt="Kids" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>

        {/* SLIDE 2: HISTORIA */}
        <div className="slide flex">
          <div className="w-1/2 p-24 flex flex-col justify-center relative">
            <div className="absolute top-16 left-16 bg-emerald-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl">2</div>
            <h2 className="text-6xl font-black text-slate-900 leading-tight mb-16">NOSOTROS TAMBIÃ‰N<br/>VIVIMOS ESTE PROBLEMA</h2>
            <div className="space-y-12 text-3xl text-slate-600 font-medium">
              <p>No nacimos como una empresa de software.</p>
              <p className="text-slate-900 font-bold">Nacimos dentro de una escuela de fÃºtbol.</p>
              <p>Durante aÃ±os vivimos exactamente los mismos desafÃ­os que viven cientos de directores todos los dÃ­as.</p>
            </div>
          </div>
          <div className="w-1/2 relative h-full">
            <img src="/presentacion/presentation_coach_behind_1782909722411.png" alt="Coach" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[80%] bg-[#0B101E] rounded-3xl p-8 flex justify-between shadow-2xl text-white">
              <div className="flex flex-col items-center gap-2"><LayoutDashboard className="w-12 h-12 text-emerald-500"/><span className="text-xl">Organizar</span></div>
              <div className="flex flex-col items-center gap-2"><ClipboardList className="w-12 h-12 text-emerald-500"/><span className="text-xl">Controlar</span></div>
              <div className="flex flex-col items-center gap-2"><MessageCircle className="w-12 h-12 text-emerald-500"/><span className="text-xl">Comunicar con</span></div>
            </div>
          </div>
        </div>

        {/* SLIDE 3: EL PROBLEMA */}
        <div className="slide flex flex-col items-center justify-center p-24 relative">
          <div className="absolute top-16 left-16 bg-emerald-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl">3</div>
          <h2 className="text-6xl font-black text-emerald-600 mb-8 self-start">EL PROBLEMA</h2>
          <p className="text-3xl text-slate-700 font-medium self-start mb-24">La mayorÃ­a de escuelas todavÃ­a administran<br/>su operaciÃ³n con:</p>
          
          <div className="flex justify-between w-full max-w-5xl mb-32">
            <div className="flex flex-col items-center gap-6"><FileSpreadsheet className="w-32 h-32 text-green-600"/><span className="text-3xl font-bold text-slate-800">Excel</span></div>
            <div className="flex flex-col items-center gap-6"><MessageCircle className="w-32 h-32 text-emerald-500"/><span className="text-3xl font-bold text-slate-800">WhatsApp</span></div>
            <div className="flex flex-col items-center gap-6"><BookOpen className="w-32 h-32 text-slate-600"/><span className="text-3xl font-bold text-slate-800">Cuadernos</span></div>
            <div className="flex flex-col items-center gap-6"><Users className="w-32 h-32 text-slate-800"/><span className="text-3xl font-bold text-slate-800 text-center">Grupos<br/>dispersos</span></div>
          </div>

          <div className="grid grid-cols-2 gap-x-32 gap-y-12 w-full max-w-5xl">
            <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-red-500"/> InformaciÃ³n perdida</div>
            <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-red-500"/> Padres desinformados</div>
            <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-red-500"/> Pagos atrasados</div>
            <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-red-500"/> Tiempo desperdiciado</div>
            <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-red-500"/> Poco control sobre el crecimiento</div>
          </div>
        </div>

        {/* SLIDE 4: IMAGINA */}
        <div className="slide flex">
          <div className="absolute top-16 left-16 bg-emerald-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl z-20">4</div>
          <div className="w-2/5 p-24 flex flex-col justify-center relative z-10">
            <h2 className="text-6xl font-black text-slate-900 leading-tight mb-8">
              IMAGINA ADMINISTRAR<br/>TU ESCUELA DESDE<br/><span className="text-emerald-600">UN SOLO LUGAR</span>
            </h2>
            <div className="grid grid-cols-2 gap-y-12 gap-x-8 mt-16">
              <div className="flex flex-col gap-4">
                <LayoutDashboard className="w-12 h-12 text-emerald-500"/>
                <span className="text-2xl font-bold text-slate-700">Todo tu club<br/>organizado</span>
              </div>
              <div className="flex flex-col gap-4">
                <RefreshCw className="w-12 h-12 text-emerald-500"/>
                <span className="text-2xl font-bold text-slate-700">InformaciÃ³n<br/>siempre actualizada</span>
              </div>
              <div className="flex flex-col gap-4">
                <MessageCircle className="w-12 h-12 text-emerald-500"/>
                <span className="text-2xl font-bold text-slate-700">ComunicaciÃ³n<br/>efectiva</span>
              </div>
              <div className="flex flex-col gap-4">
                <BarChart className="w-12 h-12 text-emerald-500"/>
                <span className="text-2xl font-bold text-slate-700">Decisiones con<br/>datos reales</span>
              </div>
            </div>
          </div>
          <div className="w-3/5 relative h-full flex items-center justify-center bg-gradient-to-bl from-slate-100 to-slate-200">
            <img src="/landing/dashboard.png" alt="Dashboard" className="absolute right-[50px] top-[150px] w-[1100px] drop-shadow-2xl rounded-xl" />
            <img src="/landing/app-mockup-1.png" alt="App" className="absolute right-[150px] bottom-[50px] w-[350px] drop-shadow-2xl" />
          </div>
        </div>

        {/* SLIDE 5: QUE ES MCM */}
        <div className="slide flex flex-col justify-center items-center relative">
          <div className="absolute top-16 left-16 bg-emerald-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl">5</div>
          <div className="w-full max-w-6xl flex justify-between items-center mb-32">
            <div className="w-[60%]">
              <h2 className="text-6xl font-black text-slate-900 mb-4">Â¿QUÃ‰ ES<br/><span className="text-emerald-600">MASTER CLUB MANAGER?</span></h2>
              <p className="text-3xl text-slate-600 mt-12 mb-8 max-w-2xl">
                Master Club Manager es una plataforma diseÃ±ada <strong>exclusivamente para escuelas de fÃºtbol.</strong>
              </p>
              <p className="text-3xl text-slate-600 max-w-2xl">
                Centraliza toda la operaciÃ³n del club en un solo lugar.
              </p>
            </div>
            <div className="w-[40%] flex justify-end">
              <div className="scale-[2.0] origin-right">
                <MCMLogo variant="dark" />
              </div>
            </div>
          </div>
          <div className="w-full max-w-6xl flex justify-start gap-32">
            <div className="flex flex-col items-center gap-6"><UserCheck className="w-20 h-20 text-slate-800"/><span className="text-2xl font-bold text-slate-700">Jugadores</span></div>
            <div className="flex flex-col items-center gap-6"><Users className="w-20 h-20 text-slate-800"/><span className="text-2xl font-bold text-slate-700">Entrenadores</span></div>
            <div className="flex flex-col items-center gap-6"><Briefcase className="w-20 h-20 text-slate-800"/><span className="text-2xl font-bold text-slate-700">Directores</span></div>
            <div className="flex flex-col items-center gap-6"><MessageCircle className="w-20 h-20 text-slate-800"/><span className="text-2xl font-bold text-slate-700">Padres</span></div>
          </div>
        </div>

        {/* SLIDE 6: PERFILES */}
        <div className="slide flex flex-col p-24 relative">
          <div className="absolute top-16 left-16 bg-emerald-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl">6</div>
          <h2 className="text-6xl font-black text-slate-900 mb-8">UN PERFIL PARA<br/><span className="text-emerald-600">CADA PERSONA</span></h2>
          <p className="text-3xl text-slate-600 mb-20 max-w-3xl">Cada usuario tiene lo que necesita, con una experiencia diseÃ±ada para su rol.</p>
          
          <div className="grid grid-cols-3 gap-12 w-full h-[600px]">
            <div className="bg-[#0B101E] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
              <img src="/presentacion/presentation_director_tablet_1782909730470.png" alt="Director" className="w-full h-[65%] object-cover" />
              <div className="p-10 flex-1 flex flex-col justify-center items-center">
                <span className="text-emerald-500 font-bold text-2xl mb-4 flex items-center gap-4"><Briefcase className="w-8 h-8"/> DIRECTOR</span>
                <p className="text-white text-xl text-center">Administra todo el club</p>
              </div>
            </div>
            <div className="bg-[#0B101E] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
              <img src="/presentacion/presentation_coach_field_1782909767378.png" alt="Entrenador" className="w-full h-[65%] object-cover" />
              <div className="p-10 flex-1 flex flex-col justify-center items-center">
                <span className="text-emerald-500 font-bold text-2xl mb-4 flex items-center gap-4"><Users className="w-8 h-8"/> ENTRENADOR</span>
                <p className="text-white text-xl text-center">Gestiona a sus equipos y jugadores</p>
              </div>
            </div>
            <div className="bg-[#0B101E] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
              <img src="/presentacion/presentation_kid_phone_1782909775735.png" alt="Jugador" className="w-full h-[65%] object-cover" />
              <div className="p-10 flex-1 flex flex-col justify-center items-center">
                <span className="text-emerald-500 font-bold text-2xl mb-4 flex items-center gap-4"><UserCheck className="w-8 h-8"/> FUTBOLISTA</span>
                <p className="text-white text-xl text-center">Accede a su informaciÃ³n y actividades</p>
              </div>
            </div>
          </div>
        </div>

        {/* SLIDE 7: EL DIRECTOR */}
        <div className="slide flex">
          <div className="absolute top-16 left-16 bg-emerald-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl z-20">7</div>
          <div className="w-1/2 p-24 flex flex-col justify-center relative z-10">
            <h2 className="text-6xl font-black text-slate-900 mb-8">EL <span className="text-emerald-600">DIRECTOR</span></h2>
            <p className="text-3xl text-slate-600 mb-16">Todo el control del club<br/>desde un solo lugar.</p>
            
            <div className="space-y-10">
              <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-emerald-500"/> AdministraciÃ³n completa</div>
              <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-emerald-500"/> Asistencia y entrenamientos</div>
              <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-emerald-500"/> Pagos y cartera</div>
              <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-emerald-500"/> CategorÃ­as y equipos</div>
              <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-emerald-500"/> Entrenadores y staff</div>
              <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-emerald-500"/> EstadÃ­sticas y reportes</div>
            </div>
          </div>
          <div className="w-1/2 relative h-full flex items-center justify-center overflow-hidden">
            <img src="/landing/dashboard.png" alt="Dashboard" className="w-[1200px] drop-shadow-2xl rounded-xl translate-x-20" />
          </div>
        </div>

        {/* SLIDE 8: EL ENTRENADOR */}
        <div className="slide flex">
          <div className="absolute top-16 left-16 bg-emerald-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl z-20">8</div>
          <div className="w-1/2 p-24 flex flex-col justify-center relative z-10">
            <h2 className="text-6xl font-black text-slate-900 mb-8">EL <span className="text-emerald-600">ENTRENADOR</span></h2>
            <p className="text-3xl text-slate-600 mb-16">Toda la informaciÃ³n de sus<br/>jugadores en la palma de su mano.</p>
            
            <p className="text-3xl text-slate-800 font-bold mb-10">Puede registrar:</p>
            <div className="space-y-10">
              <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-emerald-500"/> Asistencia</div>
              <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-emerald-500"/> Evaluaciones</div>
              <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-emerald-500"/> Observaciones</div>
              <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-emerald-500"/> Rendimiento</div>
              <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-emerald-500"/> Planificaciones</div>
            </div>
          </div>
          <div className="w-1/2 relative h-full flex items-center justify-center">
            <div className="relative w-[450px] h-[900px] bg-[#0B101E] rounded-[60px] p-4 shadow-2xl border-[12px] border-slate-800 flex flex-col items-center overflow-hidden">
               <img src="/landing/app-mockup-1.png" className="w-full scale-105 translate-y-4" alt="" />
            </div>
          </div>
        </div>

        {/* SLIDE 9: EL FUTBOLISTA */}
        <div className="slide flex">
          <div className="absolute top-16 left-16 bg-emerald-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl z-20">9</div>
          <div className="w-1/2 p-24 flex flex-col justify-center relative z-10">
            <h2 className="text-6xl font-black text-slate-900 mb-8">EL <span className="text-emerald-600">FUTBOLISTA</span></h2>
            <p className="text-3xl text-slate-600 mb-16">Cada jugador puede consultar:</p>
            
            <div className="space-y-10">
              <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-emerald-500"/> PrÃ³ximos entrenamientos</div>
              <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-emerald-500"/> Asistencia</div>
              <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-emerald-500"/> InformaciÃ³n personal</div>
              <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-emerald-500"/> Evaluaciones</div>
              <div className="flex items-center gap-6 text-3xl font-bold text-slate-700"><CheckCircle2 className="w-10 h-10 text-emerald-500"/> Y prÃ³ximamente mucho mÃ¡s</div>
            </div>
          </div>
          <div className="w-1/2 relative h-full flex items-center justify-center">
            <div className="relative w-[450px] h-[900px] bg-[#0B101E] rounded-[60px] p-4 shadow-2xl border-[12px] border-slate-800 flex flex-col items-center overflow-hidden">
               <img src="/landing/mobile-identity.png" className="w-full scale-105 translate-y-4" alt="" />
            </div>
          </div>
        </div>

        {/* SLIDE 10: BENEFICIOS */}
        <div className="slide slide-dark flex flex-col p-24 relative">
          <div className="absolute top-16 left-16 bg-emerald-500 text-[#0B101E] w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl z-20">10</div>
          <div className="absolute inset-0 opacity-[0.05]">
             <img src="/presentacion/presentation_coach_field_1782909767378.png" className="w-full h-full object-cover grayscale" alt=""/>
          </div>
          
          <h2 className="text-6xl font-black text-emerald-500 mb-32 text-center relative z-10 mt-12">BENEFICIOS</h2>
          
          <div className="grid grid-cols-3 gap-y-32 relative z-10 w-full max-w-6xl mx-auto">
            <div className="flex flex-col items-center gap-8">
              <div className="w-32 h-32 border-4 border-emerald-500 rounded-3xl flex items-center justify-center"><Folder className="w-16 h-16 text-emerald-500"/></div>
              <span className="text-4xl font-bold text-white text-center">MÃ¡s<br/>organizaciÃ³n</span>
            </div>
            <div className="flex flex-col items-center gap-8">
              <div className="w-32 h-32 border-4 border-emerald-500 rounded-full flex items-center justify-center"><Clock className="w-16 h-16 text-emerald-500"/></div>
              <span className="text-4xl font-bold text-white text-center">MÃ¡s<br/>tiempo</span>
            </div>
            <div className="flex flex-col items-center gap-8">
              <div className="w-32 h-32 border-4 border-emerald-500 rounded-3xl flex items-center justify-center"><ClipboardList className="w-16 h-16 text-emerald-500"/></div>
              <span className="text-4xl font-bold text-white text-center">Menos tareas<br/>administrativas</span>
            </div>
            <div className="flex flex-col items-center gap-8">
              <div className="w-32 h-32 border-4 border-emerald-500 rounded-full flex items-center justify-center"><MessageCircle className="w-16 h-16 text-emerald-500"/></div>
              <span className="text-4xl font-bold text-white text-center">Mejor<br/>comunicaciÃ³n</span>
            </div>
            <div className="flex flex-col items-center gap-8">
              <div className="w-32 h-32 border-4 border-emerald-500 rounded-full flex items-center justify-center"><Target className="w-16 h-16 text-emerald-500"/></div>
              <span className="text-4xl font-bold text-white text-center">Mayor<br/>control</span>
            </div>
            <div className="flex flex-col items-center gap-8">
              <div className="w-32 h-32 border-4 border-emerald-500 rounded-3xl flex items-center justify-center"><TrendingUp className="w-16 h-16 text-emerald-500"/></div>
              <span className="text-4xl font-bold text-white text-center">MÃ¡s<br/>crecimiento</span>
            </div>
          </div>
        </div>

        {/* SLIDE 11: POR QUE MCM */}
        <div className="slide flex">
          <div className="absolute top-16 left-16 bg-emerald-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl z-20">11</div>
          <div className="w-1/2 p-24 flex flex-col justify-center relative z-10">
            <h2 className="text-6xl font-black text-slate-900 mb-16">Â¿POR QUÃ‰ <span className="text-emerald-600">ELEGIR MCM?</span></h2>
            
            <div className="space-y-12 text-3xl text-slate-700 font-medium leading-normal">
              <p>No es un software genÃ©rico.</p>
              <p className="text-slate-900 font-black text-4xl leading-snug">Fue creado especÃ­ficamente<br/>para escuelas de fÃºtbol.</p>
              <p>Eso significa que entendemos<br/>la realidad del dÃ­a a dÃ­a y<br/>seguimos mejorando junto<br/>a entrenadores y directores<br/>como tÃº.</p>
            </div>
          </div>
          <div className="w-1/2 relative h-full">
             <img src="/presentacion/presentation_coach_kid_17_1782909783219.png" alt="Coach" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>

        {/* SLIDE 12: PLANES */}
        <div className="slide flex flex-col items-center p-24 relative">
          <div className="absolute top-16 left-16 bg-emerald-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl">12</div>
          <h2 className="text-6xl font-black text-emerald-600 mb-24 self-start">PLANES</h2>
          
          {planes.length === 0 ? (
            <div className="text-4xl text-slate-500 mt-32">Cargando planes...</div>
          ) : (
            <div className="flex gap-12 w-full justify-center">
              {planes.slice(0,3).map((plan, idx) => {
                const isPro = idx === 1 || plan.nombre.toLowerCase().includes('pro');
                
                // Forzar precios 30 USD mensual y 300 USD anual
                const isAnual = plan.nombre.toLowerCase().includes('anual') || plan.precio_base > 200000;
                const precioUSD = isAnual ? 300 : 30;
                const sufijoPago = isAnual ? 'aÃ±o' : 'mes';

                return (
                  <div key={plan.id} className={`w-[450px] rounded-[40px] p-12 flex flex-col shadow-2xl relative ${isPro ? 'bg-[#0B101E] text-white border-4 border-emerald-500 scale-105' : 'bg-white border-2 border-slate-200 text-slate-900'}`}>
                    <h3 className={`text-2xl font-bold mb-10 uppercase text-center ${isPro ? 'text-white' : 'text-slate-900'}`}>{plan.nombre}</h3>
                    <div className="text-center mb-8">
                      <span className="text-6xl font-black">${precioUSD}</span>
                      <br/>
                      <span className={`text-xl ${isPro ? 'text-slate-400' : 'text-slate-500'}`}>USD/{plan.tipo_cobro === 'FIJO' ? sufijoPago : 'jugador'}</span>
                    </div>
                    {plan.limite_jugadores_base > 0 ? (
                      <p className={`text-center text-xl mb-4`}>
                        Hasta {plan.limite_jugadores_base} jugadores
                      </p>
                    ) : (
                      <div className="mb-4"></div>
                    )}
                    
                    {plan.tipo_cobro === 'FIJO' && (
                       <p className={`text-center text-lg mb-8 pb-8 border-b font-medium ${isPro ? 'text-emerald-400 border-white/10' : 'text-emerald-600 border-slate-200'}`}>
                         Jugador adicional: $0.50 USD
                       </p>
                    )}
                    
                    {plan.tipo_cobro !== 'FIJO' && (
                       <div className="mb-8 pb-8 border-b border-white/10"></div>
                    )}
                    
                    <div className="flex-1 space-y-8">
                      <div className="flex items-center gap-4 text-xl"><CheckCircle2 className="w-8 h-8 text-emerald-500"/> Todas las funcionalidades</div>
                      <div className="flex items-center gap-4 text-xl"><CheckCircle2 className="w-8 h-8 text-emerald-500"/> Soporte incluido</div>
                      <div className="flex items-center gap-4 text-xl"><CheckCircle2 className="w-8 h-8 text-emerald-500"/> Actualizaciones constantes</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* SLIDE 13: IMPLEMENTACIÃ“N */}
        <div className="slide flex flex-col p-24 relative">
          <div className="absolute top-16 left-16 bg-emerald-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl">13</div>
          <h2 className="text-6xl font-black text-slate-900 mb-4">IMPLEMENTACIÃ“N</h2>
          <h2 className="text-6xl font-black text-emerald-600 mb-40">SENCILLA</h2>
          
          <div className="flex justify-between w-full max-w-6xl mx-auto mb-32 relative">
            <div className="absolute top-16 left-0 w-full h-2 bg-slate-200 z-0"></div>
            
            <div className="flex flex-col items-center w-64 relative z-10 pt-8">
               <div className="w-20 h-20 rounded-full border-[6px] border-emerald-500 bg-white flex items-center justify-center text-3xl font-bold text-emerald-500 mb-12 mt-[-40px]">1</div>
               <div className="bg-white rounded-[40px] w-full p-10 flex flex-col items-center shadow-2xl border border-slate-100 h-72 justify-center gap-8">
                 <Settings className="w-20 h-20 text-slate-800" />
                 <span className="text-3xl font-bold text-slate-800 text-center">Creamos tu<br/>escuela</span>
               </div>
            </div>
            
            <div className="flex flex-col items-center w-64 relative z-10 pt-8">
               <div className="w-20 h-20 rounded-full border-[6px] border-emerald-500 bg-white flex items-center justify-center text-3xl font-bold text-emerald-500 mb-12 mt-[-40px]">2</div>
               <div className="bg-white rounded-[40px] w-full p-10 flex flex-col items-center shadow-2xl border border-slate-100 h-72 justify-center gap-8">
                 <Users className="w-20 h-20 text-slate-800" />
                 <span className="text-3xl font-bold text-slate-800 text-center">Importamos<br/>tus jugadores</span>
               </div>
            </div>
            
            <div className="flex flex-col items-center w-64 relative z-10 pt-8">
               <div className="w-20 h-20 rounded-full border-[6px] border-emerald-500 bg-white flex items-center justify-center text-3xl font-bold text-emerald-500 mb-12 mt-[-40px]">3</div>
               <div className="bg-white rounded-[40px] w-full p-10 flex flex-col items-center shadow-2xl border border-slate-100 h-72 justify-center gap-8">
                 <Headset className="w-20 h-20 text-slate-800" />
                 <span className="text-3xl font-bold text-slate-800 text-center">Capacitamos a<br/>tu equipo</span>
               </div>
            </div>
            
            <div className="flex flex-col items-center w-64 relative z-10 pt-8">
               <div className="w-20 h-20 rounded-full border-[6px] border-emerald-500 bg-white flex items-center justify-center text-3xl font-bold text-emerald-500 mb-12 mt-[-40px]">4</div>
               <div className="bg-white rounded-[40px] w-full p-10 flex flex-col items-center shadow-2xl border border-slate-100 h-72 justify-center gap-8">
                 <LayoutDashboard className="w-20 h-20 text-slate-800" />
                 <span className="text-3xl font-bold text-slate-800 text-center">Empiezas a<br/>trabajar</span>
               </div>
            </div>
          </div>
          
          <p className="text-center text-3xl font-bold text-slate-800">Sin procesos complicados. Sin letras pequeÃ±as.</p>
        </div>

        {/* SLIDE 14: SOPORTE */}
        <div className="slide flex">
          <div className="absolute top-16 left-16 bg-emerald-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl z-20">14</div>
          <div className="w-[55%] p-24 flex flex-col justify-center relative z-10">
            <h2 className="text-6xl font-black text-slate-900 mb-12">SOPORTE QUE <span className="text-emerald-600">TE ACOMPAÃ‘A</span></h2>
            
            <div className="space-y-4 text-3xl text-slate-700 font-medium mb-32">
              <p>No vendemos un software.</p>
              <p className="text-slate-900 font-bold">AcompaÃ±amos el crecimiento<br/>de tu escuela.</p>
            </div>
            
            <div className="flex justify-between w-full pr-12">
               <div className="flex flex-col items-center text-center gap-6">
                 <Clock className="w-16 h-16 text-slate-800"/>
                 <span className="text-2xl font-bold text-slate-800">Soporte<br/>rÃ¡pido</span>
               </div>
               <div className="flex flex-col items-center text-center gap-6">
                 <BookOpen className="w-16 h-16 text-slate-800"/>
                 <span className="text-2xl font-bold text-slate-800">CapacitaciÃ³n<br/>continua</span>
               </div>
               <div className="flex flex-col items-center text-center gap-6">
                 <RefreshCw className="w-16 h-16 text-slate-800"/>
                 <span className="text-2xl font-bold text-slate-800">Actualizaciones<br/>constantes</span>
               </div>
               <div className="flex flex-col items-center text-center gap-6">
                 <TrendingUp className="w-16 h-16 text-slate-800"/>
                 <span className="text-2xl font-bold text-slate-800">Mejora<br/>continua</span>
               </div>
            </div>
          </div>
          <div className="w-[45%] relative h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-[#f8f9fa] via-transparent to-transparent z-10 w-32"></div>
            <img src="/presentacion/presentation_support_1782909812030.png" alt="Support" className="absolute inset-0 w-full h-full object-cover object-left" />
          </div>
        </div>

        {/* SLIDE 15: VISION */}
        <div className="slide flex">
          <div className="absolute top-16 left-16 bg-emerald-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl z-20">15</div>
          <div className="w-1/2 p-24 flex flex-col justify-center relative z-10">
            <h2 className="text-6xl font-black text-slate-900 mb-16">NUESTRA <span className="text-emerald-600">VISIÃ“N</span></h2>
            
            <div className="text-8xl text-emerald-500 font-serif mb-8">"</div>
            <p className="text-4xl text-slate-800 font-medium leading-relaxed">
              Queremos ayudar a<br/>miles de escuelas de fÃºtbol<br/>de LatinoamÃ©rica a dedicar<br/>menos tiempo a la administraciÃ³n<br/>y mÃ¡s tiempo a formar jugadores<br/>y transformar vidas.
            </p>
          </div>
          <div className="w-1/2 relative h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-[#f8f9fa] via-transparent to-transparent z-10 w-48"></div>
            <img src="/presentacion/presentation_kids_sunset_1782909713943.png" alt="Vision" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>

        {/* SLIDE 16: GRACIAS */}
        <div className="slide slide-dark flex flex-col items-center justify-center p-24 relative">
          <div className="absolute top-16 left-16 bg-emerald-500 text-[#0B101E] w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl z-20">16</div>
          <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
             
             <div className="w-[45%] pr-24 border-r-2 border-white/10 flex flex-col h-full justify-center">
                <h2 className="text-8xl font-black text-emerald-500 mb-12">GRACIAS</h2>
                <p className="text-4xl text-white font-medium mb-32 leading-snug">
                  Solicita una demostraciÃ³n<br/>personalizada sin compromiso.
                </p>
                <div className="scale-[2.0] origin-left">
                  <MCMLogo />
                </div>
             </div>
             
             <div className="w-[55%] pl-24 flex flex-col gap-12">
                <div className="flex items-center gap-12">
                  <div className="w-20 h-20 border-4 border-emerald-500 rounded-full flex items-center justify-center text-emerald-500"><Smartphone className="w-10 h-10"/></div>
                  <div>
                    <p className="text-white font-bold text-3xl">WhatsApp</p>
                    <p className="text-slate-400 text-3xl">+57 312 426 5170</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-12">
                  <div className="w-20 h-20 border-4 border-emerald-500 rounded-full flex items-center justify-center text-emerald-500"><Mail className="w-10 h-10"/></div>
                  <div>
                    <p className="text-white font-bold text-3xl">Correo</p>
                    <p className="text-slate-400 text-3xl">ventas@masterclubmanager.com</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-12">
                  <div className="w-20 h-20 border-4 border-emerald-500 rounded-full flex items-center justify-center text-emerald-500"><LayoutDashboard className="w-10 h-10"/></div>
                  <div>
                    <p className="text-white font-bold text-3xl">Sitio web</p>
                    <p className="text-slate-400 text-3xl">www.masterclubmanager.com</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-12 mt-12">
                   <div className="bg-white p-6 rounded-3xl">
                     <QRCodeSVG value="https://wa.me/573124265170?text=Hola,%20me%20gustar%C3%ADa%20una%20demostraci%C3%B3n%20de%20MCM" size={160} />
                   </div>
                   <p className="text-slate-400 text-2xl max-w-[250px] leading-snug">
                     Escanea para agendar tu demo
                   </p>
                </div>
             </div>
             
          </div>
        </div>

      </div>
    </div>
  );
}


