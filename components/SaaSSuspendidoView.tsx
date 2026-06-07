'use client';

import { AlertCircle, CheckCircle2, LogOut } from 'lucide-react';

export default function SaaSSuspendidoView({ club, tarifaBase, wppNumber }: { club: any, tarifaBase: number, wppNumber: string }) {
  const cleanNumber = wppNumber.replace(/[^0-9]/g, '');

  return (
    <div className="min-h-full bg-[#FAFAFA] flex flex-col p-6 font-sans w-full">
      
      <div className="w-full max-w-5xl mx-auto space-y-6">
        
        {/* BANNER ROJO DE SUSPENSIÓN (Tema Claro) */}
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4">
           <div className="bg-white text-red-500 p-3 rounded-full flex-shrink-0 border border-red-100 shadow-sm">
              <AlertCircle className="w-8 h-8" />
           </div>
           <div className="text-center sm:text-left flex-1 mt-1">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Tu club está inactivo</h1>
              <p className="text-slate-600 text-sm">
                La suscripción de tu club ha sido suspendida. Puedes reactivarla realizando el pago o contactando a nuestro equipo.
              </p>
           </div>
        </div>

        {/* BOTONES DE ACCIÓN (WhatsApp verde, Verificar Naranja, Cerrar sesión Gris) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           <a 
             href={`https://wa.me/${cleanNumber}?text=Hola,%20soy%20del%20club%20${encodeURIComponent(club?.nombre || '')}.%20Quiero%20ponerme%20al%20d%C3%ADa%20con%20mi%20suscripci%C3%B3n.`}
             target="_blank"
             rel="noopener noreferrer"
             className="bg-[#16A34A] hover:bg-[#15803d] text-white p-3.5 rounded-xl font-bold text-center transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
           >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/></svg>
              Contactar por WhatsApp
           </a>
           <button 
             onClick={() => window.location.reload()}
             className="bg-[#EA580C] hover:bg-[#C2410C] text-white p-3.5 rounded-xl font-bold text-center transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
           >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Verificar estado
           </button>
           <form action="/api/auth/signout" method="post" className="w-full">
              <button className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 p-3.5 rounded-xl font-bold text-center transition-colors flex items-center justify-center gap-2 shadow-sm text-sm">
                 <LogOut className="w-4 h-4" />
                 Cerrar sesión
              </button>
           </form>
        </div>

        {/* PLANES SAAS */}
        <div className="mt-8 pt-8 border-t border-slate-200 bg-slate-50 rounded-3xl p-6 sm:p-10 border shadow-sm">
           <div className="text-center mb-8">
             <h2 className="text-xl font-bold text-slate-900">Elige tu plan</h2>
             <p className="text-slate-500 text-sm mt-1">Recomendado para clubs en crecimiento</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* PLAN MENSUAL */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 hover:border-slate-300 transition-colors shadow-sm">
                 <p className="text-slate-800 font-bold text-sm mb-4">Pago Mensual</p>
                 <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-black text-slate-900">COP {tarifaBase.toLocaleString('es-CO')}</span>
                    <span className="text-slate-500 text-xs">por deportista/mes</span>
                 </div>
                 
                 <p className="text-xs text-slate-400 mb-6">Mínimo COP ${(tarifaBase * 50).toLocaleString('es-CO')}/mes</p>

                 <ul className="space-y-3 mt-6">
                    <li className="flex items-start gap-2">
                       <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                       <span className="text-xs text-slate-600">Flexibilidad total: cancela cuando quieras</span>
                    </li>
                    <li className="flex items-start gap-2">
                       <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                       <span className="text-xs text-slate-600">Paga solo lo que necesitas ahora</span>
                    </li>
                    <li className="flex items-start gap-2">
                       <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                       <span className="text-xs text-slate-600">Pásate a anual en cualquier momento</span>
                    </li>
                 </ul>
              </div>

              {/* PLAN ANUAL */}
              <div className="bg-white border-2 border-emerald-500 rounded-2xl p-6 sm:p-8 relative shadow-md">
                 <div className="absolute -top-3 right-6 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-wide">
                   MÁS POPULAR
                 </div>
                 <div className="absolute -top-3 right-36 bg-red-500 text-white px-2 py-1 rounded text-[10px] font-bold">
                   AHORRA 50%
                 </div>
                 
                 <div className="flex justify-between items-start mb-4">
                   <p className="text-slate-800 font-bold text-sm">Pago Anual</p>
                   <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                 </div>

                 <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-black text-emerald-600">COP {(tarifaBase * 0.5).toLocaleString('es-CO')}</span>
                    <span className="text-slate-500 text-xs">por deportista/mes</span>
                 </div>
                 
                 <p className="text-xs text-slate-400 mb-6">Mínimo COP ${(tarifaBase * 0.5 * 50 * 12).toLocaleString('es-CO')}/año</p>

                 <ul className="space-y-3 mt-6">
                    <li className="flex items-start gap-2">
                       <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                       <span className="text-xs text-slate-600">Congela tu precio: no importa cuántos deportistas crezcas</span>
                    </li>
                    <li className="flex items-start gap-2">
                       <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                       <span className="text-xs text-slate-600">Ahorro garantizado del 50%</span>
                    </li>
                    <li className="flex items-start gap-2">
                       <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                       <span className="text-xs text-slate-600">Renueva solo una vez al año</span>
                    </li>
                 </ul>
              </div>
           </div>
           
           <div className="mt-6 bg-slate-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200">
              <div>
                <p className="text-xs text-slate-500 font-medium">Pago Anual</p>
                <p className="text-lg font-bold text-slate-900">Estimado anual: COP {(tarifaBase * 0.5 * 12 * 20).toLocaleString('es-CO')}</p>
                <p className="text-[10px] text-slate-400">20 deportistas activos</p>
              </div>
              <a 
                href={`https://wa.me/${cleanNumber}?text=Me%20interesa%20el%20plan%20ANUAL%20para%20el%20club%20${encodeURIComponent(club?.nombre || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#16A34A] hover:bg-[#15803d] text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors"
              >
                Pagar ahora
              </a>
           </div>
           
           <p className="text-center text-[10px] text-slate-400 mt-4">Para gestionar tu suscripción, contacta con el equipo de Gibbor App.</p>
        </div>

        {/* FOOTER WIDGETS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center shadow-sm">
             <p className="text-sm text-slate-600">
               Para reactivar tu club, puedes pagar directamente con tarjeta o comunicarte con nuestro equipo de soporte por WhatsApp.
             </p>
           </div>
           <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl p-6 flex flex-col items-center justify-center shadow-sm">
             <p className="text-xs text-[#16A34A] font-bold flex items-center gap-1 mb-1">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/></svg>
               Soporte por WhatsApp
             </p>
             <p className="text-2xl font-black text-[#16A34A]">{wppNumber}</p>
           </div>
        </div>

      </div>
    </div>
  );
}
