import React from 'react';

export default function ConvenioPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 py-12 px-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white print:w-full print:max-w-none">
        
        {/* ========================================================================= */}
        {/* PÁGINA 1: PORTADA Y OBJETIVOS */}
        {/* ========================================================================= */}
        <div className="border border-slate-200 shadow-sm rounded-xl overflow-hidden print:shadow-none print:border-none print:rounded-none mb-12 print:mb-0 print:h-screen print:break-after-page flex flex-col">
          {/* Portada / Imagen Banner */}
          <div className="w-full h-80 bg-slate-900 relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop" 
              alt="Business Strategy" 
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
            <div className="absolute bottom-8 left-12 pr-12 text-white">
              <h1 className="text-5xl font-black tracking-tight mb-2 leading-tight">Propuesta Integral de<br/>Transformación Digital</h1>
              <p className="text-xl text-emerald-400 font-semibold tracking-wide">AT Web Solutions</p>
            </div>
          </div>

          <div className="p-12 print:p-8 flex-1 flex flex-col justify-center">
            {/* Detalles del documento */}
            <div className="border-b border-slate-200 pb-8 mb-10 flex justify-between items-end">
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Preparado para:</p>
                <p className="text-xl text-slate-800 font-black">Uniformes Master (Master Professional Play)</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Preparado por:</p>
                <p className="text-xl text-slate-800 font-black">Alex Toscano</p>
                <p className="text-sm text-slate-500 font-medium">6 de Julio de 2026</p>
              </div>
            </div>

            {/* Sección 1: Objetivo Principal */}
            <section className="mb-10">
              <h2 className="text-3xl font-black text-slate-900 mb-6 flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg">1</span>
                Objetivo Estratégico
              </h2>
              <p className="text-slate-600 leading-relaxed text-lg text-justify mb-6">
                El objetivo de esta alianza es transformar su empresa en un <strong>referente digital en la industria de la dotación deportiva</strong>, aumentando significativamente su volumen de ventas. Esto lo lograremos mediante tres pilares fundamentales:
              </p>
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-4 font-black text-xl">A</div>
                  <h3 className="font-bold text-slate-800 mb-2">Atracción (Marketing)</h3>
                  <p className="text-sm text-slate-600">Producción audiovisual de alto impacto para captar nuevos clientes en Instagram y Facebook.</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 font-black text-xl">B</div>
                  <h3 className="font-bold text-slate-800 mb-2">Conversión (Web)</h3>
                  <p className="text-sm text-slate-600">Una vitrina digital 24/7 que facilite el proceso de cotización y cierre por WhatsApp.</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4 font-black text-xl">C</div>
                  <h3 className="font-bold text-slate-800 mb-2">Control (ERP Privado)</h3>
                  <p className="text-sm text-slate-600">Un software administrativo para no perder el rastro de ningún pedido y organizar la producción.</p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PÁGINA 2: DETALLE COMMUNITY MANAGEMENT Y WEB */}
        {/* ========================================================================= */}
        <div className="border border-slate-200 shadow-sm rounded-xl overflow-hidden p-12 bg-white print:shadow-none print:border-none print:rounded-none mb-12 print:mb-0 print:min-h-screen print:break-after-page">
          <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-4">
            <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg">2</span>
            Alcance del Servicio: Marketing y Contenido
          </h2>

          {/* Estrategia de Redes */}
          <div className="mb-10">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Estrategia Omnicanal (Instagram, Facebook y WhatsApp)</h3>
            <p className="text-slate-600 mb-4 text-justify">
              No publicaremos contenido genérico. Nos enfocaremos en crear piezas audiovisuales que destaquen la <strong>calidad humana de su taller, los procesos de confección y los testimonios de escuelas</strong>. El contenido creado (Videos Verticales) será adaptado para publicarse simultáneamente en Instagram Reels y Facebook Reels, optimizando recursos y maximizando el alcance sin perder calidad.
            </p>
          </div>

          {/* Plan de Trabajo Mensual (Entregables) */}
          <div className="mb-10 bg-slate-50 border border-slate-200 rounded-xl p-8 print:break-inside-avoid">
            <h3 className="text-lg font-bold text-slate-900 mb-6 text-center uppercase tracking-widest">Cronograma de Contenido Mensual Garantizado</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-bold text-emerald-600 mb-2 flex items-center gap-2">🎬 8 Reels de Alta Calidad (2 por semana)</h4>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Videos verticales editados profesionalmente. Incluye corrección de color, subtítulos dinámicos, selección de música en tendencia y <strong>producción de audio con voz en off profesional</strong>.
                </p>
                <h4 className="font-bold text-blue-600 mb-2 flex items-center gap-2">📱 40 Historias Estratégicas (10 por semana)</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Contenido del "día a día", detrás de cámaras, encuestas interactivas y promoción directa para mantener la cuenta activa y captar el interés inmediato.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-purple-600 mb-2 flex items-center gap-2">🖼️ 4 Posts Gráficos / Carruseles (1 por semana)</h4>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Diseño de flyers promocionales, infografías de telas o mini-catálogos que el cliente puede guardar y compartir fácilmente.
                </p>
                <h4 className="font-bold text-rose-600 mb-2 flex items-center gap-2">🎥 1 Sesión de Grabación Presencial</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Visita mensual de máxima eficiencia (1 a 2 horas) a su taller para grabar en lote todo el material necesario para el mes, garantizando iluminación profesional sin detener su producción.
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-4 mt-12 print:mt-4 print:break-before-page">
            <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg">3</span>
            Alcance del Servicio: Ecosistema Tecnológico
          </h2>

          <div className="grid md:grid-cols-2 gap-8 mb-6 print:break-inside-avoid">
            <div className="border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">A. Desarrollo Página Web Web (Vitrina)</h3>
              <ul className="list-disc pl-5 space-y-2 text-slate-600 text-sm">
                <li><strong>Catálogo Interactivo:</strong> Exhibición de prendas y diseños.</li>
                <li><strong>Diseño Responsive:</strong> 100% adaptado a celulares, donde navega el 90% de sus clientes.</li>
                <li><strong>Botón Flotante WhatsApp:</strong> Redirección directa al equipo de ventas con mensajes pre-armados.</li>
                <li><strong>Hosting y Dominio:</strong> Mantenimiento de servidores rápidos y certificados de seguridad SSL.</li>
              </ul>
            </div>
            
            <div className="border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">B. Software Privado de Gestión (ERP)</h3>
              <ul className="list-disc pl-5 space-y-2 text-slate-600 text-sm">
                <li><strong>Control de Inventario:</strong> Ingreso de catálogo por códigos (SKU), tallas y especificaciones.</li>
                <li><strong>Módulo de Pedidos:</strong> Trazabilidad del pedido (Cotizado, En Confección, Terminado, Entregado).</li>
                <li><strong>Perfiles de Acceso:</strong> Vista para Director (Finanzas completas), Vendedores (solo sus ventas) y Talleres (solo órdenes de trabajo).</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PÁGINA 3: MUESTRA GRÁFICA Y DIRECCIÓN DE ARTE */}
        {/* ========================================================================= */}
        <div className="border border-slate-200 shadow-sm rounded-xl overflow-hidden p-12 bg-white print:shadow-none print:border-none print:rounded-none mb-12 print:mb-0 print:min-h-screen print:break-after-page flex flex-col justify-center">
          <h2 className="text-3xl font-black text-slate-900 mb-4 flex items-center gap-4">
            <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg">📸</span>
            Dirección de Arte y Calidad Visual
          </h2>
          <p className="text-slate-600 mb-10 text-lg">
            No somos simplemente "publicadores". Diseñaremos piezas publicitarias con estética de estudio. Esta es una muestra conceptual de la línea gráfica que desarrollaremos para resaltar sus prendas y posicionar a <strong>Uniformes Master</strong> como la opción más profesional:
          </p>
          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/uniform_before.jpg" alt="Diseño Básico" className="w-full h-auto object-contain rounded-xl shadow-md border-4 border-slate-200 opacity-80" />
              <p className="mt-6 text-base font-bold text-slate-500 uppercase tracking-widest text-center">Antes<br/><span className="text-sm font-normal text-slate-400 normal-case tracking-normal">Diseño plano sin impacto comercial.</span></p>
            </div>
            <div className="flex flex-col items-center relative">
              <div className="absolute -top-4 -right-4 bg-emerald-500 text-white font-black px-4 py-2 rounded-full shadow-lg z-10 transform rotate-12">
                NUESTRO ESTILO
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/uniform_after.jpg" alt="Diseño Impactante" className="w-full h-auto object-contain rounded-xl shadow-2xl border-4 border-emerald-500 hover:scale-105 transition-transform" />
              <p className="mt-6 text-base font-black text-slate-800 uppercase tracking-widest text-center">El Resultado AT Web Solutions<br/><span className="text-sm font-normal text-slate-500 normal-case tracking-normal">Composición, luz e información que VENDE.</span></p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PÁGINA 4: INVERSIÓN Y PLAN DE TRABAJO */}
        {/* ========================================================================= */}
        <div className="border border-slate-200 shadow-sm rounded-xl overflow-hidden p-12 bg-white print:shadow-none print:border-none print:rounded-none print:break-before-page">
          
          <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-4">
            <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg">4</span>
            Bono Especial B2B (Valor Agregado)
          </h2>
          <div className="mb-12 bg-slate-900 text-white p-8 rounded-xl flex items-center gap-8">
            <div className="text-6xl">🤝</div>
            <div>
              <h3 className="text-xl font-bold text-emerald-400 mb-2">Exposición en Master Club Manager</h3>
              <p className="text-slate-300 leading-relaxed text-sm">
                Como agencia (AT Web Solutions), desarrollamos <strong>MCM</strong>, una plataforma utilizada por múltiples clubes de fútbol y escuelas de formación deportiva a nivel nacional. Como nuestro aliado estratégico, su empresa será listada de forma gratuita y permanente en nuestra sección de <strong>"Proveedores Recomendados"</strong>. Cuando un club necesite cambiar de marca de uniformes, ustedes serán la primera opción que vean dentro de nuestro sistema.
              </p>
            </div>
          </div>

          <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-4 print:break-before-page">
            <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg">5</span>
            Propuesta de Inversión y Modelos de Pago
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12 print:break-inside-avoid">
            {/* Opción 1 */}
            <div className="border border-slate-200 rounded-xl p-8 bg-white shadow-sm flex flex-col justify-between print:break-inside-avoid">
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-1">Opción 1: Modelo Estándar</h3>
                <p className="text-xs text-slate-500 mb-6 uppercase tracking-widest font-bold">100% Pago en Efectivo</p>
                
                <div className="mb-6">
                  <p className="text-sm font-bold text-slate-800">Costo de Instalación (Web + Software)</p>
                  <p className="text-3xl font-black text-slate-900 my-1">$2.500.000 <span className="text-base font-normal text-slate-500">COP</span></p>
                  <p className="text-xs text-slate-500">Pago único (50% anticipo, 50% contra-entrega).</p>
                </div>
                
                <div className="border-t border-slate-100 pt-6">
                  <p className="text-sm font-bold text-slate-800">Fee Mensual de Operación</p>
                  <p className="text-3xl font-black text-emerald-600 my-1">$1.200.000 <span className="text-base font-normal text-emerald-600/70">COP / mes</span></p>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2">Cubre el sueldo de Community Management, grabación, edición, licencias del sistema y pago de servidores web.</p>
                </div>
              </div>
            </div>

            {/* Opción 2 */}
            <div className="border-2 border-emerald-500 rounded-xl p-8 bg-emerald-50/50 shadow-md relative flex flex-col justify-between print:break-inside-avoid">
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest">
                Recomendada por AT Web Solutions
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-1">Opción 2: Alianza Estratégica</h3>
                <p className="text-xs text-emerald-600 mb-6 uppercase tracking-widest font-bold">Flujo de caja cuidado (Canje + Efectivo)</p>
                
                <div className="mb-6">
                  <p className="text-sm font-bold text-slate-800">Costo de Instalación (Web + Software)</p>
                  <p className="text-3xl font-black text-slate-900 my-1">$2.500.000 <span className="text-base font-normal text-slate-500">COP</span></p>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    Pago único en efectivo (50% anticipo, 50% contra-entrega) para cubrir honorarios de desarrollo de la web y el ERP.
                  </p>
                </div>
                
                <div className="border-t border-emerald-200 pt-6">
                  <p className="text-sm font-bold text-slate-800">Fee Mensual Híbrido</p>
                  <p className="text-3xl font-black text-emerald-600 my-1">$600.000 <span className="text-base font-normal text-emerald-600/70">COP (efectivo)</span></p>
                  <p className="text-xl font-black text-slate-700 mb-1">+ $600.000 <span className="text-base font-normal text-slate-500">COP (saldo a favor)</span></p>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2">
                    El efectivo cubre los costos operativos ineludibles (hosting, software de edición). El saldo a favor es crédito acumulable en fábrica para EFD Gibbor.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="print:break-inside-avoid">
            <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-4 mt-8 print:mt-12">
              <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg">6</span>
              Cronograma de Arranque
            </h2>
            <div className="pl-12 border-l-2 border-slate-200 space-y-6 relative">
              <div className="relative print:break-inside-avoid">
                <div className="absolute -left-[57px] top-1 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-white"></div>
                <h4 className="font-bold text-slate-900 text-lg">Semana 1: Kickoff y Grabación</h4>
                <p className="text-slate-600 text-sm">Firma de alianza, entrega del primer 50% (o confirmación de trueque) y primera sesión de grabación en su taller.</p>
              </div>
              <div className="relative print:break-inside-avoid">
                <div className="absolute -left-[57px] top-1 w-4 h-4 rounded-full bg-slate-300 ring-4 ring-white"></div>
                <h4 className="font-bold text-slate-900 text-lg">Semana 2: Lanzamiento de Redes y Web</h4>
                <p className="text-slate-600 text-sm">Publicación del primer bloque de Reels y entrega de la página web (Vitrina) al público.</p>
              </div>
              <div className="relative print:break-inside-avoid">
                <div className="absolute -left-[57px] top-1 w-4 h-4 rounded-full bg-slate-300 ring-4 ring-white"></div>
                <h4 className="font-bold text-slate-900 text-lg">Semana 4: Entrega Fase 1 ERP</h4>
                <p className="text-slate-600 text-sm">Entrega del Módulo de Catálogo y Usuarios del software para empezar a ingresar el inventario real.</p>
              </div>
              <div className="relative print:break-inside-avoid">
                <div className="absolute -left-[57px] top-1 w-4 h-4 rounded-full bg-slate-300 ring-4 ring-white"></div>
                <h4 className="font-bold text-slate-900 text-lg">Semana 6: Entrega Final ERP</h4>
                <p className="text-slate-600 text-sm">Habilitación del Módulo de Pedidos, capacitación al equipo comercial y cierre del Setup Inicial.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
